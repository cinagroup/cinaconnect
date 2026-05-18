/**
 * Cross-Chain State Sync
 *
 * Syncs session state and identity across EVM, Solana, BTC, TON, TRON, and Polkadot.
 */
import type { ChainFamily, CrossChainState, SyncResult, StateStorage, SessionState } from "./types.js";
import type { UnifiedIdentity } from "./identity.js";
/**
 * StateSync — cross-chain state synchronization engine.
 */
export declare class StateSync {
    private storage;
    private state;
    private adapters;
    constructor(storage?: StateStorage);
    /**
     * Register a chain adapter.
     */
    registerAdapter(chain: ChainFamily, syncFn: () => Promise<boolean>): void;
    /**
     * Initialize sync state.
     */
    initialize(identity: UnifiedIdentity): Promise<void>;
    /**
     * Sync all registered chains.
     */
    syncAll(): Promise<SyncResult>;
    /**
     * Sync a single chain.
     */
    syncChain(chain: ChainFamily): Promise<boolean>;
    /**
     * Update session state for a chain.
     */
    updateSession(session: SessionState): Promise<void>;
    /**
     * Get session state for a chain.
     */
    getSession(chain: ChainFamily, chainId?: number, address?: string): Promise<SessionState | null>;
    /**
     * Set a preference.
     */
    setPreference(key: string, value: string): Promise<void>;
    /**
     * Get a preference.
     */
    getPreference(key: string): string | undefined;
    /**
     * Get current state.
     */
    getState(): CrossChainState | null;
    /**
     * Persist state to storage.
     */
    private save;
    /**
     * Restore state from storage.
     */
    restore(): Promise<boolean>;
}
//# sourceMappingURL=sync.d.ts.map