/**
 * Result of a successful wallet connection.
 */
export interface ConnectionResult {
  /** Connected account addresses */
  accounts: string[];
  /** Chain ID the wallet is connected to */
  chainId: string;
  /** Provider instance or session reference */
  provider?: unknown;
}

/**
 * Event map for connector lifecycle and state changes.
 */
export interface ConnectorEvents {
  /** Emitted when accounts change */
  accountsChanged: (accounts: string[]) => void;
  /** Emitted when chain changes */
  chainChanged: (chainId: string) => void;
  /** Emitted when the wallet disconnects */
  disconnect: (error?: Error) => void;
  /** Emitted on any state change */
  stateChange: (state: Record<string, unknown>) => void;
}

/**
 * Configuration and lifecycle contract for a custom wallet connector.
 *
 * Implement this interface to integrate any wallet with the Cinacoin
 * connector ecosystem.
 */
export interface ConnectorConfig {
  /** Unique identifier for this connector (e.g. "injected", "walletconnect", "qr") */
  id: string;
  /** Human-readable name displayed in UI */
  name: string;
  /** Icon URL or data URI shown in connector pickers */
  icon: string;
  /** Connector category */
  type: 'injected' | 'qr' | 'walletconnect' | 'custom';

  /**
   * Initialize the connector (e.g. set up listeners, prepare SDK).
   * Called once before any connection attempt.
   */
  init(): Promise<void>;

  /**
   * Establish a connection to the wallet.
   * @param params Connector-specific connection parameters
   * @returns Connection result with accounts and chain info
   */
  connect(params?: Record<string, unknown>): Promise<ConnectionResult>;

  /**
   * Tear down the active connection.
   */
  disconnect(): Promise<void>;

  /**
   * Send a JSON-RPC request through the connected wallet.
   * @param args Method name and optional params
   * @returns Promise resolving to the RPC response
   */
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;

  /**
   * Subscribe to connector events.
   * @param event Event name
   * @param handler Callback invoked when the event fires
   */
  on<E extends keyof ConnectorEvents>(event: E, handler: ConnectorEvents[E]): void;
  on(event: string, handler: (...args: unknown[]) => void): void;

  /**
   * Unsubscribe from connector events.
   * @param event Event name
   * @param handler Previously registered callback
   */
  off<E extends keyof ConnectorEvents>(event: E, handler: ConnectorEvents[E]): void;
  off(event: string, handler: (...args: unknown[]) => void): void;

  /**
   * Get the list of connected account addresses.
   * @returns Array of hex-prefixed account addresses
   */
  getAccounts(): Promise<string[]>;

  /**
   * Get the current chain ID.
   * @returns Hex-encoded chain ID string (e.g. "0x1")
   */
  getChainId(): Promise<string>;

  /**
   * Check whether this connector is currently available in the environment.
   * @returns true if the wallet/provider is accessible
   */
  isAvailable(): boolean;
}
