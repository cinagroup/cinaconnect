import type { Connector } from '@cinacoin/core-sdk';
import type {
  XrplConnector,
  XrplPlatform,
  XrplFeature,
  XrplConnectionResult,
  XrplConnectorEvents,
  XrplProvider,
  XrplNetwork,
  XrpSendParams,
  AccountSettingsParams,
  TrustLineParams,
  NftMintParams,
  NftBurnParams,
} from './types';
import { XrplConnectorRegistry } from './types';
import { XamanConnector, announceXamanEIP6963 } from './connectors/xaman';

/**
 * XRP Ledger chain adapter for Cinacoin.
 *
 * Supports Xaman (formerly Xumm), Fireblocks, and Ledger.
 * Provides XRP transfers, account settings, trust lines,
 * and NFT minting/burning.
 *
 * @example
 * ```ts
 * import { XrplAdapter, XamanConnector, announceXrplProviders } from '@cinacoin/adapter-xrpl';
 *
 * // Announce providers for EIP-6963 discovery
 * announceXrplProviders();
 *
 * // Use the adapter directly
 * const adapter = new XrplAdapter();
 * const result = await adapter.connect({ connectorId: 'xaman' });
 * const { transactionHash } = await adapter.sendXRP({
 *   destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDH',
 *   amount: '1000000', // 1 XRP in drops
 * });
 *
 * // Or use individual connectors
 * const xaman = new XamanConnector();
 * if (xaman.isAvailable()) {
 *   await xaman.connect();
 * }
 * ```
 */
export class XrplAdapter implements XrplConnector {
  readonly id = 'xrpl';
  readonly name = 'XRP Ledger';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="%23000"/><text x="16" y="22" text-anchor="middle" font-size="12" fill="white" font-family="sans-serif" font-weight="bold">XRP</text></svg>';
  readonly platforms: XrplPlatform[] = ['browser', 'mobile', 'extension', 'hardware'];

  private _connector: XrplConnector | null = null;
  private _registry: XrplConnectorRegistry = new Map();
  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _coreConnector: Connector | null = null;

  constructor() {
    this._registerBuiltInConnectors();
  }

  // ─── Connector Registry ─────────────────────────────────────────

  private _registerBuiltInConnectors(): void {
    this.registerConnector(new XamanConnector());
    // Fireblocks and Ledger connectors would be registered here
    // when their implementations are added:
    // this.registerConnector(new FireblocksXrplConnector());
    // this.registerConnector(new LedgerXrplConnector());
  }

  /**
   * Register an XRPL connector.
   */
  registerConnector(connector: XrplConnector): void {
    this._registry.set(connector.id, connector);
  }

  /**
   * Get a connector by id.
   */
  getConnector(id: string): XrplConnector | undefined {
    return this._registry.get(id);
  }

  /**
   * Get all registered connectors.
   */
  getAllConnectors(): XrplConnector[] {
    return Array.from(this._registry.values());
  }

  /**
   * Detect which connectors are currently available (wallet installed).
   */
  detectAvailableConnectors(): XrplConnector[] {
    return this.getAllConnectors().filter(c => c.isAvailable());
  }

  /**
   * Get recommended connectors in priority order.
   */
  getRecommendedConnectors(): XrplConnector[] {
    const available = this.detectAvailableConnectors();
    const priority = ['xaman', 'fireblocks', 'ledger'];
    return priority
      .map(id => available.find(c => c.id === id))
      .filter((c): c is XrplConnector => c !== undefined);
  }

  /**
   * Set the underlying Cinacoin core connector.
   */
  setConnector(connector: Connector): void {
    this._coreConnector = connector;
  }

  // ─── XrplConnector Implementation ───────────────────────────────

  get supportedFeatures(): XrplFeature[] {
    return this._connector?.supportedFeatures ?? [
      'xrpl:connect',
      'xrpl:signTransaction',
      'xrpl:sendXRP',
      'xrpl:getBalance',
      'xrpl:accountSettings',
      'xrpl:trustLine',
      'xrpl:nftMint',
      'xrpl:nftBurn',
      'xrpl:signMessage',
    ];
  }

