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
import type { SessionKey, SessionKeyPolicy } from "./types.js";
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
export declare class CrossChainSessionKeySync {
    private endpoints;
    private primaryChainId;
    private syncHistory;
    /**
     * Register a chain endpoint for syncing.
     *
     * @param endpoint Chain configuration
     */
    registerEndpoint(endpoint: ChainEndpoint): void;
    /**
     * Remove a chain endpoint.
     *
     * @param chainId Chain identifier
     */
    removeEndpoint(chainId: string | number): void;
    /**
     * Get all registered endpoints.
     */
    getEndpoints(): ChainEndpoint[];
    /**
     * Get the primary chain endpoint.
     */
    getPrimaryEndpoint(): ChainEndpoint | null;
    /**
     * Sync a session key to all registered chains.
     *
     * @param sessionKey The session key to sync
     * @param policy The associated policy
     * @returns Array of sync results (one per chain)
     */
    syncSessionKey(sessionKey: SessionKey, policy: SessionKeyPolicy): Promise<SyncResult[]>;
    /**
     * Revoke (disable) a session key across all chains.
     *
     * @param sessionKey The session key to revoke
     * @returns Array of sync results
     */
    revokeSessionKey(sessionKey: SessionKey): Promise<SyncResult[]>;
    /**
     * Get sync history for a specific message.
     *
     * @param messageId The sync message ID
     */
    getSyncHistory(messageId: string): SyncResult[];
    /**
     * Get the overall sync status across all chains.
     *
     * @param messageId The sync message ID
     * @returns Whether sync completed on all chains
     */
    getSyncStatus(messageId: string): {
        total: number;
        successful: number;
        failed: number;
        pending: number;
    };
    /**
     * Create a cross-chain sync message.
     */
    private createSyncMessage;
    /**
     * Serialize a policy for cross-chain transport.
     */
    private serializePolicy;
    /**
     * Execute sync to a specific chain endpoint.
     * In production, this would use the appropriate adapter (EVM, Solana, Bitcoin).
     */
    private executeSync;
    /**
     * Sync to an EVM chain via a registry contract.
     */
    private syncToEVM;
    /**
     * Sync to Solana via a program instruction.
     */
    private syncToSolana;
    /**
     * Sync to Bitcoin via inscription.
     */
    private syncToBitcoin;
}
/**
 * Verify a cross-chain sync message.
 *
 * @param message The sync message to verify
 * @param sourceChainId The expected source chain ID
 * @returns Whether the message is valid
 */
export declare function verifySyncMessage(message: SyncMessage, sourceChainId: string | number): boolean;
//# sourceMappingURL=cross-chain-sync.d.ts.map