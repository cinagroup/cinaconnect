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
import { writable, derived, } from 'svelte/store';
// ─── Internal singleton state ────────────────────────────────────────────────
let _sdkConnector = null;
let _sdkInitialized = false;
/**
 * Internal connection status writable store.
 * Synced with core-sdk events.
 */
const _statusStore = writable('disconnected');
/**
 * Internal accounts writable store.
 * Holds the currently connected account addresses.
 */
const _accountsStore = writable([]);
/**
 * Internal chain ID writable store.
 */
const _chainIdStore = writable(null);
/**
 * Internal error writable store.
 */
const _errorStore = writable(null);
// ─── Public readable stores ──────────────────────────────────────────────────
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
export const isConnected = derived(_statusStore, ($status) => $status === 'connected');
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
export const address = derived(_accountsStore, ($accounts) => $accounts.length > 0 ? $accounts[0] : null);
/**
 * Readable store: current balance (string, in wei).
 * Defaults to `'0'` until fetched.
 */
export const balance = writable('0');
/**
 * Readable store: current chain ID, or `null` if disconnected.
 */
export const chainId = _chainIdStore;
/**
 * Readable store: current connection status.
 *
 * Values: `'disconnected'` | `'connecting'` | `'connected'` | `'error'`
 */
export const status = _statusStore;
/**
 * Readable store: current error, or `null`.
 */
export const error = _errorStore;
/**
 * Readable store: whether the SDK is currently in a connecting state.
 */
export const isConnecting = derived(_statusStore, ($status) => $status === 'connecting');
/**
 * Readable store: whether there is an active error.
 */
export const hasError = derived(_errorStore, ($error) => $error !== null);
/**
 * Writable store: configured chains available for switching.
 */
export const chains = writable([]);
// ─── Internal sync helpers ───────────────────────────────────────────────────
/**
 * Sync a core-sdk ConnectionResult into all Svelte stores.
 *
 * @param result - Connection result from a connector.
 */
function syncFromConnectionResult(result) {
    _statusStore.set('connected');
    _accountsStore.set(result.accounts);
    _chainIdStore.set(result.chainId);
    _errorStore.set(null);
}
/**
 * Set an error state.
 *
 * @param err - Error object.
 */
function syncError(err) {
    _statusStore.set('error');
    _errorStore.set(err);
}
// ─── Event subscriptions ─────────────────────────────────────────────────────
let _eventUnsubscribe = null;
/**
 * Subscribe Svelte stores to core-sdk connector events.
 *
 * Listens for: `connect`, `disconnect`, `accountsChanged`, `chainChanged`, `error`.
 *
 * @param connector - The connector instance to listen to.
 */
function subscribeToEvents(connector) {
    if (_eventUnsubscribe) {
        _eventUnsubscribe();
    }
    const onConnect = (result) => syncFromConnectionResult(result);
    const onDisconnect = () => {
        _statusStore.set('disconnected');
        _accountsStore.set([]);
        _chainIdStore.set(null);
        _errorStore.set(null);
    };
    const onAccountsChanged = (accounts) => _accountsStore.set(accounts);
    const onChainChanged = (chainId) => _chainIdStore.set(chainId);
    const onError = (err) => syncError(err);
    connector.on('connect', onConnect);
    connector.on('disconnect', onDisconnect);
    connector.on('accountsChanged', onAccountsChanged);
    connector.on('chainChanged', onChainChanged);
    connector.on('error', onError);
    _eventUnsubscribe = () => {
        connector.off('connect', onConnect);
        connector.off('disconnect', onDisconnect);
        connector.off('accountsChanged', onAccountsChanged);
        connector.off('chainChanged', onChainChanged);
        connector.off('error', onError);
    };
}
// ─── Public API ──────────────────────────────────────────────────────────────
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
export function initCinacoin(connector, options) {
    if (_sdkInitialized) {
        console.warn('[Cinacoin] initCinacoin called more than once; reusing existing instance.');
        return;
    }
    _sdkConnector = connector;
    _sdkInitialized = true;
    if (options?.chains) {
        chains.set(options.chains);
    }
    subscribeToEvents(connector);
}
/**
 * Get the current connector instance.
 *
 * @returns The active connector, or `null` if not initialized.
 */
export function getConnector() {
    return _sdkConnector;
}
/**
 * Open the wallet connection modal / flow.
 *
 * Connects through the registered connector and updates stores on success.
 *
 * @param params - Optional connection parameters.
 * @returns Promise resolving with the connection result.
 */
export async function open(params) {
    if (!_sdkConnector) {
        throw new Error('[Cinacoin] SDK not initialized. Call initCinacoin() first.');
    }
    _statusStore.set('connecting');
    try {
        const result = await _sdkConnector.connect(params);
        syncFromConnectionResult(result);
        return result;
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        syncError(error);
        throw error;
    }
}
/**
 * Close the current wallet connection.
 *
 * Disconnects from the wallet and resets all stores to their initial state.
 */
export async function close() {
    if (!_sdkConnector) {
        throw new Error('[Cinacoin] SDK not initialized. Call initCinacoin() first.');
    }
    try {
        await _sdkConnector.disconnect();
    }
    catch {
        // Best-effort disconnect — still reset local state.
    }
    _statusStore.set('disconnected');
    _accountsStore.set([]);
    _chainIdStore.set(null);
    _errorStore.set(null);
}
/**
 * Switch to a different chain.
 *
 * @param chainId - Target chain ID.
 */
export async function switchChain(chainId) {
    if (!_sdkConnector) {
        throw new Error('[Cinacoin] SDK not initialized. Call initCinacoin() first.');
    }
    await _sdkConnector.switchChain(chainId);
}
/**
 * Reset all stores to their initial state and unsubscribe from events.
 *
 * Call during app teardown or when re-initializing.
 */
export function resetCinacoin() {
    if (_eventUnsubscribe) {
        _eventUnsubscribe();
        _eventUnsubscribe = null;
    }
    _sdkConnector = null;
    _sdkInitialized = false;
    _statusStore.set('disconnected');
    _accountsStore.set([]);
    _chainIdStore.set(null);
    _errorStore.set(null);
    chains.set([]);
    balance.set('0');
}
//# sourceMappingURL=stores.js.map