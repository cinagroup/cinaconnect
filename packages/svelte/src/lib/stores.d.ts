/**
 * Svelte stores wrapping @cinacoin/core-sdk state.
 *
 * Provides reactive Svelte stores (writable, readable, derived) that
 * mirror the core-sdk state, automatically subscribing to events.
 *
 * Works with Svelte 4 ($store syntax) and Svelte 5 ($derived runes).
 *
 * @packageDocumentation
 */
import { type Readable, type Writable } from 'svelte/store';
import { Connector } from '@cinacoin/core-sdk';
import type { Chain, ConnectionResult, ConnectionStatus } from '@cinacoin/core-sdk';
/**
 * Readable store: whether the wallet is currently connected.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { isConnected } from '@cinacoin/svelte';
 * </script>
 *
 * {#if $isConnected}
 *   <p>Wallet is connected!</p>
 * {/if}
 * ```
 */
export declare const isConnected: Readable<boolean>;
/**
 * Readable store: the primary connected account address (first in list), or `null`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { address } from '@cinacoin/svelte';
 * </script>
 *
 * <p>Address: {$address ?? 'none'}</p>
 * ```
 */
export declare const address: Readable<string | null>;
/**
 * Readable store: current balance (string, in wei).
 * Defaults to `'0'` until fetched.
 */
export declare const balance: Readable<string>;
/**
 * Readable store: current chain ID, or `null` if disconnected.
 */
export declare const chainId: Readable<number | null>;
/**
 * Readable store: current connection status.
 *
 * Values: `'disconnected'` | `'connecting'` | `'connected'` | `'error'`
 */
export declare const status: Readable<ConnectionStatus>;
/**
 * Readable store: current error, or `null`.
 */
export declare const error: Readable<Error | null>;
/**
 * Readable store: whether the SDK is currently in a connecting state.
 */
export declare const isConnecting: Readable<boolean>;
/**
 * Readable store: whether there is an active error.
 */
export declare const hasError: Readable<boolean>;
/**
 * Writable store: configured chains available for switching.
 */
export declare const chains: Writable<Chain[]>;
/**
 * Initialize the Cinacoin Svelte stores with a connector.
 *
 * Call this once during app setup (e.g., in `+layout.ts` or a root component).
 * Stores automatically subscribe to the connector's events.
 *
 * @param connector - An initialized connector from @cinacoin/core-sdk.
 * @param options - Optional configuration (chains, initial status).
 *
 * @example
 * ```ts
 * import { initCinacoin } from '@cinacoin/svelte';
 * import { MyConnector } from './my-connector';
 *
 * const connector = new MyConnector();
 * initCinacoin(connector, { chains: [...] });
 * ```
 */
export declare function initCinacoin(connector: Connector, options?: {
    chains?: Chain[];
}): void;
/**
 * Get the current connector instance.
 *
 * @returns The active connector, or `null` if not initialized.
 */
export declare function getConnector(): Connector | null;
/**
 * Open the wallet connection modal / flow.
 *
 * Connects through the registered connector and updates stores on success.
 *
 * @param params - Optional connection parameters.
 * @returns Promise resolving with the connection result.
 */
export declare function open(params?: Parameters<Connector['connect']>[0]): Promise<ConnectionResult>;
/**
 * Close the current wallet connection.
 *
 * Disconnects from the wallet and resets all stores to their initial state.
 */
export declare function close(): Promise<void>;
/**
 * Switch to a different chain.
 *
 * @param chainId - Target chain ID.
 */
export declare function switchChain(chainId: number): Promise<void>;
/**
 * Reset all stores to their initial state and unsubscribe from events.
 *
 * Call during app teardown or when re-initializing.
 */
export declare function resetCinacoin(): void;
//# sourceMappingURL=stores.d.ts.map