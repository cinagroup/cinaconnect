/**
 * Lazy Loading Utilities for @cinacoin/core-sdk
 *
 * Provides lazy adapter loading and on-demand module initialization
 * to reduce initial bundle size and improve startup performance.
 */
// ─── Lazy Module Loader ────────────────────────────────────────────
/**
 * Creates a lazy loader for a module.
 *
 * The module is loaded on first access and cached for subsequent calls.
 *
 * Usage:
 *   const loadViem = createLazyLoader(() => import('viem'));
 *
 *   // Later, on demand:
 *   const viem = await loadViem();
 */
export function createLazyLoader(loader) {
    const state = {
        loader,
        promise: null,
        module: null,
    };
    return {
        /** Load (or return cached) module instance. */
        load: async () => {
            if (state.module)
                return state.module;
            if (!state.promise) {
                state.promise = state.loader().then((mod) => {
                    state.module = mod;
                    return mod;
                });
            }
            return state.promise;
        },
        /** Check if the module has been loaded. */
        isLoaded: () => state.module !== null,
        /** Reset the loader to enable re-loading. */
        reset: () => {
            state.promise = null;
            state.module = null;
        },
    };
}
/**
 * Registry for lazy-loaded adapters.
 *
 * Adapters are loaded on demand by name and cached.
 *
 * Usage:
 *   const registry = new AdapterRegistry();
 *   registry.register('viem', () => import('./adapters/viem'));
 *   registry.register('ethers', () => import('./adapters/ethers6'));
 *
 *   const viemAdapter = await registry.get('viem');
 */
export class AdapterRegistry {
    constructor() {
        this._registry = new Map();
    }
    /**
     * Register an adapter with a name and loader.
     */
    register(name, loader) {
        this._registry.set(name, {
            loader,
            promise: null,
            module: null,
        });
    }
    /**
     * Get or load an adapter by name.
     */
    async get(name) {
        const state = this._registry.get(name);
        if (!state) {
            throw new Error(`Adapter not registered: ${name}`);
        }
        if (state.module)
            return state.module;
        if (!state.promise) {
            state.promise = state.loader().then((mod) => {
                state.module = mod;
                return mod;
            });
        }
        return state.promise;
    }
    /**
     * Check if an adapter is registered.
     */
    has(name) {
        return this._registry.has(name);
    }
    /**
     * Check if an adapter has been loaded.
     */
    isLoaded(name) {
        const state = this._registry.get(name);
        return state?.module !== null;
    }
    /**
     * List all registered adapter names.
     */
    list() {
        return Array.from(this._registry.keys());
    }
    /**
     * Preload all registered adapters.
     */
    async preloadAll() {
        const promises = this.list().map((name) => this.get(name));
        return Promise.all(promises);
    }
    /**
     * Reset a specific adapter (allows re-loading).
     */
    reset(name) {
        const state = this._registry.get(name);
        if (state) {
            state.promise = null;
            state.module = null;
        }
    }
    /**
     * Reset all adapters.
     */
    resetAll() {
        for (const state of this._registry.values()) {
            state.promise = null;
            state.module = null;
        }
    }
}
// ─── Conditional Loading ───────────────────────────────────────────
/**
 * Conditionally load a module only when a predicate is met.
 *
 * @param predicate - Function that determines if the module should be loaded.
 * @param loader - Module loader function.
 * @returns The loaded module or null if predicate is false.
 */
export async function conditionalLoad(predicate, loader) {
    if (!predicate())
        return null;
    return loader();
}
/**
 * Load a module with a timeout.
 *
 * @param loader - Module loader function.
 * @param timeoutMs - Maximum time to wait for loading (ms).
 * @returns The loaded module.
 * @throws Error if loading times out.
 */
export async function loadWithTimeout(loader, timeoutMs = 5000) {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Module loading timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([loader(), timeout]);
}
//# sourceMappingURL=lazy-loading.js.map