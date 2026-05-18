/**
 * Session Key Policy Management
 *
 * Provides utilities for creating, validating, and managing
 * session key policies that define what actions a session key
 * is authorized to perform.
 */
import type { SessionKeyPolicy } from "./types.js";
import type { Address, Hex } from "viem";
export declare class SessionKeyPolicyManager {
    private policies;
    /**
     * Create a new session key policy.
     *
     * @param params Policy parameters
     * @returns The created policy
     */
    createPolicy(params: PolicyParams): SessionKeyPolicy;
    /**
     * Get a policy by ID.
     */
    getPolicy(id: string): SessionKeyPolicy | null;
    /**
     * Get all stored policies.
     */
    getAllPolicies(): SessionKeyPolicy[];
    /**
     * Remove a policy by ID.
     */
    removePolicy(id: string): boolean;
    /**
     * Validate a policy for consistency.
     *
     * @param policy The policy to validate
     * @returns Array of validation errors (empty = valid)
     */
    validatePolicy(policy: SessionKeyPolicy): string[];
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
    static createDexPolicy(dexRouter: Address, maxAmountPerTx: bigint, dailyLimit: bigint, expiresAt: number, chainId: number): PolicyParams;
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
    static createNftMintPolicy(nftContract: Address, maxMintPrice: bigint, maxMintsPerDay: number, expiresAt: number, chainId: number): PolicyParams;
    /**
     * Create a fully open (dangerous) policy.
     * Only use for testing or trusted environments.
     *
     * @param expiresAt Policy expiration timestamp
     * @param dailyLimit Daily spending limit
     * @param chainId Target chain ID
     * @returns A fully open policy
     */
    static createOpenPolicy(expiresAt: number, dailyLimit: bigint, chainId: number): PolicyParams;
}
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
//# sourceMappingURL=policy.d.ts.map