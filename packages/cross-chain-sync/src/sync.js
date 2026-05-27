/**
 * Cross-Chain State Sync
 *
 * Syncs session state and identity across EVM, Solana, BTC, TON, TRON, and Polkadot.
 */
import { InMemoryStorage } from "./storage.js";
/**
 * StateSync — cross-chain state synchronization engine.
 */
export class StateSync {
    constructor(storage) {
        this.state = null;
        this.storage = storage ?? new InMemoryStorage();
        this.adapters = new Map();
    }
    /**
     * Register a chain adapter.
     */
    registerAdapter(chain, syncFn) {
        this.adapters.set(chain, syncFn);
    }
    /**
     * Initialize sync state.
     */
    async initialize(identity) {
        this.state = {
            identity,
            sessions: {},
            preferences: {},
            lastSyncedAt: Date.now(),
        };
        await this.save();
    }
    /**
     * Sync all registered chains.
     */
    async syncAll() {
        const syncedChains = [];
        const failedChains = [];
        const errors = {};
        for (const [chain, syncFn] of this.adapters.entries()) {
            try {
                const success = await syncFn();
                if (success) {
                    syncedChains.push(chain);
                }
                else {
                    failedChains.push(chain);
                    errors[chain] = "Sync returned false";
                }
            }
            catch (err) {
                failedChains.push(chain);
                errors[chain] = err instanceof Error ? err.message : String(err);
            }
        }
        if (this.state) {
            this.state.lastSyncedAt = Date.now();
            await this.save();
        }
        return {
            success: failedChains.length === 0,
            syncedChains,
            failedChains,
            errors,
            syncedAt: Date.now(),
        };
    }
    /**
     * Sync a single chain.
     */
    async syncChain(chain) {
        const syncFn = this.adapters.get(chain);
        if (!syncFn) {
            throw new Error(`No adapter registered for chain: ${chain}`);
        }
        return syncFn();
    }
    /**
     * Update session state for a chain.
     */
    async updateSession(session) {
        if (!this.state) {
            throw new Error("State not initialized");
        }
        const key = `${session.chain}:${session.chainId ?? "default"}:${session.address}`;
        this.state.sessions[key] = session;
        await this.save();
    }
    /**
     * Get session state for a chain.
     */
    async getSession(chain, chainId, address) {
        if (!this.state)
            return null;
        for (const [key, session] of Object.entries(this.state.sessions)) {
            if (session.chain === chain) {
                if (chainId !== undefined && session.chainId !== chainId)
                    continue;
                if (address !== undefined && session.address !== address)
                    continue;
                return session;
            }
        }
        return null;
    }
    /**
     * Set a preference.
     */
    async setPreference(key, value) {
        if (!this.state) {
            throw new Error("State not initialized");
        }
        this.state.preferences[key] = value;
        await this.save();
    }
    /**
     * Get a preference.
     */
    getPreference(key) {
        return this.state?.preferences[key];
    }
    /**
     * Get current state.
     */
    getState() {
        return this.state;
    }
    /**
     * Persist state to storage.
     */
    async save() {
        if (!this.state)
            return;
        await this.storage.set("cross-chain-state", this.state);
    }
    /**
     * Restore state from storage.
     */
    async restore() {
        const stored = await this.storage.get("cross-chain-state");
        if (stored) {
            this.state = stored;
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=sync.js.map