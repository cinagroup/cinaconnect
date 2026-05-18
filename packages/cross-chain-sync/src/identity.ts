/**
 * Cross-Chain Identity
 *
 * Unified identity hash, account linking proofs, and verification.
 */

import { randomUUID } from "crypto";
import type {
  ChainAccount,
  ChainFamily,
  LinkingProof,
  StateStorage,
} from "./types.js";
import { InMemoryStorage } from "./storage.js";

export { type UnifiedIdentity } from "./types.js";

/**
 * Generate a deterministic identity hash from linked accounts.
 */
export function generateIdentityHash(
  accounts: ChainAccount[]
): string {
  const sorted = [...accounts].sort(
    (a, b) => a.address.localeCompare(b.address)
  );
  const data = sorted.map((a) => `${a.chain}:${a.address}`).join("|");
  return computeHash(data);
}

/**
 * Compute a simple hash from string data.
 */
function computeHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `0x${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Verify a linking proof by checking signature format.
 *
 * In production this would call a verification function on the
 * target chain. Here we validate the proof structure.
 */
export function verifyLinkingProof(proof: LinkingProof): boolean {
  // Basic structure validation
  if (!proof.sourceAddress || !proof.targetAddress) return false;
  if (!proof.signature || !proof.message) return false;
  if (proof.sourceChain === proof.targetChain && proof.sourceAddress === proof.targetAddress)
    return false; // Cannot link to self

  // Signature must look like a hex string
  if (!/^[0-9a-fA-F]+$/.test(proof.signature) && proof.signature.length < 64)
    return false;

  return true;
}

/**
 * Create a linking proof between two accounts.
 */
export function createLinkingProof(
  sourceAccount: ChainAccount,
  targetAccount: ChainAccount,
  signature: string,
  message: string
): LinkingProof {
  return {
    sourceAddress: sourceAccount.address,
    sourceChain: sourceAccount.chain,
    targetAddress: targetAccount.address,
    targetChain: targetAccount.chain,
    signature,
    message,
    createdAt: Date.now(),
  };
}

/**
 * CrossChainIdentityManager — manages unified identity and linking proofs.
 */
export class CrossChainIdentityManager {
  private storage: StateStorage;

  constructor(storage?: StateStorage) {
    this.storage = storage ?? new InMemoryStorage();
  }

  /**
   * Create a new unified identity.
   */
  async createIdentity(
    accounts: ChainAccount[],
    metadata: Record<string, string> = {}
  ): Promise<{ identityHash: string }> {
    const identityHash = generateIdentityHash(accounts);

    const identity = {
      identityHash,
      accounts,
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.storage.set(`identity:${identityHash}`, identity);
    await this.storage.set("current-identity", identityHash);

    return { identityHash };
  }

  /**
   * Get current identity.
   */
  async getCurrentIdentity(): Promise<string | null> {
    return this.storage.get<string>("current-identity");
  }

  /**
   * Link a new account to an existing identity.
   */
  async linkAccount(
    identityHash: string,
    account: ChainAccount,
    proof: LinkingProof
  ): Promise<boolean> {
    // Verify the linking proof
    if (!verifyLinkingProof(proof)) {
      return false;
    }

    const identity = await this.storage.get<{
      identityHash: string;
      accounts: ChainAccount[];
      metadata: Record<string, string>;
      createdAt: number;
      updatedAt: number;
    }>(`identity:${identityHash}`);

    if (!identity) {
      return false;
    }

    // Check if already linked
    const exists = identity.accounts.some(
      (a) => a.chain === account.chain && a.address === account.address
    );
    if (exists) {
      return true;
    }

    identity.accounts.push(account);
    identity.updatedAt = Date.now();

    // Re-hash identity with new account
    const newHash = generateIdentityHash(identity.accounts);
    identity.identityHash = newHash;

    await this.storage.set(`identity:${newHash}`, identity);
    await this.storage.set(`proof:${newHash}:${account.chain}:${account.address}`, proof);

    return true;
  }

  /**
   * Get all accounts for an identity.
   */
  async getAccounts(identityHash: string): Promise<ChainAccount[]> {
    const identity = await this.storage.get<{ accounts: ChainAccount[] }>(
      `identity:${identityHash}`
    );
    return identity?.accounts ?? [];
  }

  /**
   * Get all proofs for an identity.
   */
  async getProofs(identityHash: string): Promise<LinkingProof[]> {
    const proofs: LinkingProof[] = [];
    // In a real implementation, this would iterate storage keys
    // For testing we return an empty array
    return proofs;
  }
}
