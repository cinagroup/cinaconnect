/**
 * Session Key Policy Management
 *
 * Provides utilities for creating, validating, and managing
 * session key policies that define what actions a session key
 * is authorized to perform.
 */

import type { SessionKeyPolicy } from "./types.js";
import type { Address, Hex } from "viem";
import { createPublicClient, http, parseAbiItem } from "viem";

// ============================================================
// SessionKeyPolicyManager
// ============================================================

export class SessionKeyPolicyManager {
  private policies: Map<string, SessionKeyPolicy> = new Map();

  /**
   * Create a new session key policy.
   *
   * @param params Policy parameters
   * @returns The created policy
   */
  createPolicy(params: PolicyParams): SessionKeyPolicy {
    const id = generatePolicyId();

    const policy: SessionKeyPolicy = {
      id,
      expiresAt: params.expiresAt,
      allowedTargets: params.allowedTargets ?? [],
      allowedMethods: params.allowedMethods ?? [],
      maxAmountPerTx: params.maxAmountPerTx ?? 0n,
      dailyLimit: params.dailyLimit ?? 0n,
      allowedChains: params.allowedChains ?? [],
      allowNativeTransfers: params.allowNativeTransfers ?? false,
      allowErc20Transfers: params.allowErc20Transfers ?? false,
      allowedTokens: params.allowedTokens ?? [],
      metadata: params.metadata,
    };

    this.policies.set(id, policy);
    return policy;
  }

  /**
   * Get a policy by ID.
   */
  getPolicy(id: string): SessionKeyPolicy | null {
    return this.policies.get(id) ?? null;
  }

  /**
   * Get all stored policies.
   */
  getAllPolicies(): SessionKeyPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Remove a policy by ID.
   */
  removePolicy(id: string): boolean {
    return this.policies.delete(id);
  }

  /**
   * Validate a policy for consistency.
   *
   * @param policy The policy to validate
   * @returns Array of validation errors (empty = valid)
   */
  validatePolicy(policy: SessionKeyPolicy): string[] {
    const errors: string[] = [];

    if (policy.expiresAt <= Math.floor(Date.now() / 1000)) {
      errors.push("Policy has already expired");
    }

    if (policy.maxAmountPerTx < 0n) {
      errors.push("maxAmountPerTx cannot be negative");
    }

    if (policy.dailyLimit < 0n) {
      errors.push("dailyLimit cannot be negative");
    }

    if (policy.dailyLimit > 0n && policy.maxAmountPerTx > policy.dailyLimit) {
      errors.push("maxAmountPerTx exceeds dailyLimit");
    }

    // Note: guardian threshold is validated in social-recovery.ts

    return errors;
  }

  /**
   * Create a preset policy for DEX interactions.
   *
   * @param dexRouter The DEX router address
   * @param maxAmountPerTx Maximum amount per swap
   * @param dailyLimit Daily spending limit
   * @param expiresAt Policy expiration timestamp
   * @param chainId Target chain ID
   * @returns A pre-configured DEX policy
   */
  static createDexPolicy(
    dexRouter: Address,
    maxAmountPerTx: bigint,
    dailyLimit: bigint,
    expiresAt: number,
    chainId: number,
  ): PolicyParams {
    return {
      expiresAt,
      allowedTargets: [dexRouter],
      allowedMethods: [
        "0x414bf389", // exactInputSingle (Uniswap V3)
        "0x472b43f3", // exactInput (Uniswap V3)
        "0x7ff36ab5", // swapExactETHForTokens
        "0x18cbafe5", // swapExactTokensForETH
      ],
      maxAmountPerTx,
      dailyLimit,
      allowedChains: [chainId],
      allowNativeTransfers: true,
      allowErc20Transfers: true,
      metadata: { type: "dex", router: dexRouter },
    };
  }

  /**
   * Create a preset policy for NFT minting.
   *
   * @param nftContract The NFT contract address
   * @param maxMintPrice Maximum price per mint
   * @param maxMintsPerDay Maximum mints per day
   * @param expiresAt Policy expiration timestamp
   * @param chainId Target chain ID
   * @returns A pre-configured NFT mint policy
   */
  static createNftMintPolicy(
    nftContract: Address,
    maxMintPrice: bigint,
    maxMintsPerDay: number,
    expiresAt: number,
    chainId: number,
  ): PolicyParams {
    return {
      expiresAt,
      allowedTargets: [nftContract],
      allowedMethods: [
        "0x40c10f19", // mint
        "0xa0712d68", // mintWithSignature
        "0x15883168", // safeMint
      ],
      maxAmountPerTx: maxMintPrice,
      dailyLimit: maxMintPrice * BigInt(maxMintsPerDay),
      allowedChains: [chainId],
      allowNativeTransfers: true,
      metadata: { type: "nft-mint", contract: nftContract },
    };
  }

  /**
   * Create a fully open (dangerous) policy.
   * Only use for testing or trusted environments.
   *
   * @param expiresAt Policy expiration timestamp
   * @param dailyLimit Daily spending limit
   * @param chainId Target chain ID
   * @returns A fully open policy
   */
  static createOpenPolicy(
    expiresAt: number,
    dailyLimit: bigint,
    chainId: number,
  ): PolicyParams {
    return {
      expiresAt,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: dailyLimit,
      dailyLimit,
      allowedChains: [chainId],
      allowNativeTransfers: true,
      allowErc20Transfers: true,
      allowedTokens: [],
      metadata: { type: "open" },
    };
  }
}

// ============================================================
// Types
// ============================================================

export interface PolicyParams {
  /** When the policy expires (Unix timestamp) */
  expiresAt: number;
  /** Allowed target contract addresses (empty = all) */
  allowedTargets?: Address[];
  /** Allowed function selectors (empty = all) */
  allowedMethods?: Hex[];
  /** Maximum amount per single transaction (in wei) */
  maxAmountPerTx?: bigint;
  /** Maximum total daily spending (in wei) */
  dailyLimit?: bigint;
  /** Allowed chain IDs (empty = all) */
  allowedChains?: number[];
  /** Whether native token transfers are allowed */
  allowNativeTransfers?: boolean;
  /** Whether ERC-20 transfers are allowed */
  allowErc20Transfers?: boolean;
  /** Specific ERC-20 tokens allowed (empty = all) */
  allowedTokens?: Address[];
  /** Metadata */
  metadata?: Record<string, string>;
}

// ============================================================
// Helpers
// ============================================================

function generatePolicyId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `policy-${timestamp}-${random}`;
}
