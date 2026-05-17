import { useMemo } from "react";
import { useMultiwallet } from "./useMultiwallet.js";
import type { WalletConnection } from "./useMultiwallet.js";

/**
 * React hook that computes analytics over the current multiwallet connections.
 *
 * @example
 * ```tsx
 * const { totalConnections, walletsByNamespace, lastConnected, mostUsedWallet } = useConnectionAnalytics();
 * ```
 *
 * @returns Analytics data object derived from the store state.
 */
export function useConnectionAnalytics() {
  const { connections, analyze } = useMultiwallet();

  return useMemo(() => {
    const totalConnections = Object.values(connections).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    const walletsByNamespace: Record<string, number> = {};
    for (const [ns, conns] of Object.entries(connections)) {
      walletsByNamespace[ns] = conns.length;
    }

    const allConnections: WalletConnection[] = Object.values(connections).flat();

    let lastConnected: Date | null = null;
    for (const c of allConnections) {
      if (!lastConnected || c.connectedAt > lastConnected) {
        lastConnected = c.connectedAt;
      }
    }

    // Count active usages per wallet to determine most-used
    const walletUsage = new Map<string, number>();
    for (const c of allConnections) {
      const key = `${c.walletId}:${c.namespace}`;
      walletUsage.set(key, (walletUsage.get(key) ?? 0) + 1);
    }

    let mostUsedWallet: string | null = null;
    let maxCount = 0;
    for (const [key, count] of walletUsage) {
      if (count > maxCount) {
        maxCount = count;
        mostUsedWallet = key;
      }
    }

    // Fall back to store's analyze for richer data if available
    const storeAnalytics = analyze();

    return {
      totalConnections,
      walletsByNamespace,
      lastConnected: lastConnected ?? storeAnalytics.lastConnected,
      mostUsedWallet: mostUsedWallet ?? storeAnalytics.mostUsedWallet,
    };
  }, [connections, analyze]);
}