  /**
   * Connect via the best available connector.
   * Optionally specify a connector id to use a specific wallet.
   */
  async connect(params?: {
    connectorId?: string;
    network?: XrplNetwork;
  }): Promise<XrplConnectionResult> {
    let connector: XrplConnector;

    if (params?.connectorId) {
      const c = this.getConnector(params.connectorId);
      if (!c) {
        throw new Error(`Connector "${params.connectorId}" not found`);
      }
      connector = c;
    } else {
      const recommended = this.getRecommendedConnectors();
      if (recommended.length === 0) {
        throw new Error(
          'No XRPL wallet found. Install Xaman Wallet or connect a Ledger.'
        );
      }
      connector = recommended[0];
    }

    const result = await connector.connect({ network: params?.network });
    this._connector = connector;

    // Forward connector events through this adapter
    connector.on('accountsChanged', (accounts) => {
      const handlers = this._handlers.get('accountsChanged') ?? new Set();
      for (const handler of handlers) {
        handler(accounts);
      }
    });

    connector.on('networkChanged', (network) => {
      const handlers = this._handlers.get('networkChanged') ?? new Set();
      for (const handler of handlers) {
        handler(network);
      }
    });

    connector.on('disconnect', (error) => {
      this._connector = null;
      const handlers = this._handlers.get('disconnect') ?? new Set();
      for (const handler of handlers) {
        handler(error);
      }
    });

    return result;
  }

  async disconnect(): Promise<void> {
    if (this._connector) {
      await this._connector.disconnect();
      this._connector = null;
    }
  }

  async request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<T> {
    const connector = this._getConnectorOrThrow();
    return connector.request(args);
  }

  async getAccounts(): Promise<string[]> {
    const connector = this._getConnectorOrThrow();
    return connector.getAccounts();
  }

  async getNetwork(): Promise<XrplNetwork> {
    const connector = this._getConnectorOrThrow();
    return connector.getNetwork();
  }

  async switchNetwork(network: XrplNetwork): Promise<void> {
    const connector = this._getConnectorOrThrow();
    await connector.switchNetwork(network);
  }

  isAvailable(): boolean {
    return this.detectAvailableConnectors().length > 0;
  }

  async signTransaction(params: {
    transaction: Record<string, unknown>;
  }): Promise<{ signedTransaction: Record<string, unknown>; txBlob: string }> {
    const connector = this._getConnectorOrThrow();
    return connector.signTransaction(params);
  }

  async sendXRP(params: XrpSendParams): Promise<{ transactionHash: string }> {
    const connector = this._getConnectorOrThrow();
    return connector.sendXRP(params);
  }

  async getBalance(address?: string): Promise<{ balance: string; unit: 'drops' }> {
    const connector = this._getConnectorOrThrow();
    return connector.getBalance(address);
  }

  async updateAccountSettings(params: AccountSettingsParams): Promise<{ transactionHash: string }> {
    const connector = this._getConnectorOrThrow();
    return connector.updateAccountSettings(params);
  }

  async setTrustLine(params: TrustLineParams): Promise<{ transactionHash: string }> {
    const connector = this._getConnectorOrThrow();
    return connector.setTrustLine(params);
  }

  async mintNFT(params: NftMintParams): Promise<{ nftId: string; transactionHash: string }> {
    const connector = this._getConnectorOrThrow();
    return connector.mintNFT(params);
  }

  async burnNFT(params: NftBurnParams): Promise<{ transactionHash: string }> {
    const connector = this._getConnectorOrThrow();
    return connector.burnNFT(params);
  }

  // ─── Events ──────────────────────────────────────────────────────

  on<E extends keyof XrplConnectorEvents>(
    event: E,
    handler: XrplConnectorEvents[E]
  ): void;
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event)!.add(handler);
  }

  off<E extends keyof XrplConnectorEvents>(
    event: E,
    handler: XrplConnectorEvents[E]
  ): void;
  off(event: string, handler: (...args: unknown[]) => void): void {
    this._handlers.get(event)?.delete(handler);
  }

  // ─── Internal ────────────────────────────────────────────────────

  private _getConnectorOrThrow(): XrplConnector {
    if (!this._connector) {
      throw new Error('No XRPL wallet connected. Call connect() first.');
    }
    return this._connector;
  }
}

/**
 * Announce all registered XRPL providers via EIP-6963.
 * Call this during application bootstrap.
 */
export function announceXrplProviders(): void {
  announceXamanEIP6963();
}
