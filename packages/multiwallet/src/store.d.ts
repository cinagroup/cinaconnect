import type { SessionState } from "@cinacoin/core-sdk";
import type { ConnectionRecord, MultiwalletState, Namespace } from "./types.js";
/**
 * Central store for managing multiple wallet connections simultaneously.
 *
 * Maintains a collection of `ConnectionRecord` entries grouped by namespace,
 * with exactly one active connection per namespace at any time.
 *
 * @example
 * ```ts
 * const store = new MultiwalletStore();
 * store.addConnection("metamask", "Ethereum", "eip155", address, provider, session);
 * const connections = store.getConnections();
 * ```
 */
export declare class MultiwalletStore {
    /** Internal connections map: namespace → ordered array of records. */
    private connections;
    /** Monotonically increasing version counter for change detection. */
    private _version;
    /** Listener callbacks fired on any state mutation. */
    private listeners;
    constructor();
    /**
     * Add a new wallet connection to the store.
     *
     * If this is the first connection in its namespace, it becomes active
     * automatically.
     *
     * @param walletId - Unique wallet identifier.
     * @param walletName - Human-readable wallet name.
     * @param namespace - CAIP-2 namespace.
     * @param address - Wallet address.
     * @param provider - Provider instance.
     * @param session - Optional session state.
     * @returns The created `ConnectionRecord`.
     */
    addConnection(walletId: string, walletName: string, namespace: Namespace, address: string, provider: unknown, session: SessionState | null): ConnectionRecord;
    /**
     * Remove a wallet connection by ID.
     *
     * If the removed connection was active, the oldest remaining connection
     * in that namespace is promoted to active.
     *
     * @param walletId - Wallet identifier to remove.
     * @param namespace - Namespace to search in (optional; removes from all if omitted).
     * @returns `true` if a record was found and removed.
     */
    removeConnection(walletId: string, namespace?: Namespace): boolean;
    /**
     * Set the active connection for a given namespace.
     *
     * Deactivates any previously-active connection in that namespace.
     *
     * @param walletId - Wallet to activate.
     * @param namespace - Namespace scope.
     * @returns The activated `ConnectionRecord`, or `null` if not found.
     */
    setActiveConnection(walletId: string, namespace: Namespace): ConnectionRecord | null;
    /**
     * Get all connections grouped by namespace.
     *
     * @returns Record mapping namespace → array of `ConnectionRecord`.
     */
    getConnections(): Record<Namespace, ConnectionRecord[]>;
    /**
     * Get the active connection for a namespace.
     *
     * @param namespace - Namespace to query.
     * @returns The active `ConnectionRecord`, or `null` if none.
     */
    getActiveConnection(namespace: Namespace): ConnectionRecord | null;
    /**
     * Swap the active connection within a namespace from one wallet to another.
     *
     * @param namespace - Namespace scope.
     * @param fromWalletId - Currently active wallet (must be active).
     * @param toWalletId - Wallet to activate.
     * @returns `true` if the swap succeeded.
     */
    swapConnection(namespace: Namespace, fromWalletId: string, toWalletId: string): boolean;
    /**
     * Analyze all connections and return a summary report.
     *
     * @returns Analytics summary object.
     */
    analyzeConnections(): ConnectionAnalytics;
    /**
     * Get the current full state snapshot.
     */
    getState(): MultiwalletState;
    /** Subscribe to state changes. Returns an unsubscribe function. */
    subscribe(listener: () => void): () => void;
    private bump;
}
/** Analytics summary returned by `analyzeConnections`. */
export interface ConnectionAnalytics {
    /** Total number of active connections across all namespaces. */
    totalConnections: number;
    /** Count of connections per namespace. */
    walletsByNamespace: Record<string, number>;
    /** Timestamp of the most recently established connection. */
    lastConnected: Date | null;
    /** Wallet ID of the most frequently used wallet (format: "walletId:namespace"). */
    mostUsedWallet: string | null;
}
//# sourceMappingURL=store.d.ts.map