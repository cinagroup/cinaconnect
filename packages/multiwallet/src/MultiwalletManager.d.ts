import type { SessionState } from "@cinacoin/core-sdk";
import type { ConnectionRecord, Namespace } from "./types.js";
import { MultiwalletStore } from "./store.js";
/** Event callback signature for connection lifecycle events. */
export type ConnectionCallback = (record: ConnectionRecord) => void;
/**
 * High-level manager that orchestrates multiwallet connections.
 *
 * Wraps a `MultiwalletStore` and provides a clean connect/disconnect/switch API
 * with event emission for downstream consumers.
 *
 * @example
 * ```ts
 * const manager = new MultiwalletManager();
 * manager.onConnectionAdded((r) => console.log("Connected:", r.walletName));
 * await manager.connect("metamask", "eip155");
 * ```
 */
export declare class MultiwalletManager {
    private store;
    private onAddedCallbacks;
    private onRemovedCallbacks;
    constructor(store?: MultiwalletStore);
    /**
     * Connect a new wallet to a namespace.
     *
     * @param walletId - Unique wallet identifier.
     * @param namespace - Target namespace.
     * @param walletName - Human-readable name.
     * @param address - Wallet address.
     * @param provider - Provider instance.
     * @param session - Optional session state.
     * @returns The created connection record.
     */
    connect(walletId: string, namespace: Namespace, walletName?: string, address?: string, provider?: unknown, session?: SessionState | null): Promise<ConnectionRecord>;
    /**
     * Disconnect a specific wallet.
     *
     * @param walletId - Wallet to disconnect.
     * @param namespace - Optional namespace scope.
     * @returns `true` if a connection was found and removed.
     */
    disconnect(walletId: string, namespace?: Namespace): boolean;
    /**
     * Switch the active wallet for a given namespace.
     *
     * @param namespace - Namespace to switch within.
     * @param walletId - Wallet to activate.
     * @returns `true` if the switch succeeded.
     */
    switchWallet(namespace: Namespace, walletId: string): boolean;
    /**
     * Register a callback fired when a new connection is added.
     *
     * @param callback - Invoked with the new `ConnectionRecord`.
     * @returns Unsubscribe function.
     */
    onConnectionAdded(callback: ConnectionCallback): () => void;
    /**
     * Register a callback fired when a connection is removed.
     *
     * @param callback - Invoked with the removed `ConnectionRecord`.
     * @returns Unsubscribe function.
     */
    onConnectionRemoved(callback: ConnectionCallback): () => void;
    /**
     * Access the underlying store for advanced operations.
     */
    getStore(): MultiwalletStore;
    private emitAdded;
    private emitRemoved;
}
//# sourceMappingURL=MultiwalletManager.d.ts.map