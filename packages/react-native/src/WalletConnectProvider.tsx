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
 * This provider bridges the low-level WC v2 SDK with CinaCoin React Native components.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { Linking, Platform } from 'react-native';

// Core WC v2 types (from the cinacoin walletconnect-v2 package)
import type { Session, WcClientEvent } from '@cinacoin/walletconnect-v2';
import {
  WcSessionManager,
  createPairing,
  parseWcUri,
  getDefaultRequiredNamespaces,
  buildSendTransaction,
  buildPersonalSign,
  getWalletById,
  WALLET_REGISTRY,
  buildWalletDeepLink,
  buildWalletUniversalLink,
  WC_METHODS,
} from '@cinacoin/walletconnect-v2';
import type { AppMetadata } from '@cinacoin/core-sdk';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WalletConnectConfig {
  projectId: string;
  relayUrl?: string;
  metadata: AppMetadata;
  chains?: string[];          // CAIP-2, e.g. ["eip155:1"]
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
  connectWithUri: (uri: string) => Promise<void>;
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
  sendTransaction: (tx: { to: string; value?: string; data?: string }) => Promise<string>;
  /** Switch to a different chain. */
  switchChain: (chainId: number) => Promise<void>;
}

// ─── Default Deep Links ─────────────────────────────────────────────────────

export const WALLET_DEEP_LINKS: Record<string, WalletDeepLink> = {
  metamask: {
    walletId: 'metamask',
    scheme: 'metamask://',
    universalLink: 'https://metamask.app.link',
    appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
    packageName: 'io.metamask',
  },
  rainbow: {
    walletId: 'rainbow',
    scheme: 'rainbow://',
    universalLink: 'https://rnbwapp.com',
    appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
    packageName: 'me.rainbow',
  },
  trust: {
    walletId: 'trust',
    scheme: 'trust://',
    universalLink: 'https://link.trustwallet.com',
    appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    packageName: 'com.wallet.crypto.trustapp',
  },
  coinbase: {
    walletId: 'coinbase',
    scheme: 'cbwallet://',
    universalLink: 'https://go.cb-w.com',
    appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
    packageName: 'org.toshi',
  },
  walletconnect: {
    walletId: 'walletconnect',
    scheme: 'wc://',
    universalLink: 'https://walletconnect.com',
  },
  phantom: {
    walletId: 'phantom',
    scheme: 'phantom://',
    universalLink: 'https://phantom.app',
    appStoreUrl: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phantom.app',
    packageName: 'com.phantom.app',
  },
  zerion: {
    walletId: 'zerion',
    scheme: 'zerion://',
    universalLink: 'https://zerion.io',
    appStoreUrl: 'https://apps.apple.com/app/zerion-defi-wallet/id1456732032',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.zerion.android',
    packageName: 'io.zerion.android',
  },
};

// ─── Context ────────────────────────────────────────────────────────────────

const WalletConnectContext = createContext<WalletConnectContextValue | null>(null);

