import type { SessionState } from "@cinacoin/core-sdk";
/** CAIP-2 namespace identifier for a wallet connection. */
export type Namespace = "eip155" | "solana" | "bip122";
/**
 * A single wallet connection within a specific namespace.
 */
export interface ConnectionRecord {
    /** Unique wallet identifier (e.g. "metamask", "phantom"). */
    walletId: string;
    /** Human-readable wallet name. */
    walletName: string;
    /** CAIP-2 namespace this connection belongs to. */
    namespace: Namespace;
    /** Wallet address (CAIP-10 format recommended). */
    address: string;
    /** Provider instance returned by the wallet SDK. */
    provider: unknown;
    /** Active session state, or null if session is pending/expired. */
    session: SessionState | null;
    /** Timestamp when this connection was established. */
    connectedAt: Date;
    /** Timestamp of the most recent interaction. */
    lastUsed: Date;
    /** Whether this connection is the active one for its namespace. */
    isActive: boolean;
    /** Optional display metadata. */
    metadata: {
        icon?: string;
        order?: number;
    };
}
/**
 * Convenience type for the currently-active connection in a namespace.
 * Equivalent to `ConnectionRecord & { isActive: true }`.
 */
export type ActiveConnection = ConnectionRecord & {
    isActive: true;
};
/**
 * Full state of the multiwallet system: all connections grouped by namespace.
 */
export interface MultiwalletState {
    /** Connections keyed by namespace → array of records. */
    connections: Record<Namespace, ConnectionRecord[]>;
    /** Quick lookup of the active connection per namespace. */
    activeConnections: Partial<Record<Namespace, ActiveConnection>>;
    /** Monotonically increasing version counter for change detection. */
    version: number;
}
//# sourceMappingURL=types.d.ts.map