/**
 * Hook: useWalletButtons
 *
 * Provides pre-configured wallet button data for 40+ wallets and
 * connection-state helpers backed by @cinacoin/core-sdk.
 */
import { WalletButtonData } from '../types';
import { Connector } from '@cinacoin/core-sdk';
/**
 * Hook that exposes wallet-button data and connection state.
 *
 * ```tsx
 * const { buttons, getWalletButtonData, isConnected, connect } = useWalletButtons();
 * ```
 *
 * - `buttons` — array of all 40+ wallet configs.
 * - `getWalletButtonData(id)` — look up a single wallet's config.
 * - `isConnected(id)` — check if a wallet is currently connected.
 * - `connect(id)` — trigger a connection flow via the core connector.
 */
export declare function useWalletButtons(connector?: Connector): {
    /** Full array of resolved wallet button data. */
    buttons: WalletButtonData[];
    /** Look up a single wallet's config by ID. */
    getWalletButtonData: (walletId: string) => WalletButtonData | null;
    /** Whether a wallet is currently connected. */
    isConnected: (walletId: string) => boolean;
    /** Trigger a connection for the given wallet ID. */
    connect: (walletId: string) => Promise<void>;
};
//# sourceMappingURL=useWalletButtons.d.ts.map