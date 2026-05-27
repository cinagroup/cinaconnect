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
 * Registry of loaded modules.
 */
const loadedModules = new Map<string, unknown>();

/**
 * Load a module dynamically by name.
 * Returns cached result if already loaded.
 */
export async function loadModule<T = unknown>(
  name: string,
  loader: () => Promise<T>
): Promise<LoadResult<T>> {
  // Return cached module if already loaded
  if (loadedModules.has(name)) {
    return {
      state: "loaded",
      module: loadedModules.get(name) as T,
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
  } catch (err: unknown) {
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
export function isLoaded(name: string): boolean {
  return loadedModules.has(name);
}

/**
 * Get a previously loaded module.
 */
export function getModule<T = unknown>(name: string): T | null {
  return (loadedModules.get(name) as T) ?? null;
}

/**
 * Clear the module cache.
 */
export function clearCache(): void {
  loadedModules.clear();
}

/**
 * Preload multiple modules in parallel.
 */
export async function preloadModules(
  loaders: Record<string, () => Promise<unknown>>
): Promise<Record<string, LoadResult>> {
  const entries = Object.entries(loaders);
  const results = await Promise.all(
    entries.map(([name, loader]) =>
      loadModule(name, loader).then((r) => [name, r] as const)
    )
  );
  return Object.fromEntries(results);
}
