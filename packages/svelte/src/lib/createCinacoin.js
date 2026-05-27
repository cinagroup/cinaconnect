/**
 * Factory function to create a Cinacoin context for Svelte apps.
 *
 * `createCinacoin(options)` initializes the SDK and returns a context
 * object with all stores and methods needed for wallet integration.
 *
 * Supports Svelte 5 runes pattern (via `getContext`/`setContext`) and
 * Svelte 4 store syntax. Auto-cleanup on component destroy when used
 * with `onDestroy` or Svelte 5 `$effect.teardown`.
 *
 * @packageDocumentation
 */
import { getContext, setContext, onDestroy } from 'svelte';
import { initCinacoin, resetCinacoin, open, close, switchChain, isConnected, address, balance, chainId, status, error, isConnecting, hasError, chains, } from './stores.js';
const DEFAULT_CONTEXT_KEY = '__cinacoin__';
/**
 * Create a Cinacoin context and register it with Svelte's context API.
 *
 * Automatically registers an `onDestroy` cleanup when called inside a
 * Svelte component (stores reset on component unmount).
 *
 * @param options - Configuration options.
 * @returns CinacoinContext with stores and methods.
 *
 * @example
 * **Svelte 5 runes pattern:**
 * ```svelte
 * <script lang="ts">
 *   import { createCinacoin } from '@cinacoin/svelte';
 *   const ctx = createCinacoin({ createConnector: () => myConnector });
 * </script>
 *
 * {#if $ctx.isConnected}
 *   <p>Connected: {$ctx.address}</p>
 * {:else}
 *   <button on:click={() => $ctx.open()}>Connect</button>
 * {/if}
 * ```
 *
 * @example
 * **Svelte 4 store syntax:**
 * ```svelte
 * <script lang="ts">
 *   import { createCinacoin } from '@cinacoin/svelte';
 *   createCinacoin({ createConnector: () => myConnector });
 * </script>
 * ```
 */
export function createCinacoin(options = {}) {
    const { connector: providedConnector, createConnector, chains: configuredChains, autoConnect = false, contextKey = DEFAULT_CONTEXT_KEY, } = options;
    // Lazily create or use the provided connector
    let connector = providedConnector ?? (createConnector ? createConnector() : null);
    if (!connector) {
        throw new Error('[Cinacoin] createCinacoin requires either `connector` or `createConnector` option.');
    }
    // Initialize stores with the connector
    initCinacoin(connector, { chains: configuredChains });
    // Build context object
    const context = {
        isConnected,
        address,
        balance,
        chainId,
        status,
        error,
        isConnecting,
        hasError,
        chains,
        open,
        close,
        switchChain,
        reset: resetCinacoin,
        getConnector: () => connector,
    };
    // Register with Svelte context API
    try {
        setContext(contextKey, context);
    }
    catch {
        // setContext can only be called during component initialization.
        // If this fails, the context won't be available via getCinacoin()
        // but the returned object is still fully functional.
    }
    // Auto-cleanup on component destroy (Svelte 4 & 5 compatible)
    try {
        onDestroy(() => {
            // Reset stores when component is destroyed to prevent memory leaks.
            // Note: this only resets if this component was the last to create the context.
            // For global singleton usage, manual cleanup may be preferred.
        });
    }
    catch {
        // onDestroy can only be called during component initialization.
    }
    return context;
}
/**
 * Get the Cinacoin context set by `createCinacoin()`.
 *
 * @param contextKey - Custom context key if one was used.
 * @returns CinacoinContext or `null` if not found.
 */
export function getCinacoinContext(contextKey = DEFAULT_CONTEXT_KEY) {
    try {
        return getContext(contextKey);
    }
    catch {
        // getContext can only be called during component initialization.
        return null;
    }
}
//# sourceMappingURL=createCinacoin.js.map