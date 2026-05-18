/**
 * Cross-Chain Identity
 *
 * Unified identity hash, account linking proofs, and verification.
 */
import type { ChainAccount, LinkingProof, StateStorage } from "./types.js";
export { type UnifiedIdentity } from "./types.js";
/**
 * Generate a deterministic identity hash from linked accounts.
 */
export declare function generateIdentityHash(accounts: ChainAccount[]): string;
/**
 * Verify a linking proof by checking signature format.
 *
 * In production this would call a verification function on the
 * target chain. Here we validate the proof structure.
 */
export declare function verifyLinkingProof(proof: LinkingProof): boolean;
/**
 * Create a linking proof between two accounts.
 */
export declare function createLinkingProof(sourceAccount: ChainAccount, targetAccount: ChainAccount, signature: string, message: string): LinkingProof;
/**
 * CrossChainIdentityManager — manages unified identity and linking proofs.
 */
export declare class CrossChainIdentityManager {
    private storage;
    constructor(storage?: StateStorage);
    /**
     * Create a new unified identity.
     */
    createIdentity(accounts: ChainAccount[], metadata?: Record<string, string>): Promise<{
        identityHash: string;
    }>;
    /**
     * Get current identity.
     */
    getCurrentIdentity(): Promise<string | null>;
    /**
     * Link a new account to an existing identity.
     */
    linkAccount(identityHash: string, account: ChainAccount, proof: LinkingProof): Promise<boolean>;
    /**
     * Get all accounts for an identity.
     */
    getAccounts(identityHash: string): Promise<ChainAccount[]>;
    /**
     * Get all proofs for an identity.
     */
    getProofs(identityHash: string): Promise<LinkingProof[]>;
}
//# sourceMappingURL=identity.d.ts.map