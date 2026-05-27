/**
 * Dynamic module loader for CDN bundle.
 *
 * Handles lazy loading of Cinacoin modules and tracks load state.
 */
/**
 * Registry of loaded modules.
 */
const loadedModules = new Map();
/**
 * Load a module dynamically by name.
 * Returns cached result if already loaded.
 */
export async function loadModule(name, loader) {
    // Return cached module if already loaded
    if (loadedModules.has(name)) {
        return {
            state: "loaded",
            module: loadedModules.get(name),
            error: null,
        };
    }
    try {
        const mod = await loader();
        loadedModules.set(name, mod);
        return {
            state: "loaded",
            module: mod,
            error: null,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            state: "error",
            module: null,
            error: `Failed to load module "${name}": ${message}`,
        };
    }
}
/**
 * Check if a module is already loaded.
 */
export function isLoaded(name) {
    return loadedModules.has(name);
}
/**
 * Get a previously loaded module.
 */
export function getModule(name) {
    return loadedModules.get(name) ?? null;
}
/**
 * Clear the module cache.
 */
export function clearCache() {
    loadedModules.clear();
}
/**
 * Preload multiple modules in parallel.
 */
export async function preloadModules(loaders) {
    const entries = Object.entries(loaders);
    const results = await Promise.all(entries.map(([name, loader]) => loadModule(name, loader).then((r) => [name, r])));
    return Object.fromEntries(results);
}
//# sourceMappingURL=loader.js.map