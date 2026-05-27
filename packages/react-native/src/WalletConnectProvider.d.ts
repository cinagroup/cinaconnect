/**
 * WalletConnectProvider — Real WalletConnect v2 session management for React Native.
 *
 * Wraps @walletconnect/react-native-dapp (or the cinacoin core wrapper) to provide:
 * - Real pairing URI creation and QR display
 * - Deep-link wallet connection flow (MetaMask, Rainbow, Trust, Coinbase)
 * - Session lifecycle management (connect / disconnect / events)
 * - Balance fetching via on-chain RPC
 * - Transaction signing via WC v2 personal_sign / eth_sendTransaction
 *
 * This provider bridges the low-level WC v2 SDK with Cinacoin React Native components.
 */
import { type ReactNode } from 'react';
import type { Session } from '@cinacoin/walletconnect-v2';
import type { AppMetadata } from '@cinacoin/core-sdk';
export interface WalletConnectConfig {
    projectId: string;
    relayUrl?: string;
    metadata: AppMetadata;
    chains?: string[];
    optionalChains?: string[];
    methods?: string[];
    events?: string[];
}
export interface WalletDeepLink {
    walletId: string;
    scheme: string;
    universalLink?: string;
    appStoreUrl?: string;
    playStoreUrl?: string;
    packageName?: string;
}
export interface BalanceState {
    balance: string;
    symbol: string;
    decimals: number;
    raw: string | null;
}
export interface WalletConnectState {
    /** Raw WC v2 session, null when disconnected. */
    session: Session | null;
    /** Pairing URI for QR display or deep linking. */
    pairingUri: string | null;
    /** Whether we are in the process of connecting. */
    connecting: boolean;
    /** Error message if last operation failed. */
    error: string | null;
    /** Fetched balance for the connected account. */
    balance: BalanceState | null;
}
export interface WalletConnectContextValue extends WalletConnectState {
    /** Initialize / re-init the WC session manager. */
    initialize: (config: WalletConnectConfig) => Promise<void>;
    /** Create a new pairing and return the WC URI. */
    createPairingUri: () => Promise<string>;
    /** Connect using a pre-existing WC URI (from QR scan). */
    connectWithUri: (uri: string) => Promise<Session>;
    /** Open a wallet app via deep link with the current pairing URI. */
    openWalletDeepLink: (walletId: string) => Promise<void>;
    /** Disconnect and clean up the session. */
    disconnect: () => Promise<void>;
    /** Send a JSON-RPC request to the connected wallet. */
    request: <T = unknown>(method: string, params: unknown) => Promise<T>;
    /** Fetch the connected account's native balance. */
    fetchBalance: () => Promise<BalanceState>;
    /** Sign a message using personal_sign. */
    signMessage: (message: string) => Promise<string>;
    /** Send a transaction via eth_sendTransaction. */
    sendTransaction: (tx: {
        to: string;
        value?: string;
        data?: string;
    }) => Promise<string>;
    /** Switch to a different chain. */
    switchChain: (chainId: number) => Promise<void>;
}
export declare const WALLET_DEEP_LINKS: Record<string, WalletDeepLink>;
/** Hook to access the WalletConnect context. Throws if used outside provider. */
export declare function useWalletConnect(): WalletConnectContextValue;
export interface WalletConnectProviderProps {
    config: WalletConnectConfig;
    children: ReactNode;
}
/**
 * WalletConnectProvider — real WC v2 session manager for React Native.
 *
 * Usage:
 * ```tsx
 * <WalletConnectProvider config={{ projectId, metadata, chains: ['eip155:1'] }}>
 *   <App />
 * </WalletConnectProvider>
 * ```
 */
export declare function WalletConnectProvider({ config, children }: WalletConnectProviderProps): import("react/jsx-runtime").JSX.Element;
export default WalletConnectProvider;
//# sourceMappingURL=WalletConnectProvider.d.ts.map