/** Hook to access the WalletConnect context. Throws if used outside provider. */
export function useWalletConnect(): WalletConnectContextValue {
  const ctx = useContext(WalletConnectContext);
  if (!ctx) {
    throw new Error('useWalletConnect must be used within <WalletConnectProvider>');
  }
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

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
export function WalletConnectProvider({ config, children }: WalletConnectProviderProps) {
  const [state, setState] = useState<WalletConnectState>({
    session: null,
    pairingUri: null,
    connecting: false,
    error: null,
    balance: null,
  });

  const sessionManagerRef = useRef<WcSessionManager | null>(null);
  const currentConfigRef = useRef<WalletConnectConfig>(config);

  // ── Initialize ────────────────────────────────────────────────────────────

  const initialize = useCallback(async (cfg: WalletConnectConfig) => {
    currentConfigRef.current = cfg;

    // Destroy previous session manager
    sessionManagerRef.current?.disconnect().catch(() => {});
    sessionManagerRef.current = null;

    const chains = cfg.chains ?? ['eip155:1'];
    sessionManagerRef.current = new WcSessionManager({
      relayUrl: cfg.relayUrl ?? `wss://relay.walletconnect.com?projectId=${cfg.projectId}`,
      metadata: cfg.metadata,
      requiredChains: chains,
    });

    // Subscribe to WC events
    sessionManagerRef.current.on('wcEvent', (event: unknown) => {
      const evt = event as WcClientEvent;
      switch (evt.type) {
        case 'connected': {
          const session = (evt as { session: Session }).session;
          setState(prev => ({ ...prev, session, connecting: false, error: null }));
          break;
        }
        case 'disconnected':
          setState(prev => ({
            ...prev,
            session: null,
            pairingUri: null,
            balance: null,
            connecting: false,
          }));
          break;
        case 'error':
          setState(prev => ({
            ...prev,
            connecting: false,
            error: (evt as { error?: Error }).error?.message ?? 'Unknown error',
          }));
          break;
      }
    });
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    initialize(config).catch(() => {});
    return () => {
      sessionManagerRef.current?.disconnect().catch(() => {});
    };
  }, [initialize]);

  // ── Pairing ───────────────────────────────────────────────────────────────

  const createPairingUri = useCallback(async (): Promise<string> => {
    if (!sessionManagerRef.current) {
      throw new Error('WalletConnectProvider not initialized — call initialize() first');
    }
    const uri = await sessionManagerRef.current.initiatePairing();
    setState(prev => ({ ...prev, pairingUri: uri, error: null }));
    return uri;
  }, []);

  const connectWithUri = useCallback(async (uri: string): Promise<void> => {
    if (!sessionManagerRef.current) {
      throw new Error('WalletConnectProvider not initialized');
    }
    setState(prev => ({ ...prev, connecting: true, error: null }));
    try {
      const session = await sessionManagerRef.current.connectWithUri(uri);
      setState(prev => ({ ...prev, session, pairingUri: null, connecting: false, error: null }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        connecting: false,
        error: (err as Error).message ?? 'Connection failed',
      }));
      throw err;
    }
  }, []);

  // ── Deep Link ─────────────────────────────────────────────────────────────

  const openWalletDeepLink = useCallback(async (walletId: string): Promise<void> => {
    const uri = state.pairingUri;
    if (!uri) {
      throw new Error('No pairing URI available — call createPairingUri() first');
    }

    const deepLink = buildWalletDeepLink(walletId, uri);
    const universalLink = buildWalletUniversalLink(walletId, uri);

    // Try deep link first
    if (deepLink) {
      try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
          return;
        }
      } catch {
        // Fall through
      }
    }

    // Try universal link
    if (universalLink) {
      try {
        await Linking.openURL(universalLink);
        return;
      } catch {
        // Fall through
      }
    }

    // Suggest app store
    const walletLink = WALLET_DEEP_LINKS[walletId];
    const storeUrl = Platform.OS === 'ios' ? walletLink?.appStoreUrl : walletLink?.playStoreUrl;
    if (storeUrl) {
      await Linking.openURL(storeUrl);
    }
  }, [state.pairingUri]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(async (): Promise<void> => {
    await sessionManagerRef.current?.disconnect();
    setState(prev => ({
      ...prev,
      session: null,
      pairingUri: null,
      balance: null,
      connecting: false,
    }));
  }, []);

  // ── JSON-RPC ──────────────────────────────────────────────────────────────

  const request = useCallback(async <T = unknown>(method: string, params: unknown): Promise<T> => {
    if (!sessionManagerRef.current?.isConnected()) {
      throw new Error('No active session — connect first');
    }
    return sessionManagerRef.current.request<T>(method, params);
  }, []);

  // ── Balance Fetching ──────────────────────────────────────────────────────

  const fetchBalance = useCallback(async (): Promise<BalanceState> => {
    if (!state.session || state.session.accounts.length === 0) {
      throw new Error('No connected account');
    }

    // Extract chain ID from CAIP-2 account
    const account = state.session.accounts[0];
    const parts = account.split(':');
    const chainId = parts.length >= 2 ? parseInt(parts[1], 10) : 1;
    const address = parts.length >= 3 ? parts[2] : parts[0];

    // Build eth_call for eth_getBalance
    const balanceHex = await request<string>('eth_getBalance', [address, 'latest']);
    const balanceWei = BigInt(balanceHex);
    const balanceEth = Number(balanceWei) / 1e18;

    const result: BalanceState = {
      balance: balanceEth.toFixed(4),
      symbol: 'ETH',
      decimals: 18,
      raw: balanceHex,
    };

    setState(prev => ({ ...prev, balance: result }));
    return result;
  }, [state.session, request]);

  // ── Signing ───────────────────────────────────────────────────────────────

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!state.session || state.session.accounts.length === 0) {
      throw new Error('No connected account');
    }

    const account = state.session.accounts[0];
    const address = account.includes(':') ? account.split(':').pop()! : account;

    const params = buildPersonalSign(message, address);
    return request<string>('personal_sign', params);
  }, [state.session, request]);

  const sendTransaction = useCallback(
    async (tx: { to: string; value?: string; data?: string }): Promise<string> => {
      if (!state.session || state.session.accounts.length === 0) {
        throw new Error('No connected account');
      }

      const account = state.session.accounts[0];
      const from = account.includes(':') ? account.split(':').pop()! : account;

      const params = buildSendTransaction({
        from,
        to: tx.to,
        value: tx.value ?? '0x0',
        data: tx.data ?? '0x',
      });

      return request<string>('eth_sendTransaction', params);
    },
    [state.session, request],
  );

  // ── Chain Switch ──────────────────────────────────────────────────────────

  const switchChain = useCallback(
    async (chainId: number): Promise<void> => {
      const hexChainId = '0x' + chainId.toString(16);
      await request('wallet_switchEthereumChain', [{ chainId: hexChainId }]);
    },
    [request],
  );

  // ── Context Value ─────────────────────────────────────────────────────────

  const value = useMemo<WalletConnectContextValue>(
    () => ({
      ...state,
      initialize,
      createPairingUri,
      connectWithUri,
      openWalletDeepLink,
      disconnect,
      request,
      fetchBalance,
      signMessage,
      sendTransaction,
      switchChain,
    }),
    [
      state,
      initialize,
      createPairingUri,
      connectWithUri,
      openWalletDeepLink,
      disconnect,
      request,
      fetchBalance,
      signMessage,
      sendTransaction,
      switchChain,
    ],
  );

  return (
    <WalletConnectContext.Provider value={value}>
      {children}
    </WalletConnectContext.Provider>
  );
}

export default WalletConnectProvider;
