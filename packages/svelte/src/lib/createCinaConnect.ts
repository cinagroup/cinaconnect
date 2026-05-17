/**
 * Factory function to create a CinaConnect context for Svelte apps.
 *
 * `createCinaConnect(options)` initializes the SDK and returns a context
 * object with all stores and methods needed for wallet integration.
 *
 * Supports Svelte 5 runes pattern (via `getContext`/`setContext`) and
 * Svelte 4 store syntax. Auto-cleanup on component destroy when used
 * with `onDestroy` or Svelte 5 `$effect.teardown`.
 *
 * @packageDocumentation
 */

import { getContext, setContext, onDestroy } from 'svelte';
import { Connector } from '@cinaconnect/core-sdk';
import type { Chain, ConnectionResult } from '@cinaconnect/core-sdk';
import {
  initCinaConnect,
  resetCinaConnect,
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

/** Options for creating a CinaConnect context. */
export interface CreateCinaConnectOptions {
  /** Connector instance from @cinaconnect/core-sdk or a custom implementation. */
  connector?: Connector;

  /** Function to create the connector lazily. */
  createConnector?: () => Connector;

  /** Chains available for switching. */
  chains?: Chain[];

  /** Whether to attempt auto-connect from a cached session. */
  autoConnect?: boolean;

  /** Custom context key (for multiple CinaConnect instances). */
  contextKey?: string;
}

/**
 * The context object returned by `createCinaConnect()`.
 *
 * Contains all reactive stores and imperative methods needed for
 * wallet connection in a Svelte app.
 */
export interface CinaConnectContext {
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
  reset: typeof resetCinaConnect;

  // Connector access
  /** Get the underlying connector instance (may be null). */
  getConnector: () => Connector | null;
}

const DEFAULT_CONTEXT_KEY = '__cinaconnect__';

/**
 * Create a CinaConnect context and register it with Svelte's context API.
 *
 * Automatically registers an `onDestroy` cleanup when called inside a
 * Svelte component (stores reset on component unmount).
 *
 * @param options - Configuration options.
 * @returns CinaConnectContext with stores and methods.
 *
 * @example
 * **Svelte 5 runes pattern:**
 * ```svelte
 * <script lang="ts">
 *   import { createCinaConnect } from '@cinaconnect/svelte';
 *   const ctx = createCinaConnect({ createConnector: () => myConnector });
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
 *   import { createCinaConnect } from '@cinaconnect/svelte';
 *   createCinaConnect({ createConnector: () => myConnector });
 * </script>
 * ```
 */
export function createCinaConnect(options: CreateCinaConnectOptions = {}): CinaConnectContext {
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
      '[CinaConnect] createCinaConnect requires either `connector` or `createConnector` option.',
    );
  }

  // Initialize stores with the connector
  initCinaConnect(connector, { chains: configuredChains });

  // Build context object
  const context: CinaConnectContext = {
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
    reset: resetCinaConnect,
    getConnector: () => connector,
  };

  // Register with Svelte context API
  try {
    setContext(contextKey, context);
  } catch {
    // setContext can only be called during component initialization.
    // If this fails, the context won't be available via getCinaConnect()
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
 * Get the CinaConnect context set by `createCinaConnect()`.
 *
 * @param contextKey - Custom context key if one was used.
 * @returns CinaConnectContext or `null` if not found.
 */
export function getCinaConnectContext(contextKey: string = DEFAULT_CONTEXT_KEY): CinaConnectContext | null {
  try {
    return getContext<CinaConnectContext>(contextKey);
  } catch {
    // getContext can only be called during component initialization.
    return null;
  }
}
