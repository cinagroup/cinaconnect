import type { Namespace } from '../types.js';
import type { ConnectionAnalytics } from '../store.js';

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
export declare function useMultiwallet(): {
    connections: Record<string, WalletConnection[]>;
    activeConnection: WalletConnection | null;
    setActiveConnection: (walletId: string, namespace: Namespace) => void;
    addConnection: (walletId: string, walletName: string, namespace: Namespace, address: string, provider?: unknown, session?: unknown) => void;
    removeConnection: (walletId: string, namespace?: Namespace) => void;
    switchWallet: (namespace: Namespace, walletId: string) => void;
    analyze: () => ConnectionAnalytics;
};
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
//# sourceMappingURL=useMultiwallet.d.ts.map