import type { SessionState } from "@cinacoin/core-sdk";
import type { ConnectionRecord, ActiveConnection, MultiwalletState, Namespace } from "./types.js";

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
export class MultiwalletStore {
  /** Internal connections map: namespace → ordered array of records. */
  private connections: Map<Namespace, ConnectionRecord[]>;

  /** Monotonically increasing version counter for change detection. */
  private _version: number;

  /** Listener callbacks fired on any state mutation. */
  private listeners: Set<() => void>;

  constructor() {
    this.connections = new Map<Namespace, ConnectionRecord[]>([
      ["eip155", []],
      ["solana", []],
      ["bip122", []],
    ]);
    this._version = 0;
    this.listeners = new Set();
  }

  // ─── Public API ───────────────────────────────────────────────

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
  addConnection(
    walletId: string,
    walletName: string,
    namespace: Namespace,
    address: string,
    provider: unknown,
    session: SessionState | null
  ): ConnectionRecord {
    const now = new Date();
    const records = this.connections.get(namespace) ?? [];

    // Prevent duplicate entries for the same walletId + namespace
    const existing = records.find((r) => r.walletId === walletId);
    if (existing) {
      // Update existing record in place
      existing.address = address;
      existing.provider = provider;
      existing.session = session;
      existing.lastUsed = now;
      if (!existing.isActive && records.every((r) => !r.isActive || r === existing)) {
        existing.isActive = true;
      }
      this.bump();
      return existing;
    }

    const isFirst = records.length === 0;
    const record: ConnectionRecord = {
      walletId,
      walletName,
      namespace,
      address,
      provider,
      session,
      connectedAt: now,
      lastUsed: now,
      isActive: isFirst,
      metadata: {},
    };

    records.push(record);
    this.connections.set(namespace, records);
    this.bump();
    return record;
  }

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
  removeConnection(walletId: string, namespace?: Namespace): boolean {
    let found = false;

    const namespaces: Namespace[] = namespace
      ? [namespace]
      : ["eip155", "solana", "bip122"];

    for (const ns of namespaces) {
      const records = this.connections.get(ns) ?? [];
      const idx = records.findIndex((r) => r.walletId === walletId);
      if (idx === -1) continue;

      const wasActive = records[idx].isActive;
      records.splice(idx, 1);

      // Promote next available connection if the removed one was active
      if (wasActive && records.length > 0) {
        records[0].isActive = true;
      }

      this.connections.set(ns, records);
      found = true;
    }

    if (found) this.bump();
    return found;
  }

  /**
   * Set the active connection for a given namespace.
   *
   * Deactivates any previously-active connection in that namespace.
   *
   * @param walletId - Wallet to activate.
   * @param namespace - Namespace scope.
   * @returns The activated `ConnectionRecord`, or `null` if not found.
   */
  setActiveConnection(walletId: string, namespace: Namespace): ConnectionRecord | null {
    const records = this.connections.get(namespace) ?? [];

    // Deactivate current active
    for (const r of records) {
      r.isActive = false;
    }

    const target = records.find((r) => r.walletId === walletId);
    if (!target) return null;

    target.isActive = true;
    target.lastUsed = new Date();
    this.bump();
    return target;
  }

  /**
   * Get all connections grouped by namespace.
   *
   * @returns Record mapping namespace → array of `ConnectionRecord`.
   */
  getConnections(): Record<Namespace, ConnectionRecord[]> {
    return {
      eip155: [...(this.connections.get("eip155") ?? [])],
      solana: [...(this.connections.get("solana") ?? [])],
      bip122: [...(this.connections.get("bip122") ?? [])],
    };
  }

  /**
   * Get the active connection for a namespace.
   *
   * @param namespace - Namespace to query.
   * @returns The active `ConnectionRecord`, or `null` if none.
   */
  getActiveConnection(namespace: Namespace): ConnectionRecord | null {
    const records = this.connections.get(namespace) ?? [];
    return records.find((r) => r.isActive) ?? null;
  }

  /**
   * Swap the active connection within a namespace from one wallet to another.
   *
   * @param namespace - Namespace scope.
   * @param fromWalletId - Currently active wallet (must be active).
   * @param toWalletId - Wallet to activate.
   * @returns `true` if the swap succeeded.
   */
  swapConnection(
    namespace: Namespace,
    fromWalletId: string,
    toWalletId: string
  ): boolean {
    const records = this.connections.get(namespace) ?? [];
    const from = records.find((r) => r.walletId === fromWalletId);
    const to = records.find((r) => r.walletId === toWalletId);

    if (!from || !to || !from.isActive) return false;

    from.isActive = false;
    to.isActive = true;
    to.lastUsed = new Date();
    this.bump();
    return true;
  }

  /**
   * Analyze all connections and return a summary report.
   *
   * @returns Analytics summary object.
   */
  analyzeConnections(): ConnectionAnalytics {
    const all = this.getConnections();
    const total = Object.values(all).flat().length;
    const walletsByNamespace: Record<string, number> = {};
    const mostUsedWallets: Map<string, number> = new Map();

    for (const [ns, records] of Object.entries(all)) {
      walletsByNamespace[ns] = records.length;
      for (const r of records) {
        const key = `${r.walletId}:${r.namespace}`;
        mostUsedWallets.set(key, (mostUsedWallets.get(key) ?? 0) + 1);
      }
    }

    let mostUsedWallet: string | null = null;
    let maxUse = 0;
    for (const [key, count] of mostUsedWallets) {
      if (count > maxUse) {
        maxUse = count;
        mostUsedWallet = key;
      }
    }

    let lastConnected: Date | null = null;
    for (const records of Object.values(all)) {
      for (const r of records) {
        if (!lastConnected || r.connectedAt > lastConnected) {
          lastConnected = r.connectedAt;
        }
      }
    }

    return {
      totalConnections: total,
      walletsByNamespace,
      lastConnected,
      mostUsedWallet,
    };
  }

  /**
   * Get the current full state snapshot.
   */
  getState(): MultiwalletState {
    const connections = this.getConnections();
    const activeConnections: Partial<Record<Namespace, ActiveConnection>> = {};

    for (const ns of ["eip155", "solana", "bip122"] as Namespace[]) {
      const active = this.getActiveConnection(ns);
      if (active) {
        activeConnections[ns] = active as ActiveConnection;
      }
    }

    return {
      connections,
      activeConnections,
      version: this._version,
    };
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ─── Private ──────────────────────────────────────────────────

  private bump(): void {
    this._version++;
    for (const listener of this.listeners) {
      listener();
    }
  }
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
