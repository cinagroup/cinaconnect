/**
 * CinacoinProvider — React Native context provider with real WalletConnect v2 integration.
 *
 * Wraps the app and provides chain state, connection methods, and theming.
 * Uses @cinacoin/walletconnect-v2 for real WC v2 protocol communication.
 */
import { type ReactNode } from 'react';
import type { Session } from '@cinacoin/walletconnect-v2';
import type { AppMetadata } from '@cinacoin/core-sdk';
/** Supported theme modes. */
export type ThemeMode = 'dark' | 'light' | 'minimal';
/** Chain configuration. */
export interface ChainConfig {
    id: number;
    name: string;
    rpcUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    blockExplorerUrl?: string;
    iconUrl?: string;
    testnet?: boolean;
}
/** Wallet connector. */
export interface Connector {
    id: string;
    name: string;
    icon?: string;
    type: 'injected' | 'walletconnect' | 'coinbase' | 'email' | 'social';
}
/** Wallet info with deep linking support. */
export interface WalletInfo {
    id: string;
    name: string;
    icon?: string;
    description?: string;
    deepLink?: string;
    universalLink?: string;
    appStoreUrl?: string;
    playStoreUrl?: string;
    supportsWalletConnect: boolean;
}
/** Account state. */
export interface AccountState {
    address: string | null;
    balance: string;
    chainId: number | null;
    chainSymbol: string;
    ensName?: string;
}
/** Configuration passed to provider. */
export interface CinacoinConfig {
    /** Relay server URL. */
    relayUrl?: string;
    /** Project ID. */
    projectId?: string;
    chains?: ChainConfig[];
    theme?: {
        mode?: ThemeMode;
        variables?: Record<string, string>;
    };
    metadata?: AppMetadata;
    recommendedWallets?: string[];
}
/** Context value. */
export interface CinacoinContextValue {
    config: CinacoinConfig;
    connectors: Connector[];
    wallets: WalletInfo[];
    account: AccountState;
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    /** Current WC v2 session, if connected. */
    session: Session | null;
    /** Active WC URI for QR display / deep linking. */
    wcUri: string | null;
    connect: (connectorId: string) => Promise<void>;
    disconnect: () => Promise<void>;
    switchChain: (chainId: number) => Promise<void>;
    isSwitchingChain: boolean;
    themeMode: ThemeMode;
    themeColors: ThemeColors;
    /** Create a new pairing and return the WC URI. */
    createPairing: () => Promise<string>;
    /** Connect using a WC v2 URI. */
    connectWithUri: (uri: string) => Promise<void>;
    /** Send a JSON-RPC request to the connected wallet. */
    request: <T = unknown>(method: string, params: unknown) => Promise<T>;
    /** Open a wallet app using deep linking. */
    openWallet: (walletId: string, uri: string) => Promise<void>;
}
/** Resolved theme color tokens. */
export interface ThemeColors {
    accent500: string;
    accentGlow: string;
    bgPrimary: string;
    bgSecondary: string;
    bgCard: string;
    bgCardHover: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
}
/** Hook to access Cinacoin context. Throws if used outside provider. */
export declare function useCinacoinContext(): CinacoinContextValue;
/** Provider props. */
export interface CinacoinProviderProps {
    config: CinacoinConfig;
    children: ReactNode;
}
/**
 * CinacoinProvider for React Native with real WC v2 support.
 */
export declare function CinacoinProvider({ config, children }: CinacoinProviderProps): JSX.Element;
//# sourceMappingURL=OnChainUXProvider.d.ts.map