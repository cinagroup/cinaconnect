/**
 * Lazy Loading Utilities for @cinacoin/core-sdk
 *
 * Provides lazy adapter loading and on-demand module initialization
 * to reduce initial bundle size and improve startup performance.
 */

/** Type for a module loader function. */
export type ModuleLoader<T> = () => Promise<T>;

/** State of a lazy-loaded module. */
type ModuleState<T> = {
  loader: ModuleLoader<T>;
  promise: Promise<T> | null;
  module: T | null;
};

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
export function createLazyLoader<T>(loader: ModuleLoader<T>): {
  load: () => Promise<T>;
  isLoaded: () => boolean;
  reset: () => void;
} {
  const state: ModuleState<T> = {
    loader,
    promise: null,
    module: null,
  };

  return {
    /** Load (or return cached) module instance. */
    load: async (): Promise<T> => {
      if (state.module) return state.module;

      if (!state.promise) {
        state.promise = state.loader().then((mod) => {
          state.module = mod;
          return mod;
        });
      }

      return state.promise;
    },

    /** Check if the module has been loaded. */
    isLoaded: (): boolean => state.module !== null,

    /** Reset the loader to enable re-loading. */
    reset: () => {
      state.promise = null;
      state.module = null;
    },
  };
}

// ─── Adapter Registry ──────────────────────────────────────────────

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
export class AdapterRegistry<T = unknown> {
  private _registry = new Map<string, ModuleState<T>>();

  /**
   * Register an adapter with a name and loader.
   */
  register(name: string, loader: ModuleLoader<T>): void {
    this._registry.set(name, {
      loader,
      promise: null,
      module: null,
    });
  }

  /**
   * Get or load an adapter by name.
   */
  async get(name: string): Promise<T> {
    const state = this._registry.get(name);
    if (!state) {
      throw new Error(`Adapter not registered: ${name}`);
    }

    if (state.module) return state.module;

    if (!state.promise) {
      state.promise = state.loader().then((mod) => {
        state.module = mod as T;
        return mod as T;
      });
    }

    return state.promise;
  }

  /**
   * Check if an adapter is registered.
   */
  has(name: string): boolean {
    return this._registry.has(name);
  }

  /**
   * Check if an adapter has been loaded.
   */
  isLoaded(name: string): boolean {
    const state = this._registry.get(name);
    return state?.module !== null;
  }

  /**
   * List all registered adapter names.
   */
  list(): string[] {
    return Array.from(this._registry.keys());
  }

  /**
   * Preload all registered adapters.
   */
  async preloadAll(): Promise<T[]> {
    const promises = this.list().map((name) => this.get(name));
    return Promise.all(promises);
  }

  /**
   * Reset a specific adapter (allows re-loading).
   */
  reset(name: string): void {
    const state = this._registry.get(name);
    if (state) {
      state.promise = null;
      state.module = null;
    }
  }

  /**
   * Reset all adapters.
   */
  resetAll(): void {
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
export async function conditionalLoad<T>(
  predicate: () => boolean,
  loader: ModuleLoader<T>
): Promise<T | null> {
  if (!predicate()) return null;
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
export async function loadWithTimeout<T>(
  loader: ModuleLoader<T>,
  timeoutMs: number = 5000
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Module loading timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([loader(), timeout]);
}
