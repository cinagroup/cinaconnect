/**
 * Hook: useWalletButtons
 *
 * Provides pre-configured wallet button data for 40+ wallets and
 * connection-state helpers backed by @cinacoin/core-sdk.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWalletById } from '@cinacoin/explorer';
// ---------------------------------------------------------------------------
// Wallet icon source — uses @cinacoin/explorer registry icons by default.
// Fallback CDN icons are provided for wallets not yet in the registry.
// ---------------------------------------------------------------------------
const ICON_CDN = 'https://assets.cinacoin.dev/wallets';
/**
 * Master list of supported wallets with icon and brand-color overrides.
 *
 * When a wallet is registered in @cinacoin/explorer its metadata
 * (name, icon) takes precedence. The entries below serve two purposes:
 *
 * 1. Provide a fallback icon URL when the explorer doesn't have the wallet yet.
 * 2. Supply official brand colors for the `brand` variant.
 */
const WALLET_REGISTRY = [
    { walletId: 'metamask', name: 'MetaMask', brandColor: 'F6851B' },
    { walletId: 'walletconnect', name: 'WalletConnect', brandColor: '3B99FC' },
    { walletId: 'coinbase', name: 'Coinbase Wallet', brandColor: '0052FF' },
    { walletId: 'rainbow', name: 'Rainbow', brandColor: '001E59' },
    { walletId: 'trust', name: 'Trust Wallet', brandColor: '3375BB' },
    { walletId: 'phantom', name: 'Phantom', brandColor: 'AB9FF2' },
    { walletId: 'ledger', name: 'Ledger', brandColor: '000000' },
    { walletId: 'trezor', name: 'Trezor', brandColor: '28A745' },
    { walletId: 'brave', name: 'Brave Wallet', brandColor: 'FB542B' },
    { walletId: 'zerion', name: 'Zerion', brandColor: '2962EF' },
    { walletId: 'imtoken', name: 'imToken', brandColor: '0A75F5' },
    { walletId: 'tokenpocket', name: 'TokenPocket', brandColor: '2985CE' },
    { walletId: 'onekey', name: 'OneKey', brandColor: '1A73E8' },
    { walletId: 'safe', name: 'Safe{Wallet}', brandColor: '12FF80' },
    { walletId: 'rabby', name: 'Rabby', brandColor: '4D9CF5' },
    { walletId: 'frame', name: 'Frame', brandColor: '1A1A1A' },
    { walletId: 'exodus', name: 'Exodus', brandColor: '8B5CF6' },
    { walletId: 'bitget', name: 'Bitget Wallet', brandColor: '00D4AA' },
    { walletId: 'okx', name: 'OKX Wallet', brandColor: '000000' },
    { walletId: 'bybit', name: 'Bybit Web3 Wallet', brandColor: 'F7A600' },
    { walletId: 'binance', name: 'Binance Web3 Wallet', brandColor: 'F0B90B' },
    { walletId: 'kraken', name: 'Kraken Wallet', brandColor: '5741D9' },
    { walletId: 'frontier', name: 'Frontier', brandColor: 'FF4949' },
    { walletId: 'math', name: 'Math Wallet', brandColor: '06C090' },
    { walletId: 'atomic', name: 'Atomic Wallet', brandColor: '6B46C1' },
    { walletId: 'guarda', name: 'Guarda', brandColor: '00D09C' },
    { walletId: 'ambire', name: 'Ambire', brandColor: 'F97316' },
    { walletId: 'taho', name: 'Taho', brandColor: 'F05033' },
    { walletId: 'subwallet', name: 'SubWallet', brandColor: 'E8007B' },
    { walletId: 'nova', name: 'Nova Wallet', brandColor: '3859F0' },
    { walletId: 'talisman', name: 'Talisman', brandColor: 'FF0420' },
    { walletId: 'polkadotjs', name: 'Polkadot{.js}', brandColor: 'E6007A' },
    { walletId: 'xdefi', name: 'XDEFI', brandColor: 'F4C430' },
    { walletId: 'unstoppable', name: 'Unstoppable', brandColor: '1A73E8' },
    { walletId: 'clrfund', name: 'clr.fund', brandColor: '10B981' },
    { walletId: 'sequence', name: 'Sequence', brandColor: '0051D6' },
    { walletId: 'particle', name: 'Particle Network', brandColor: '6C5DD3' },
    { walletId: 'dynamic', name: 'Dynamic', brandColor: '6D28D9' },
    { walletId: 'privy', name: 'Privy', brandColor: 'F26522' },
    { walletId: 'web3auth', name: 'Web3Auth', brandColor: '6D28D9' },
    { walletId: 'magic', name: 'Magic', brandColor: '6366F1' },
    { walletId: 'arcana', name: 'Arcana Auth', brandColor: 'EE4B2B' },
    { walletId: 'turnkey', name: 'Turnkey', brandColor: '18181B' },
    { walletId: 'lit', name: 'Lit Protocol', brandColor: '6366F1' },
];
/**
 * Resolve button data for a single wallet.
 */
function resolveWalletData(walletId) {
    // Try the explorer registry first.
    const registry = getWalletById(walletId);
    if (registry) {
        const master = WALLET_REGISTRY.find((w) => w.walletId === walletId);
        return {
            walletId,
            name: registry.name,
            icon: registry.icon,
            brandColor: master?.brandColor,
        };
    }
    // Fall back to master list with CDN icon.
    const master = WALLET_REGISTRY.find((w) => w.walletId === walletId);
    if (!master)
        return null;
    return {
        walletId,
        name: master.name ?? walletId,
        icon: `${ICON_CDN}/${walletId}.svg`,
        brandColor: master.brandColor,
    };
}
// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
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
export function useWalletButtons(connector) {
    // Track connected wallet IDs.
    const [connectedWallets, setConnectedWallets] = useState(new Set());
    const getWalletButtonData = useCallback((walletId) => resolveWalletData(walletId), []);
    const buttons = useMemo(() => WALLET_REGISTRY.map((w) => getWalletButtonData(w.walletId))
        .filter((b) => b !== null), [getWalletButtonData]);
    const isConnected = useCallback((walletId) => connectedWallets.has(walletId), [connectedWallets]);
    // If a connector instance is provided, listen to its events.
    useEffect(() => {
        if (!connector)
            return;
        const handleConnect = () => {
            // Mark the currently connected wallet.
            setConnectedWallets(new Set(['current']));
        };
        const handleDisconnect = () => {
            setConnectedWallets(new Set());
        };
        connector.on('connect', handleConnect);
        connector.on('disconnect', handleDisconnect);
        return () => {
            connector.off('connect', handleConnect);
            connector.off('disconnect', handleDisconnect);
        };
    }, [connector]);
    const connect = useCallback(async (walletId) => {
        if (connector) {
            await connector.connect({ walletId });
        }
    }, [connector]);
    return {
        /** Full array of resolved wallet button data. */
        buttons,
        /** Look up a single wallet's config by ID. */
        getWalletButtonData,
        /** Whether a wallet is currently connected. */
        isConnected,
        /** Trigger a connection for the given wallet ID. */
        connect,
    };
}
//# sourceMappingURL=useWalletButtons.js.map