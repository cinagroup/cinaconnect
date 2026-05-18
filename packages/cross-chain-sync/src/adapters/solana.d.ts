/**
 * Solana State Sync Adapter
 *
 * Syncs state for Solana accounts.
 */
import type { ChainAccount, SessionState, StateStorage } from "./types.js";
/** Solana-specific account info */
export interface SolanaAccount extends ChainAccount {
    chain: "solana";
    /** Associated token accounts */
    tokenAccounts?: string[];
}
/**
 * Sync Solana chain state.
 */
export declare function syncSolanaState(account: SolanaAccount, storage: StateStorage): Promise<boolean>;
/**
 * Fetch Solana session from storage.
 */
export declare function getSolanaSession(address: string, storage: StateStorage): Promise<SessionState | null>;
//# sourceMappingURL=solana.d.ts.map