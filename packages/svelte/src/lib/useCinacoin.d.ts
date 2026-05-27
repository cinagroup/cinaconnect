/**
 * Svelte hook-style accessors for Cinacoin.
 *
 * These functions return store objects that can be used directly in
 * Svelte components (Svelte 4 `$store` or Svelte 5 runes).
 *
 * Designed for the same ergonomics as `useCinacoin()` in React
 * but adapted to Svelte's reactivity model.
 *
 * @packageDocumentation
 */
import { type Readable } from 'svelte/store';
import type { Chain, ConnectionStatus } from '@cinacoin/core-sdk';
import { open, close, switchChain } from './stores.js';
/**
 * Access Cinacoin connection methods.
 *
 * Returns `{ open, close, isOpen }` for wallet connection control.
 *
 * @example
 * **Svelte 5 runes:**
 * ```svelte
 * <script lang="ts">
 *   import { getCinacoin } from '@cinacoin/svelte';
 *   const { open, close, isOpen } = getCinacoin();
 * </script>
 *
 * <button on:click={() => open()}>Connect</button>
 * ```
 *
 * @example
 * **Svelte 4:**
 * ```svelte
 * <script lang="ts">
 *   import { getCinacoin } from '@cinacoin/svelte';
 *   const { open, close, isOpen } = getCinacoin();
 * </script>
 *
 * <button on:click={open}>Connect</button>
 * ```
 *
 * @returns Object with `open`, `close`, and `isOpen` store.
 */
export declare function getCinacoin(): {
    /** Open wallet connection modal/flow. */
    open: typeof open;
    /** Close wallet connection. */
    close: typeof close;
    /** Readable store: whether the wallet connection modal/flow is open (alias for isConnected). */
    isOpen: Readable<boolean>;
};
/**
 * Access account-related stores.
 *
 * Returns `{ address, isConnected, status, balance }`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { getCinacoinAccount } from '@cinacoin/svelte';
 *   const account = getCinacoinAccount();
 * </script>
 *
 * {#if $account.isConnected}
 *   <p>Connected: {$account.address}</p>
 * {:else}
 *   <p>Not connected</p>
 * {/if}
 * ```
 *
 * @returns Object with account stores.
 */
export declare function getCinacoinAccount(): {
    /** Readable: primary account address or null. */
    address: Readable<string | null>;
    /** Readable: whether wallet is connected. */
    isConnected: Readable<boolean>;
    /** Readable: current connection status. */
    status: Readable<ConnectionStatus>;
    /** Readable: current balance (string, in wei). */
    balance: any;
};
/**
 * Access network-related stores and methods.
 *
 * Returns `{ chain, chainId, switchNetwork, chains }`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { getCinacoinNetwork } from '@cinacoin/svelte';
 *   const network = getCinacoinNetwork();
 * </script>
 *
 * <p>Chain: {$network.chainId}</p>
 * <button on:click={() => $network.switchNetwork(1)}>Switch to Ethereum</button>
 * ```
 *
 * @returns Object with network stores and methods.
 */
export declare function getCinacoinNetwork(): {
    /** Readable: current chain name (derived from chains list + chainId). */
    chain: Readable<string | null>;
    /** Readable: current chain ID or null. */
    chainId: Readable<number | null>;
    /** Switch to a different chain by ID. */
    switchNetwork: typeof switchChain;
    /** Writable: all configured chains. */
    chains: import("svelte/store").Writable<Chain[]>;
};
//# sourceMappingURL=useCinacoin.d.ts.map