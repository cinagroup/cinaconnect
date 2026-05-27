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
import { derived } from 'svelte/store';
import { isConnected, address, chainId, status, chains } from './stores.js';
import { open, close, switchChain } from './stores.js';
// ─── Chain name derived store ────────────────────────────────────────────────
/**
 * Derive a chain's name from the chains list and current chainId.
 */
const _chainNameStore = derived([chains, chainId], ([$chains, $chainId]) => {
    if ($chainId == null)
        return null;
    const found = $chains.find((c) => c.id === String($chainId));
    return found?.name ?? null;
});
// ─── Connection hooks ────────────────────────────────────────────────────────
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
export function getCinacoin() {
    return {
        /** Open wallet connection modal/flow. */
        open,
        /** Close wallet connection. */
        close,
        /** Readable store: whether the wallet connection modal/flow is open (alias for isConnected). */
        isOpen: isConnected,
    };
}
// ─── Account hooks ───────────────────────────────────────────────────────────
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
export function getCinacoinAccount() {
    return {
        /** Readable: primary account address or null. */
        address,
        /** Readable: whether wallet is connected. */
        isConnected,
        /** Readable: current connection status. */
        status,
        /** Readable: current balance (string, in wei). */
        balance,
    };
}
// ─── Network hooks ───────────────────────────────────────────────────────────
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
export function getCinacoinNetwork() {
    return {
        /** Readable: current chain name (derived from chains list + chainId). */
        chain: _chainNameStore,
        /** Readable: current chain ID or null. */
        chainId,
        /** Switch to a different chain by ID. */
        switchNetwork: switchChain,
        /** Writable: all configured chains. */
        chains,
    };
}
//# sourceMappingURL=useCinacoin.js.map