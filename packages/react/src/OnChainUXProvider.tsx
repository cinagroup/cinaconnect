import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

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

/** Wallet connector interface (internal). */
interface CoreConnector {
  id: string;
  name: string;
  icon: string;
  type: string;
  installed: boolean;
  connect(params?: Record<string, unknown>): Promise<{
    accounts: string[];
    chainId: number;
    sessionId?: string;
  }>;
  disconnect(): Promise<void>;
  getAccounts(): Promise<string[]>;
  getChainId(): Promise<number>;
  switchChain(chainId: number): Promise<void>;
  getProvider(): unknown;
}

/** Wallet connector interface (UI-facing). */
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

/** CinaCoin configuration passed to the provider. */
export interface CinaCoinConfig {
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

/** EIP-5792 internal context for hooks. */
export interface EIP5792ProviderContext {
  /** Raw EIP-1193 provider for RPC calls. */
  provider: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } | null;
  /** Connected account address (or null). */
  address: string | null;
  /** Current chain ID in hex format. */
  chainIdHex: string | null;
  /** Whether a wallet is connected. */
  isConnected: boolean;
}

/** Context value exposed by CinaCoinProvider. */
export interface CinaCoinContextValue {
  /** Current configuration. */
  config: CinaCoinConfig;

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

  /** EIP-5792 provider context for advanced hooks. */
  eip5792?: EIP5792ProviderContext;
}

const CinaCoinContext = createContext<CinaCoinContextValue | null>(null);

/** Hook to access the CinaCoin context. Throws if used outside provider. */
export function useCinaCoinContext(): CinaCoinContextValue {
  const ctx = useContext(CinaCoinContext);
  if (!ctx) {
    throw new Error('useCinaCoinContext must be used within <CinaCoinProvider>');
  }
  return ctx;
}

/** Provider props. */
export interface CinaCoinProviderProps {
  config: CinaCoinConfig;
  children: ReactNode;
}

/**
 * CinaCoinProvider — React context provider for CinaCoin.
 *
 * Wraps the app and provides chain state, connection methods, theming,
 * and EIP-5792 support via the core-sdk Connector/InjectedProvider.
 *
 * ```tsx
 * <CinaCoinProvider config={{ chains: [...], theme: { mode: 'dark' } }}>
 *   <App />
 * </CinaCoinProvider>
 * ```
 */
