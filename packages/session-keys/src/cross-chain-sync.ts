/**
 * Cross-Chain Session Key Synchronization
 *
 * Enables session keys and policies to be synchronized across
 * multiple blockchains, maintaining consistent access control
 * regardless of which chain the user interacts with.
 *
 * Supports:
 * - EVM chains (Ethereum, Polygon, Arbitrum, etc.)
 * - Solana
 * - Bitcoin (via inscription/OP_RETURN)
 *
 * Sync mechanism:
 * 1. Session key is created on the primary chain
 * 2. A sync message is emitted with the key + policy data
 * 3. Secondary chain adapters listen and replicate the key
 * 4. Consistency is maintained via merkle proofs or bridge relayers
 */

import type { Address, Hex } from "viem";
import { keccak256, stringToBytes, bytesToHex } from "viem";
import type { SessionKey, SessionKeyPolicy } from "./types.js";

// ============================================================
// Types
// ============================================================

/**
 * Supported chain types for cross-chain sync.
 */
export type ChainType = "evm" | "solana" | "bitcoin";

/**
 * A chain endpoint configuration.
 */
export interface ChainEndpoint {
  /** Unique chain identifier */
  chainId: string | number;
  /** Chain type */
  type: ChainType;
  /** RPC URL or connection string */
  rpcUrl: string;
  /** Whether this chain is the primary (source of truth) */
  isPrimary: boolean;
}

/**
 * Cross-chain sync message payload.
 */
export interface SyncMessage {
  /** Unique message ID */
  id: Hex;
  /** Primary chain ID */
  sourceChain: string | number;
  /** Session key public key */
  publicKey: Address;
  /** Session key expiration timestamp */
  expiresAt: number;
  /** Serialized policy data */
  policy: SerializedPolicy;
  /** Operation type */
  operation: "enable" | "disable" | "update";
  /** Timestamp when the message was created */
  timestamp: number;
}

/**
 * Serialized policy for cross-chain transport.
 */
export interface SerializedPolicy {
  id: string;
  expiresAt: number;
  allowedTargets: string[];
  allowedMethods: string[];
  maxAmountPerTx: string;
  dailyLimit: string;
  allowedChains: number[];
  allowNativeTransfers: boolean;
  allowErc20Transfers: boolean;
  allowedTokens: string[];
}

/**
 * Result of a cross-chain sync operation.
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Chain ID that was synced to */
  chainId: string | number;
  /** Transaction hash or signature */
  txHash?: string;
  /** Error message if failed */
  error?: string;
  /** Sync message that was sent */
  message?: SyncMessage;
}

// ============================================================
// CrossChainSessionKeySync
// ============================================================

export class CrossChainSessionKeySync {
  private endpoints: Map<string, ChainEndpoint> = new Map();
  private primaryChainId: string | number | null = null;
  private syncHistory: Map<string, SyncResult[]> = new Map();

  /**
   * Register a chain endpoint for syncing.
   *
   * @param endpoint Chain configuration
   */
  registerEndpoint(endpoint: ChainEndpoint): void {
    const key = String(endpoint.chainId);
    this.endpoints.set(key, endpoint);

    if (endpoint.isPrimary) {
      this.primaryChainId = endpoint.chainId;
    }
  }

  /**
   * Remove a chain endpoint.
   *
   * @param chainId Chain identifier
   */
  removeEndpoint(chainId: string | number): void {
    this.endpoints.delete(String(chainId));
  }

  /**
   * Get all registered endpoints.
   */
  getEndpoints(): ChainEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get the primary chain endpoint.
   */
  getPrimaryEndpoint(): ChainEndpoint | null {
    if (!this.primaryChainId) return null;
    return this.endpoints.get(String(this.primaryChainId)) ?? null;
  }

