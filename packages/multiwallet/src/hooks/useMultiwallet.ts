import { useState, useCallback, useMemo, useEffect } from "react";
import type { ConnectionRecord, Namespace, MultiwalletState } from "../types.js";
import { MultiwalletStore } from "../store.js";
import type { ConnectionAnalytics } from "../store.js";

/**
 * A shared singleton store instance used by all `useMultiwallet` callers.
 * This ensures every hook in the same app sees the same connection state.
 */
let sharedStore: MultiwalletStore | null = null;

function getStore(): MultiwalletStore {
  if (!sharedStore) {
    sharedStore = new MultiwalletStore();
  }
  return sharedStore;
}

/**
 * React hook for multiwallet state management.
 *
 * Provides reactive access to all wallet connections, active connection
 * per namespace, and operations to add/remove/switch wallets.
 *
 * @example
 * ```tsx
 * const {
 *   connections,
 *   activeConnection,
 *   setActiveConnection,
 *   addConnection,
 *   removeConnection,
 *   switchWallet,
 *   analyze,
 * } = useMultiwallet();
 * ```
 *
 * @returns Object with connection data and mutation helpers.
 */
export function useMultiwallet() {
  const store = useMemo(() => getStore(), []);
  const [state, setState] = useState<MultiwalletState>(() => store.getState());

  // Subscribe to store changes
  useEffect(() => {
    return store.subscribe(() => {
      setState(store.getState());
    });
  }, [store]);

  /** All connections grouped by namespace. */
  const connections: Record<string, WalletConnection[]> = useMemo(() => {
    const result: Record<string, WalletConnection[]> = {};
    for (const [ns, records] of Object.entries(state.connections)) {
      result[ns] = records.map(toWalletConnection);
    }
    return result;
  }, [state.connections]);

  /** Active connection across all namespaces (from the first namespace with an active connection). */
  const activeConnection: WalletConnection | null = useMemo(() => {
    for (const ns of ["eip155", "solana", "bip122"] as Namespace[]) {
      const active = state.activeConnections[ns];
      if (active) return toWalletConnection(active);
    }
    return null;
  }, [state.activeConnections]);

  /** Set the active connection for a specific namespace. */
  const setActiveConnection = useCallback(
    (walletId: string, namespace: Namespace) => {
      store.setActiveConnection(walletId, namespace);
    },
    [store]
  );

  /** Add a new wallet connection. */
  const addConnection = useCallback(
    (
      walletId: string,
      walletName: string,
      namespace: Namespace,
      address: string,
      provider: unknown = null,
      session: unknown = null
    ) => {
      store.addConnection(
        walletId,
        walletName,
        namespace,
        address,
        provider,
        session as Parameters<typeof store.addConnection>[5]
      );
    },
    [store]
  );

  /** Remove a wallet connection. */
  const removeConnection = useCallback(
    (walletId: string, namespace?: Namespace) => {
      store.removeConnection(walletId, namespace);
    },
    [store]
  );

  /** Switch the active wallet within a namespace. */
  const switchWallet = useCallback(
    (namespace: Namespace, walletId: string) => {
      store.setActiveConnection(walletId, namespace);
    },
    [store]
  );

  /** Run analytics on current connections. */
  const analyze = useCallback((): ConnectionAnalytics => {
    return store.analyzeConnections();
  }, [store]);

  return {
    connections,
    activeConnection,
    setActiveConnection,
    addConnection,
    removeConnection,
    switchWallet,
    analyze,
  };
}

/**
 * Flattened view of a `ConnectionRecord` for React components.
 * Uses string namespace to avoid enum serialization issues.
 */
export interface WalletConnection {
  walletId: string;
  walletName: string;
  namespace: string;
  address: string;
  connectedAt: Date;
  lastUsed: Date;
  isActive: boolean;
  icon?: string;
}

function toWalletConnection(record: ConnectionRecord): WalletConnection {
  return {
    walletId: record.walletId,
    walletName: record.walletName,
    namespace: record.namespace,
    address: record.address,
    connectedAt: record.connectedAt,
    lastUsed: record.lastUsed,
    isActive: record.isActive,
    icon: record.metadata.icon,
  };
}
