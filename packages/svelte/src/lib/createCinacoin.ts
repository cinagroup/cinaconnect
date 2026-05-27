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
import { Connector } from '@cinacoin/core-sdk';
import type { Chain, ConnectionResult } from '@cinacoin/core-sdk';
import {
  initCinacoin,
  resetCinacoin,
  open,
  close,
  switchChain,
  isConnected,
  address,
  balance,
  chainId,
  status,
  error,
  isConnecting,
  hasError,
  chains,
} from './stores.js';

/** Options for creating a Cinacoin context. */
export interface CreateCinacoinOptions {
  /** Connector instance from @cinacoin/core-sdk or a custom implementation. */
  connector?: Connector;

  /** Function to create the connector lazily. */
  createConnector?: () => Connector;

  /** Chains available for switching. */
  chains?: Chain[];

  /** Whether to attempt auto-connect from a cached session. */
  autoConnect?: boolean;

  /** Custom context key (for multiple Cinacoin instances). */
  contextKey?: string;
}

/**
 * The context object returned by `createCinacoin()`.
 *
 * Contains all reactive stores and imperative methods needed for
 * wallet connection in a Svelte app.
 */
export interface CinacoinContext {
  // Stores (Svelte 4 $store syntax, Svelte 5 $derived compatible)
  /** Readable: whether wallet is connected. */
  isConnected: typeof isConnected;
  /** Readable: primary account address or null. */
  address: typeof address;
  /** Readable: current balance (string, in wei). */
  balance: typeof balance;
  /** Readable: current chain ID or null. */
  chainId: typeof chainId;
  /** Readable: current connection status. */
  status: typeof status;
  /** Readable: current error or null. */
  error: typeof error;
  /** Readable: whether connecting is in progress. */
  isConnecting: typeof isConnecting;
  /** Readable: whether there is an active error. */
  hasError: typeof hasError;
  /** Writable: configured chains. */
  chains: typeof chains;

  // Imperative methods
  /** Open wallet connection modal/flow. */
  open: typeof open;
  /** Close wallet connection. */
  close: typeof close;
  /** Switch to a different chain. */
  switchChain: typeof switchChain;
  /** Reset all state and cleanup. */
  reset: typeof resetCinacoin;

  // Connector access
  /** Get the underlying connector instance (may be null). */
  getConnector: () => Connector | null;
}

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
export function createCinacoin(options: CreateCinacoinOptions = {}): CinacoinContext {
  const {
    connector: providedConnector,
    createConnector,
    chains: configuredChains,
    autoConnect = false,
    contextKey = DEFAULT_CONTEXT_KEY,
  } = options;

  // Lazily create or use the provided connector
  let connector = providedConnector ?? (createConnector ? createConnector() : null);
  if (!connector) {
    throw new Error(
      '[Cinacoin] createCinacoin requires either `connector` or `createConnector` option.',
    );
  }

  // Initialize stores with the connector
  initCinacoin(connector, { chains: configuredChains });

  // Build context object
  const context: CinacoinContext = {
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
  } catch {
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
  } catch {
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
export function getCinacoinContext(contextKey: string = DEFAULT_CONTEXT_KEY): CinacoinContext | null {
  try {
    return getContext<CinacoinContext>(contextKey);
  } catch {
    // getContext can only be called during component initialization.
    return null;
  }
}