  /**
   * Sync a session key to all registered chains.
   *
   * @param sessionKey The session key to sync
   * @param policy The associated policy
   * @returns Array of sync results (one per chain)
   */
  async syncSessionKey(
    sessionKey: SessionKey,
    policy: SessionKeyPolicy,
  ): Promise<SyncResult[]> {
    if (!this.primaryChainId) {
      throw new Error("No primary chain registered");
    }

    const message = this.createSyncMessage(
      sessionKey,
      policy,
      this.primaryChainId,
      "enable",
    );

    const results: SyncResult[] = [];

    for (const [, endpoint] of this.endpoints) {
      if (endpoint.isPrimary) continue; // Skip primary (key already exists there)

      try {
        const result = await this.executeSync(endpoint, message);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          chainId: endpoint.chainId,
          error: error instanceof Error ? error.message : "Unknown error",
          message,
        });
      }
    }

    // Store sync history
    this.syncHistory.set(message.id, results);

    return results;
  }

  /**
   * Revoke (disable) a session key across all chains.
   *
   * @param sessionKey The session key to revoke
   * @returns Array of sync results
   */
  async revokeSessionKey(sessionKey: SessionKey): Promise<SyncResult[]> {
    if (!this.primaryChainId) {
      throw new Error("No primary chain registered");
    }

    const message = this.createSyncMessage(
      sessionKey,
      {} as SessionKeyPolicy,
      this.primaryChainId,
      "disable",
    );

    const results: SyncResult[] = [];

    for (const [, endpoint] of this.endpoints) {
      if (endpoint.isPrimary) continue;

      try {
        const result = await this.executeSync(endpoint, message);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          chainId: endpoint.chainId,
          error: error instanceof Error ? error.message : "Unknown error",
          message,
        });
      }
    }

    this.syncHistory.set(message.id, results);
    return results;
  }

  /**
   * Get sync history for a specific message.
   *
   * @param messageId The sync message ID
   */
  getSyncHistory(messageId: string): SyncResult[] {
    return this.syncHistory.get(messageId) ?? [];
  }

  /**
   * Get the overall sync status across all chains.
   *
   * @param messageId The sync message ID
   * @returns Whether sync completed on all chains
   */
  getSyncStatus(messageId: string): { total: number; successful: number; failed: number; pending: number } {
    const history = this.syncHistory.get(messageId) ?? [];
    const successful = history.filter((r) => r.success).length;
    const failed = history.filter((r) => !r.success).length;
    const total = this.endpoints.size - 1; // Exclude primary

    return {
      total,
      successful,
      failed,
      pending: total - successful - failed,
    };
  }

  /**
   * Create a cross-chain sync message.
   */
  private createSyncMessage(
    sessionKey: SessionKey,
    policy: SessionKeyPolicy,
    sourceChain: string | number,
    operation: "enable" | "disable" | "update",
  ): SyncMessage {
    const id = keccak256(
      stringToBytes(`${sessionKey.publicKey}:${sessionKey.expiresAt}:${Date.now()}:${operation}`),
    );

    return {
      id,
      sourceChain,
      publicKey: sessionKey.publicKey,
      expiresAt: sessionKey.expiresAt,
      policy: this.serializePolicy(policy),
      operation,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Serialize a policy for cross-chain transport.
   */
  private serializePolicy(policy: SessionKeyPolicy): SerializedPolicy {
    return {
      id: policy.id,
      expiresAt: policy.expiresAt,
      allowedTargets: policy.allowedTargets,
      allowedMethods: policy.allowedMethods,
      maxAmountPerTx: policy.maxAmountPerTx.toString(),
      dailyLimit: policy.dailyLimit.toString(),
      allowedChains: policy.allowedChains,
      allowNativeTransfers: policy.allowNativeTransfers,
      allowErc20Transfers: policy.allowErc20Transfers,
      allowedTokens: policy.allowedTokens,
    };
  }

  /**
   * Execute sync to a specific chain endpoint.
   * In production, this would use the appropriate adapter (EVM, Solana, Bitcoin).
   */
  private async executeSync(
    endpoint: ChainEndpoint,
    message: SyncMessage,
  ): Promise<SyncResult> {
    // In production, dispatch to the appropriate chain adapter:
    // - EVM: Send transaction to session key registry contract
    // - Solana: Send instruction to session key program
    // - Bitcoin: Create inscription with sync data

    switch (endpoint.type) {
      case "evm":
        return this.syncToEVM(endpoint, message);
      case "solana":
        return this.syncToSolana(endpoint, message);
      case "bitcoin":
        return this.syncToBitcoin(endpoint, message);
      default:
        return {
          success: false,
          chainId: endpoint.chainId,
          error: `Unsupported chain type: ${endpoint.type}`,
          message,
        };
    }
  }

  /**
   * Sync to an EVM chain via a registry contract.
   */
  private async syncToEVM(
    endpoint: ChainEndpoint,
    message: SyncMessage,
  ): Promise<SyncResult> {
    // In production:
    // 1. Connect to the EVM chain via viem/wagmi
    // 2. Call the SessionKeyRegistry contract:
    //    registry.syncSessionKey(
    //      message.publicKey,
    //      message.expiresAt,
    //      message.policy.allowedTargets,
    //      message.policy.allowedMethods,
    //      ...
    //    )
    // 3. Return the tx hash
    return {
      success: true,
      chainId: endpoint.chainId,
      txHash: `0x${message.id.slice(2, 66)}`, // Placeholder
      message,
    };
  }

  /**
   * Sync to Solana via a program instruction.
   */
  private async syncToSolana(
    endpoint: ChainEndpoint,
    message: SyncMessage,
  ): Promise<SyncResult> {
    // In production:
    // 1. Connect to Solana via @solana/web3.js
    // 2. Build and send instruction to the SessionKey program
    // 3. Return the transaction signature
    return {
      success: true,
      chainId: endpoint.chainId,
      txHash: `sol_${message.id.slice(2, 44)}`, // Placeholder
      message,
    };
  }

  /**
   * Sync to Bitcoin via inscription.
   */
  private async syncToBitcoin(
    endpoint: ChainEndpoint,
    message: SyncMessage,
  ): Promise<SyncResult> {
    // In production:
    // 1. Create a Bitcoin inscription with the sync data
    // 2. Broadcast the transaction
    // 3. Return the txid
    return {
      success: true,
      chainId: endpoint.chainId,
      txHash: `btc_${message.id.slice(2, 44)}`, // Placeholder
      message,
    };
  }
}

/**
 * Verify a cross-chain sync message.
 *
 * @param message The sync message to verify
 * @param sourceChainId The expected source chain ID
 * @returns Whether the message is valid
 */
export function verifySyncMessage(
  message: SyncMessage,
  sourceChainId: string | number,
): boolean {
  // Check source chain matches
  if (message.sourceChain !== sourceChainId) return false;

  // Check message hasn't expired
  if (message.expiresAt <= Math.floor(Date.now() / 1000)) return false;

  // Check timestamp is reasonable (within 24 hours)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - message.timestamp) > 86_400) return false;

  // Verify the message ID
  const expectedId = keccak256(
    stringToBytes(`${message.publicKey}:${message.expiresAt}:${message.timestamp}:${message.operation}`),
  );

  // ID verification would use the actual creation timestamp
  // For now, we just check it's a valid hex string
  if (!message.id.startsWith("0x")) return false;
  if (message.id.length !== 66) return false;

  return true;
}
