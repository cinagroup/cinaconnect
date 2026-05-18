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
import {
  type Address,
  type Hex,
  bytesToHex,
} from "viem";
import {
  generatePrivateKey,
  privateKeyToAccount,
} from "viem/accounts";

// ============================================================
// SessionKeyManager
// ============================================================

export class SessionKeyManager {
  private keys: Map<Address, SessionKey> = new Map();
  private policies: Map<string, SessionKeyPolicy> = new Map();

  /**
   * Generate a new session key.
   *
   * @param policy Optional policy to associate with this key
   * @param label Human-readable label
   * @returns The generated session key
   */
  generateKey(policy?: SessionKeyPolicy, label?: string): SessionKey {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const now = Math.floor(Date.now() / 1000);

    const sessionKey: SessionKey = {
      publicKey: account.address,
      privateKey,
      expiresAt: policy?.expiresAt ?? now + 86_400, // Default: 24 hours
      createdAt: now,
      policyId: policy?.id,
      label,
    };

    this.keys.set(account.address, sessionKey);

    if (policy) {
      this.policies.set(policy.id, policy);
    }

    return sessionKey;
  }

  /**
   * Import an existing session key from private key.
   *
   * @param privateKey The private key in hex format
   * @param policy Optional policy to associate
   * @param label Human-readable label
   * @returns The imported session key
   */
  importKey(privateKey: Hex, policy?: SessionKeyPolicy, label?: string): SessionKey {
    const account = privateKeyToAccount(privateKey);
    const now = Math.floor(Date.now() / 1000);

    const sessionKey: SessionKey = {
      publicKey: account.address,
      privateKey,
      expiresAt: policy?.expiresAt ?? now + 86_400,
      createdAt: now,
      policyId: policy?.id,
      label,
    };

    this.keys.set(account.address, sessionKey);

    if (policy) {
      this.policies.set(policy.id, policy);
    }

    return sessionKey;
  }

  /**
   * Get a session key by its public key.
   *
   * @param publicKey The session key's public address
   * @returns The session key or null if not found
   */
  getKey(publicKey: Address): SessionKey | null {
    return this.keys.get(publicKey) ?? null;
  }

  /**
   * Get all active (non-expired) session keys.
   *
   * @returns Array of active session keys
   */
  getActiveKeys(): SessionKey[] {
    const now = Math.floor(Date.now() / 1000);
    return Array.from(this.keys.values()).filter((key) => key.expiresAt > now);
  }

  /**
   * Get all stored session keys (including expired).
   */
  getAllKeys(): SessionKey[] {
    return Array.from(this.keys.values());
  }

  /**
   * Revoke (delete) a session key.
   *
   * @param publicKey The public key to revoke
   * @returns Whether the key was found and revoked
   */
  revokeKey(publicKey: Address): boolean {
    return this.keys.delete(publicKey);
  }

  /**
   * Revoke all expired session keys.
   *
   * @returns Number of keys revoked
   */
  revokeExpiredKeys(): number {
    const now = Math.floor(Date.now() / 1000);
    let count = 0;

    for (const [address, key] of this.keys) {
      if (key.expiresAt <= now) {
        this.keys.delete(address);
        count++;
      }
    }

    return count;
  }

  /**
   * Sign a message with a session key.
   *
   * @param publicKey The session key's public address
   * @param message The message to sign
   * @returns The signature
   */
  async signWithKey(publicKey: Address, message: string): Promise<Hex> {
    const key = this.keys.get(publicKey);
    if (!key) {
      throw new Error(`Session key not found: ${publicKey}`);
    }

    if (key.expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new Error(`Session key expired: ${publicKey}`);
    }

    const account = privateKeyToAccount(key.privateKey);
    return account.signMessage({ message });
  }

  /**
   * Get the policy associated with a session key.
   *
   * @param publicKey The session key's public address
   * @returns The associated policy or null
   */
  getPolicy(publicKey: Address): SessionKeyPolicy | null {
    const key = this.keys.get(publicKey);
    if (!key?.policyId) return null;
    return this.policies.get(key.policyId) ?? null;
  }

  /**
   * Register a policy without a key.
   */
  registerPolicy(policy: SessionKeyPolicy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Get all registered policies.
   */
  getAllPolicies(): SessionKeyPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get the number of stored keys.
   */
  get keyCount(): number {
    return this.keys.size;
  }

  /**
   * Get the number of stored policies.
   */
  get policyCount(): number {
    return this.policies.size;
  }
}

// ============================================================
// Utility Functions
// ============================================================

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
export function encodeEnableSessionKey(
  sessionKey: SessionKey,
  policy: SessionKeyPolicy,
): Hex {
  // Simplified encoding — in production use abi.encodeFunctionData from viem
  // function enableSessionKey(
  //   address key,
  //   uint48 expiresAt,
  //   address[] calldata targets,
  //   bytes4[] calldata methods,
  //   uint256 maxAmountPerTx,
  //   uint256 dailyLimit
  // )
  return bytesToHex(
    new Uint8Array([
      // Placeholder — would be actual ABI-encoded data
      ...Buffer.from(sessionKey.publicKey.slice(2), "hex"),
    ]),
  );
}

/**
 * Generate the disableSessionKey calldata.
 *
 * @param sessionKey The session key to disable
 * @returns Encoded calldata
 */
export function encodeDisableSessionKey(sessionKey: SessionKey): Hex {
  // function disableSessionKey(address key)
  return bytesToHex(
    new Uint8Array([
      ...Buffer.from(sessionKey.publicKey.slice(2), "hex"),
    ]),
  );
}

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
export function isKeyValidForOperation(
  key: SessionKey,
  policy: SessionKeyPolicy,
  target: Address,
  method: Hex,
  amount: bigint,
): boolean {
  // Check expiration
  if (key.expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  // Check target whitelist
  if (policy.allowedTargets.length > 0 && !policy.allowedTargets.includes(target)) {
    return false;
  }

  // Check method whitelist
  if (policy.allowedMethods.length > 0 && !policy.allowedMethods.includes(method)) {
    return false;
  }

  // Check per-transaction limit
  if (amount > policy.maxAmountPerTx) {
    return false;
  }

  return true;
}
