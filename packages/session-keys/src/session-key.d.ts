/**
 * Session Key Generation and Management
 *
 * Provides utilities for generating, managing, and validating
 * session keys for ERC-4337 smart accounts.
 *
 * Session keys are temporary signing keys with scoped permissions,
 * enabling gasless interactions and delegated actions without
 * exposing the main account key.
 */
import type { SessionKey, SessionKeyPolicy } from "./types.js";
import { type Address, type Hex } from "viem";
export declare class SessionKeyManager {
    private keys;
    private policies;
    /**
     * Generate a new session key.
     *
     * @param policy Optional policy to associate with this key
     * @param label Human-readable label
     * @returns The generated session key
     */
    generateKey(policy?: SessionKeyPolicy, label?: string): SessionKey;
    /**
     * Import an existing session key from private key.
     *
     * @param privateKey The private key in hex format
     * @param policy Optional policy to associate
     * @param label Human-readable label
     * @returns The imported session key
     */
    importKey(privateKey: Hex, policy?: SessionKeyPolicy, label?: string): SessionKey;
    /**
     * Get a session key by its public key.
     *
     * @param publicKey The session key's public address
     * @returns The session key or null if not found
     */
    getKey(publicKey: Address): SessionKey | null;
    /**
     * Get all active (non-expired) session keys.
     *
     * @returns Array of active session keys
     */
    getActiveKeys(): SessionKey[];
    /**
     * Get all stored session keys (including expired).
     */
    getAllKeys(): SessionKey[];
    /**
     * Revoke (delete) a session key.
     *
     * @param publicKey The public key to revoke
     * @returns Whether the key was found and revoked
     */
    revokeKey(publicKey: Address): boolean;
    /**
     * Revoke all expired session keys.
     *
     * @returns Number of keys revoked
     */
    revokeExpiredKeys(): number;
    /**
     * Sign a message with a session key.
     *
     * @param publicKey The session key's public address
     * @param message The message to sign
     * @returns The signature
     */
    signWithKey(publicKey: Address, message: string): Promise<Hex>;
    /**
     * Get the policy associated with a session key.
     *
     * @param publicKey The session key's public address
     * @returns The associated policy or null
     */
    getPolicy(publicKey: Address): SessionKeyPolicy | null;
    /**
     * Register a policy without a key.
     */
    registerPolicy(policy: SessionKeyPolicy): void;
    /**
     * Get all registered policies.
     */
    getAllPolicies(): SessionKeyPolicy[];
    /**
     * Get the number of stored keys.
     */
    get keyCount(): number;
    /**
     * Get the number of stored policies.
     */
    get policyCount(): number;
}
/**
 * Generate the enableSessionKey calldata for a smart account.
 *
 * This encodes the transaction needed to register a session key
 * on the smart account contract.
 *
 * @param sessionKey The session key to enable
 * @param policy The associated policy
 * @returns Encoded calldata
 */
export declare function encodeEnableSessionKey(sessionKey: SessionKey, policy: SessionKeyPolicy): Hex;
/**
 * Generate the disableSessionKey calldata.
 *
 * @param sessionKey The session key to disable
 * @returns Encoded calldata
 */
export declare function encodeDisableSessionKey(sessionKey: SessionKey): Hex;
/**
 * Check if a session key is valid for a given operation.
 *
 * @param key The session key
 * @param policy The associated policy
 * @param target The target contract address
 * @param method The function selector
 * @param amount The transaction value
 * @returns Whether the operation is permitted
 */
export declare function isKeyValidForOperation(key: SessionKey, policy: SessionKeyPolicy, target: Address, method: Hex, amount: bigint): boolean;
//# sourceMappingURL=session-key.d.ts.map