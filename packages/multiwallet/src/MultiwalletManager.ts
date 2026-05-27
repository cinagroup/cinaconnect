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
export class MultiwalletManager {
  private store: MultiwalletStore;
  private onAddedCallbacks: Set<ConnectionCallback>;
  private onRemovedCallbacks: Set<ConnectionCallback>;

  constructor(store?: MultiwalletStore) {
    this.store = store ?? new MultiwalletStore();
    this.onAddedCallbacks = new Set();
    this.onRemovedCallbacks = new Set();
  }

  // ─── Public API ───────────────────────────────────────────────

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
  async connect(
    walletId: string,
    namespace: Namespace,
    walletName: string = walletId,
    address: string = "",
    provider: unknown = null,
    session: SessionState | null = null
  ): Promise<ConnectionRecord> {
    const record = this.store.addConnection(
      walletId,
      walletName,
      namespace,
      address,
      provider,
      session
    );
    this.emitAdded(record);
    return record;
  }

  /**
   * Disconnect a specific wallet.
   *
   * @param walletId - Wallet to disconnect.
   * @param namespace - Optional namespace scope.
   * @returns `true` if a connection was found and removed.
   */
  disconnect(walletId: string, namespace?: Namespace): boolean {
    const record = namespace
      ? this.store.getActiveConnection(namespace)?.walletId === walletId
        ? this.store.getActiveConnection(namespace)
        : null
      : null;

    const removed = this.store.removeConnection(walletId, namespace);
    if (removed && record) {
      this.emitRemoved(record);
    }
    return removed;
  }

  /**
   * Switch the active wallet for a given namespace.
   *
   * @param namespace - Namespace to switch within.
   * @param walletId - Wallet to activate.
   * @returns `true` if the switch succeeded.
   */
  switchWallet(namespace: Namespace, walletId: string): boolean {
    return this.store.setActiveConnection(walletId, namespace) !== null;
  }

  /**
   * Register a callback fired when a new connection is added.
   *
   * @param callback - Invoked with the new `ConnectionRecord`.
   * @returns Unsubscribe function.
   */
  onConnectionAdded(callback: ConnectionCallback): () => void {
    this.onAddedCallbacks.add(callback);
    return () => {
      this.onAddedCallbacks.delete(callback);
    };
  }

  /**
   * Register a callback fired when a connection is removed.
   *
   * @param callback - Invoked with the removed `ConnectionRecord`.
   * @returns Unsubscribe function.
   */
  onConnectionRemoved(callback: ConnectionCallback): () => void {
    this.onRemovedCallbacks.add(callback);
    return () => {
      this.onRemovedCallbacks.delete(callback);
    };
  }

  /**
   * Access the underlying store for advanced operations.
   */
  getStore(): MultiwalletStore {
    return this.store;
  }

  // ─── Private ──────────────────────────────────────────────────

  private emitAdded(record: ConnectionRecord): void {
    for (const cb of this.onAddedCallbacks) {
      try {
        cb(record);
      } catch {
        // Don't let consumer errors break the manager
      }
    }
  }

  private emitRemoved(record: ConnectionRecord): void {
    for (const cb of this.onRemovedCallbacks) {
      try {
        cb(record);
      } catch {
        // Don't let consumer errors break the manager
      }
    }
  }
}
