/**
 * Dynamic module loader for CDN bundle.
 *
 * Handles lazy loading of Cinacoin modules and tracks load state.
 */
export type LoadState = "idle" | "loading" | "loaded" | "error";
interface LoadResult<T> {
    state: LoadState;
    module: T | null;
    error: string | null;
}
/**
 * Load a module dynamically by name.
 * Returns cached result if already loaded.
 */
export declare function loadModule<T = unknown>(name: string, loader: () => Promise<T>): Promise<LoadResult<T>>;
/**
 * Check if a module is already loaded.
 */
export declare function isLoaded(name: string): boolean;
/**
 * Get a previously loaded module.
 */
export declare function getModule<T = unknown>(name: string): T | null;
/**
 * Clear the module cache.
 */
export declare function clearCache(): void;
/**
 * Preload multiple modules in parallel.
 */
export declare function preloadModules(loaders: Record<string, () => Promise<unknown>>): Promise<Record<string, LoadResult>>;
export {};
//# sourceMappingURL=loader.d.ts.map