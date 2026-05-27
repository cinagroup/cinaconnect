/**
 * Type definitions for @cinacoin/vue
 */

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

/** Cinacoin configuration. */
export interface CinacoinConfig {
  projectId?: string;
  chains?: ChainConfig[];
  theme?: {
    mode?: ThemeMode;
    variables?: Record<string, string>;
  };
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons?: string[];
  };
  recommendedWallets?: string[];
}

/** Context value provided by CinacoinProvider. */
export interface CinacoinContext {
  config: CinacoinConfig;
  connectors: import('vue').Ref<Connector[]>;
  account: import('vue').Ref<AccountState>;
  status: import('vue').Ref<'disconnected' | 'connecting' | 'connected' | 'error'>;
  connect: (connectorId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
  isSwitchingChain: import('vue').Ref<boolean>;
}

/** Injection key for Cinacoin context. */
export const ONCHAINUX_KEY = Symbol('cinacoin');
