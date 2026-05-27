import { type ReactNode } from 'react';
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
/** Wallet connector interface. */
export interface Connector {
    id: string;
    name: string;
    icon?: string;
    type: 'injected' | 'walletconnect' | 'coinbase' | 'email' | 'social';
    installed?: boolean;
}
/** Account information. */
export interface AccountState {
    address: string | null;
    balance: string;
    chainId: number | null;
    chainSymbol: string;
    ensName?: string;
}
/** Cinacoin configuration passed to the provider. */
export interface CinacoinConfig {
    /** Project ID (for analytics / relay). */
    projectId?: string;
    /** Supported chains. */
    chains?: ChainConfig[];
    /** Theme configuration. */
    theme?: {
        mode?: ThemeMode;
        /** Optional CSS variable overrides. */
        variables?: Record<string, string>;
    };
    /** App metadata. */
    metadata?: {
        name: string;
        description: string;
        url: string;
        icons?: string[];
    };
    /** Recommended wallet IDs (for ordering in UI). */
    recommendedWallets?: string[];
}
/** Context value exposed by CinacoinProvider. */
export interface CinacoinContextValue {
    /** Current configuration. */
    config: CinacoinConfig;
    /** Available connectors. */
    connectors: Connector[];
    /** Current account state. */
    account: AccountState;
    /** Current connection status. */
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    /** Connect to a wallet by connector ID. */
    connect: (connectorId: string) => Promise<void>;
    /** Disconnect the current wallet. */
    disconnect: () => Promise<void>;
    /** Switch the active chain. */
    switchChain: (chainId: number) => Promise<void>;
    /** Whether a chain switch is in progress. */
    isSwitchingChain: boolean;
}
/** Hook to access the Cinacoin context. Throws if used outside provider. */
export declare function useCinacoinContext(): CinacoinContextValue;
/** Provider props. */
export interface CinacoinProviderProps {
    config: CinacoinConfig;
    children: ReactNode;
}
/**
 * CinacoinProvider — React context provider for Cinacoin.
 *
 * Wraps the app and provides chain state, connection methods, and theming.
 *
 * ```tsx
 * <CinacoinProvider config={{ chains: [...], theme: { mode: 'dark' } }}>
 *   <App />
 * </CinacoinProvider>
 * ```
 */
export declare function CinacoinProvider({ config, children }: CinacoinProviderProps): JSX.Element;
//# sourceMappingURL=OnChainUXProvider.d.ts.map