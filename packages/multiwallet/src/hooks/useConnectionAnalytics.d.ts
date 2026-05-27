/** Analytics data derived from multiwallet connections. */
export interface ConnectionAnalyticsData {
    /** Total number of wallet connections across all namespaces. */
    totalConnections: number;
    /** Wallet count per namespace. */
    walletsByNamespace: Record<string, number>;
    /** Most recent connection timestamp. */
    lastConnected: Date | null;
    /** Most frequently used wallet (walletId:namespace). */
    mostUsedWallet: string | null;
}

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
export declare function useConnectionAnalytics(): ConnectionAnalyticsData;
//# sourceMappingURL=useConnectionAnalytics.d.ts.map