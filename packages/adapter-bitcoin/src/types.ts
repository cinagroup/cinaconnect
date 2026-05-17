/**
 * Bitcoin-specific network identifiers used across wallet connectors.
 */
export type BitcoinNetwork = 'mainnet' | 'testnet' | 'testnet4' | 'signet' | 'regtest';

/**
 * Supported feature flags that a Bitcoin connector may advertise.
 *
 * These keys drive UI capability discovery — a connector that does not list
 * `'bitcoin:sendTransfer'` should not be offered as a "send" option in pickers.
 */
export type BitcoinFeature =
  | 'bitcoin:connect'
  | 'bitcoin:signMessage'
  | 'bitcoin:signTransaction'
  | 'bitcoin:signPsbt'
  | 'bitcoin:sendTransfer'
  | 'bitcoin:sendBitcoin'
  | 'bitcoin:switchNetwork'
  | 'bitcoin:ordinals'
  | 'bitcoin:brc20'
  | 'bitcoin:runes';

/**
 * Platform environments a connector may run in.
 */
export type BitcoinPlatform = 'browser' | 'mobile' | 'extension';

/**
 * Shape of a Bitcoin provider injected by a wallet extension.
 *
 * Each wallet (Unisat, Leather, OKX, Xverse) exposes a slightly different
 * API; this interface captures the minimal common surface that our
 * connectors rely on.
 */
export interface BitcoinProvider {
  request: <T = unknown>(args: { method: string; params?: unknown[] }) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isUnisat?: boolean;
  isLeather?: boolean;
  isXverse?: boolean;
  isOkx?: boolean;
}

/**
 * Map of connector lifecycle and state-change events.
 */
export interface BitcoinConnectorEvents {
  /** Emitted when the set of connected accounts changes */
  accountsChanged: (accounts: string[]) => void;
  /** Emitted when the active network changes */
  networkChanged: (network: string) => void;
  /** Emitted when the wallet disconnects */
  disconnect: (error?: Error) => void;
}

/**
 * Connection result returned from {@link BitcoinConnector.connect}.
 */
export interface BitcoinConnectionResult {
  /** Connected Bitcoin address(es) */
  accounts: string[];
  /** Network the wallet is on */
  network: string;
  /** Raw provider reference */
  provider?: BitcoinProvider;
}

/**
 * Core interface every Bitcoin wallet connector must implement.
 *
 * Modeled after the EIP-6963 / WalletConnect discovery pattern, extended
 * with Bitcoin-native methods (signPsbt, sendBitcoin, etc.).
 *
 * @example
 * ```ts
 * const connector = new UnisatConnector();
 * if (connector.isAvailable()) {
 *   await connector.connect();
 *   const accounts = await connector.getAccounts();
 * }
 * ```
 */
export interface BitcoinConnector {
  /** Unique machine-readable id (e.g. "unisat", "leather", "xverse") */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Icon — SVG data URI, URL, or emoji */
  icon: string;
  /** Environments this connector works in */
  platforms: BitcoinPlatform[];
  /** Feature flags this connector supports */
  supportedFeatures: BitcoinFeature[];

  /**
   * Request connection / permission from the wallet.
   * @param params Optional connection params (e.g. preferred accounts)
   * @returns Connected accounts and network info
   */
  connect(params?: { accounts?: string[] }): Promise<BitcoinConnectionResult>;

  /**
   * Tear down the active connection.
   */
  disconnect(): Promise<void>;

  /**
   * Send a Bitcoin-native JSON-RPC request through the provider.
   * @param args Method name and optional parameters
   */
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;

  /**
   * Get the list of connected Bitcoin addresses.
   */
  getAccounts(): Promise<string[]>;

  /**
   * Get the current Bitcoin network.
   * @returns Network string: "mainnet", "testnet", "signet", etc.
   */
  getNetwork(): Promise<string>;

  /**
   * Switch the active Bitcoin network.
   * @param network Target network identifier
   */
  switchNetwork(network: string): Promise<void>;

  /**
   * Sign a message with a Bitcoin address.
   * @param params Message text and signing address
   * @returns Signature (base64 or hex depending on wallet)
   */
  signMessage(params: { message: string; address: string }): Promise<{ signature: string }>;

  /**
   * Sign a PSBT (Partially Signed Bitcoin Transaction).
   * @param params Base64-encoded PSBT and optional input indices to sign
   * @returns Base64-encoded signed (or partially signed) PSBT
   */
  signPsbt(params: { psbt: string; signInputs?: Record<number, number[]> }): Promise<{ psbt: string }>;

  /**
   * Send Bitcoin from the connected wallet to a recipient.
   * @param params Recipient address, amount (satoshi), optional fee rate
   * @returns Transaction ID of the broadcasted transaction
   */
  sendTransfer(params: {
    recipient: string;
    amount: number;
    feeRate?: number;
  }): Promise<{ txid: string }>;

  /**
   * Whether the connector's provider is currently accessible.
   */
  isAvailable(): boolean;

  /**
   * Subscribe to connector events.
   */
  on<E extends keyof BitcoinConnectorEvents>(
    event: E,
    handler: BitcoinConnectorEvents[E]
  ): void;
  on(event: string, handler: (...args: unknown[]) => void): void;

  /**
   * Unsubscribe from connector events.
   */
  off<E extends keyof BitcoinConnectorEvents>(
    event: E,
    handler: BitcoinConnectorEvents[E]
  ): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * EIP-6963–style provider announcement payload for Bitcoin wallets.
 */
export interface EIP6963BitcoinProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: BitcoinProvider;
}
