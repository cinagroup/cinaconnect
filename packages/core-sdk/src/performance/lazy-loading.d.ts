/**
 * Lazy Loading Utilities for @cinacoin/core-sdk
 *
 * Provides lazy adapter loading and on-demand module initialization
 * to reduce initial bundle size and improve startup performance.
 */
/** Type for a module loader function. */
export type ModuleLoader<T> = () => Promise<T>;
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
export declare function createLazyLoader<T>(loader: ModuleLoader<T>): {
    load: () => Promise<T>;
    isLoaded: () => boolean;
    reset: () => void;
};
/** Registration for a lazy-loaded adapter. */
export interface AdapterRegistration<T> {
    name: string;
    loader: ModuleLoader<T>;
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
export declare class AdapterRegistry<T = unknown> {
    private _registry;
    /**
     * Register an adapter with a name and loader.
     */
    register(name: string, loader: ModuleLoader<T>): void;
    /**
     * Get or load an adapter by name.
     */
    get(name: string): Promise<T>;
    /**
     * Check if an adapter is registered.
     */
    has(name: string): boolean;
    /**
     * Check if an adapter has been loaded.
     */
    isLoaded(name: string): boolean;
    /**
     * List all registered adapter names.
     */
    list(): string[];
    /**
     * Preload all registered adapters.
     */
    preloadAll(): Promise<T[]>;
    /**
     * Reset a specific adapter (allows re-loading).
     */
    reset(name: string): void;
    /**
     * Reset all adapters.
     */
    resetAll(): void;
}
/**
 * Conditionally load a module only when a predicate is met.
 *
 * @param predicate - Function that determines if the module should be loaded.
 * @param loader - Module loader function.
 * @returns The loaded module or null if predicate is false.
 */
export declare function conditionalLoad<T>(predicate: () => boolean, loader: ModuleLoader<T>): Promise<T | null>;
/**
 * Load a module with a timeout.
 *
 * @param loader - Module loader function.
 * @param timeoutMs - Maximum time to wait for loading (ms).
 * @returns The loaded module.
 * @throws Error if loading times out.
 */
export declare function loadWithTimeout<T>(loader: ModuleLoader<T>, timeoutMs?: number): Promise<T>;
//# sourceMappingURL=lazy-loading.d.ts.map