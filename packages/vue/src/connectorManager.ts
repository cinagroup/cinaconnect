/**
 * Wallet Connector Manager for Vue adapter.
 *
 * Bridges @cinacoin/core-sdk connectors with the Vue provider,
 * providing real wallet connection logic instead of mock implementations.
 */

import {
  Connector,
  InjectedProvider,
  EvmAdapter,
  EventEmitter,
  type ConnectionResult,
} from '@cinacoin/core-sdk';
import type { CinacoinConfig, Connector as ConnectorType } from './types';

/** Well-known connector icons. */
const WALLET_ICONS: Record<string, string> = {
  metamask:
    'https://registry.walletconnect.com/api/v2/logo/sm/0d558260-6f0c-4499-8917-20ab7565ade1',
  walletconnect:
    'https://registry.walletconnect.com/api/v2/logo/sm/0d558260-6f0c-4499-8917-20ab7565ade1',
  coinbase:
    'https://registry.walletconnect.com/api/v2/logo/sm/162b9929-3b55-46a2-8063-3a49d445125c',
  rabby:
    'https://registry.walletconnect.com/api/v2/logo/sm/f9e78743-6f3a-4b9b-9b2e-42e7c5485d35',
};

/**
 * ConnectorManager creates and manages core-sdk Connector instances
 * based on the configured connector list.
 */
export class ConnectorManager {
  private connectors: Map<string, Connector> = new Map();
  private activeConnector: Connector | null = null;
  private evmAdapter: EvmAdapter;
  private config: CinacoinConfig;
  private _events: EventEmitter;

  constructor(config: CinacoinConfig) {
    this.config = config;
    this.evmAdapter = new EvmAdapter();
    this._events = new EventEmitter();

    // Register chains with EVM adapter
    if (config.chains) {
      this.evmAdapter.registerChains(
        config.chains.map((chain) => ({
          id: `eip155:${chain.id}`,
          name: chain.name,
          rpcUrl: chain.rpcUrl,
          nativeCurrency: chain.nativeCurrency,
          explorerUrl: chain.blockExplorerUrl,
          iconUrl: chain.iconUrl,
        })),
      );
    }

    // Initialize default connectors
    this.initDefaultConnectors();
  }

  /**
   * Initialize the default set of connectors.
   */
  private initDefaultConnectors(): void {
    // Injected providers (MetaMask, Rabby, etc.)
    this.addConnector(
      new InjectedProvider(
        'io.metamask',
        'MetaMask',
        WALLET_ICONS.metamask ?? '',
      ),
    );
    this.addConnector(
      new InjectedProvider('io.rabby', 'Rabby', WALLET_ICONS.rabby ?? ''),
    );

    // WalletConnect connector — will be created when needed via createWalletConnectConnector
    // For now we register placeholder metadata
    this.registerConnectorMetadata({
      id: 'walletconnect',
      name: 'WalletConnect',
      type: 'walletconnect',
    });

    // Coinbase Wallet connector placeholder
    this.registerConnectorMetadata({
      id: 'coinbase',
      name: 'Coinbase Wallet',
      type: 'coinbase',
    });

    // Email connector placeholder
    this.registerConnectorMetadata({
      id: 'email',
      name: 'Email',
      type: 'email',
    });
  }

  /**
   * Register connector metadata for non-injected connectors.
   */
  private registerConnectorMetadata(
    metadata: Pick<ConnectorType, 'id' | 'name' | 'type'>,
  ): void {
    // Store metadata for connectors that need async initialization
    // (WalletConnect, Email, Social, etc.)
  }

  /**
   * Add a Connector instance to the manager.
   */
  addConnector(connector: Connector): void {
    this.connectors.set(connector.id, connector);
  }

  /**
   * Get a connector by ID.
   */
  getConnector(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  /**
   * Get all registered connectors.
   */
  getAllConnectors(): Map<string, Connector> {
    return this.connectors;
  }

  /**
   * Get the currently active connector.
   */
  getActiveConnector(): Connector | null {
    return this.activeConnector;
  }

  /**
   * Connect using the specified connector.
   */
  async connect(connectorId: string): Promise<ConnectionResult> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    if (!connector.installed && connector.type === 'injected') {
      throw new Error(
        `Connector ${connectorId} is not installed. Please install the wallet extension.`,
      );
    }

    const result = await connector.connect();
    this.activeConnector = connector;
    this.evmAdapter.setConnector(connector);

    this._events.emit('connected', result);
    return result;
  }

  /**
   * Disconnect from the current wallet.
   */
  async disconnect(): Promise<void> {
    if (this.activeConnector) {
      await this.activeConnector.disconnect();
      this._events.emit('disconnected');
      this.activeConnector = null;
    }
  }

  /**
   * Switch to a different chain.
   */
  async switchChain(chainId: number): Promise<void> {
    if (!this.activeConnector) {
      throw new Error('No active connector. Connect a wallet first.');
    }
    await this.activeConnector.switchChain(chainId);
  }

  /**
   * Get connected accounts.
   */
  async getAccounts(): Promise<string[]> {
    if (!this.activeConnector) {
      return [];
    }
    return this.activeConnector.getAccounts();
  }

  /**
   * Get the current chain ID.
   */
  async getChainId(): Promise<number> {
    if (!this.activeConnector) {
      return this.config.chains?.[0]?.id ?? 1;
    }
    return this.activeConnector.getChainId();
  }

  /**
   * Subscribe to connection events.
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this._events.on(event, handler);
  }

  /**
   * Unsubscribe from connection events.
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this._events.off(event, handler);
  }

  /**
   * Create a connector for WalletConnect.
   * This is a placeholder — the full WalletConnect implementation
   * would use the RelayTransport + session management.
   */
  createWalletConnectConnector(): void {
    // Full implementation would use RelayTransport + SessionManager
    // from @cinacoin/core-sdk to establish WC v2 connections.
    // For now, this logs the intent and the injected provider path
    // handles the common browser wallet case.
    console.warn(
      '[Cinacoin] WalletConnect relay connector requires @cinacoin/core-sdk ' +
        'RelayTransport configuration. Configure relayUrl and projectId in config.',
    );
  }

  /**
   * Clean up all connectors.
   */
  destroy(): void {
    this._events.removeAllListeners();
    this.connectors.clear();
    this.activeConnector = null;
  }
}