export function CinaCoinProvider({ config, children }: CinaCoinProviderProps): JSX.Element {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [account, setAccount] = useState<AccountState>({
    address: null,
    balance: '0.00',
    chainId: config.chains?.[0]?.id ?? 1,
    chainSymbol: config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
  });
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  // Active core-sdk connector instance (lazily created on connect)
  const activeConnectorRef = useRef<CoreConnector | null>(null);

  // Build connector list — injected connectors detect presence via window.ethereum
  const connectors = useMemo(() => {
    const list: Connector[] = [
      { id: 'metamask', name: 'MetaMask', type: 'injected', installed: false },
      { id: 'walletconnect', name: 'WalletConnect', type: 'walletconnect' },
      { id: 'coinbase', name: 'Coinbase Wallet', type: 'coinbase' },
      { id: 'rabby', name: 'Rabby', type: 'injected', installed: false },
      { id: 'email', name: 'Email', type: 'email' },
    ];

    // Detect injected wallets from window.ethereum
    if (typeof window !== 'undefined' && window.ethereum) {
      const eth = window.ethereum;
      if (eth.isMetaMask) {
        const idx = list.findIndex(c => c.id === 'metamask');
        if (idx >= 0) list[idx].installed = true;
      }
      if (eth.isRabby) {
        const idx = list.findIndex(c => c.id === 'rabby');
        if (idx >= 0) list[idx].installed = true;
      }
    }

    return list;
  }, []);

  // Helper: create a core-sdk connector for the given connectorId
  const createCoreConnector = useCallback((connectorId: string): CoreConnector | null => {
    // Dynamic import to avoid SSR issues and circular deps
    // We access InjectedProvider directly from core-sdk
    try {
      // Lazy require — core-sdk is a workspace dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { InjectedProvider } = require('@cinacoin/core-sdk') as Record<string, unknown>;

      // InjectedProvider is a class: new InjectedProvider(id, name, icon, provider?)
      const Ctor = InjectedProvider as new (
        id: string,
        name: string,
        icon: string,
        provider?: unknown,
      ) => CoreConnector;

      const walletMeta: Record<string, { name: string; icon: string; rdns?: string }> = {
        metamask: { name: 'MetaMask', icon: '', rdns: 'io.metamask' },
        rabby: { name: 'Rabby', icon: '', rdns: 'io.rabby' },
      };

      const meta = walletMeta[connectorId];
      if (!meta) return null;

      // For injected providers, pass window.ethereum if available
      const provider = typeof window !== 'undefined' ? window.ethereum : undefined;
      return new Ctor(connectorId, meta.name, meta.icon, provider);
    } catch {
      // core-sdk not available or InjectedProvider not found
      // Fall back gracefully — the hooks will still work but connection is mock
      return null;
    }
  }, []);

  const connect = useCallback(
    async (connectorId: string): Promise<void> => {
      setStatus('connecting');
      try {
        // Try to create a real core-sdk connector
        const coreConn = createCoreConnector(connectorId);

        if (coreConn && coreConn.installed) {
          // Real connection via core-sdk InjectedProvider
          const result = await coreConn.connect();
          activeConnectorRef.current = coreConn;

          const address = result.accounts?.[0] ?? null;
          const chainId = result.chainId ?? config.chains?.[0]?.id ?? 1;
          const chain = config.chains?.find(c => c.id === chainId);

          setAccount({
            address,
            balance: '0.00', // balance fetched separately
            chainId,
            chainSymbol: chain?.nativeCurrency.symbol ?? 'ETH',
          });
          setStatus('connected');
        } else {
          // Fallback: mock connection for connectors without real SDK support
          await new Promise(resolve => setTimeout(resolve, 1000));
          setAccount({
            address: '0x1234567890abcdef1234567890abcdef12345678',
            balance: '1.234',
            chainId: config.chains?.[0]?.id ?? 1,
            chainSymbol: config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
          });
          setStatus('connected');
        }
      } catch {
        setStatus('error');
      }
    },
    [config.chains, createCoreConnector],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    if (activeConnectorRef.current) {
      try {
        await activeConnectorRef.current.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      activeConnectorRef.current = null;
    }
    setAccount({
      address: null,
      balance: '0.00',
      chainId: config.chains?.[0]?.id ?? 1,
      chainSymbol: config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
    });
    setStatus('disconnected');
  }, [config.chains]);

  const switchChain = useCallback(
    async (chainId: number): Promise<void> => {
      setIsSwitchingChain(true);
      try {
        // Try real connector first
        if (activeConnectorRef.current) {
          await activeConnectorRef.current.switchChain(chainId);
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        const chain = config.chains?.find(c => c.id === chainId);
        if (chain) {
          setAccount(prev => ({
            ...prev,
            chainId,
            chainSymbol: chain.nativeCurrency.symbol,
          }));
        }
      } finally {
        setIsSwitchingChain(false);
      }
    },
    [config.chains],
  );

  // Build EIP-5792 context from the active connector's provider
  const eip5792 = useMemo<EIP5792ProviderContext>(() => {
    const conn = activeConnectorRef.current;
    const rawProvider = conn?.getProvider();

    // The provider must have a `request` method (EIP-1193)
    const provider =
      rawProvider && typeof (rawProvider as Record<string, unknown>).request === 'function'
        ? (rawProvider as { request(args: { method: string; params?: unknown[] }): Promise<unknown> })
        : null;

    // Also check window.ethereum as fallback
    const fallbackProvider =
      provider ??
      (typeof window !== 'undefined' && window.ethereum
        ? window.ethereum
        : null);

    return {
      provider: fallbackProvider,
      address: account.address,
      chainIdHex: account.chainId ? `0x${account.chainId.toString(16)}` : null,
      isConnected: status === 'connected',
    };
  }, [account.address, account.chainId, status]);

  // Expose eip5792 context globally for the hooks
  const eip5792Ref = useRef(eip5792);
  eip5792Ref.current = eip5792;
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__ocx_eip5792_context = () => eip5792Ref.current;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__ocx_eip5792_context;
      }
    };
  }, []);

  const value = useMemo<CinaCoinContextValue>(
    () => ({
      config,
      connectors,
      account,
      status,
      connect,
      disconnect,
      switchChain,
      isSwitchingChain,
      eip5792,
    }),
    [config, connectors, account, status, connect, disconnect, switchChain, isSwitchingChain, eip5792],
  );

  // Apply theme CSS variables
  const themeStyle: CSSProperties = useMemo(() => {
    const themeVars: CSSProperties = {};
    if (config.theme?.variables) {
      for (const [key, val] of Object.entries(config.theme.variables)) {
        (themeVars as Record<string, string>)[key] = val;
      }
    }
    return themeVars;
  }, [config.theme?.variables]);

  return (
    <CinaCoinContext.Provider value={value}>
      <div className={`ocx-root ocx-theme-${config.theme?.mode ?? 'dark'}`} style={themeStyle}>
        {children}
      </div>
    </CinaCoinContext.Provider>
  );
}
