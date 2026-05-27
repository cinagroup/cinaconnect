import { ConnectorConfig, ConnectorEvents, ConnectionResult } from '../types';

/**
 * Minimal shape of an Ethereum provider injected into window.
 */
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isAvailable?: () => boolean;
}

/**
 * EIP-6963 provider announcement event detail.
 *
 * @see https://eips.ethereum.org/EIP-6963
 */
interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: EthereumProvider;
}

/**
 * Built-in connector that detects window.ethereum and similar injected providers.
 *
 * Supports EIP-6963 multi-wallet discovery for wallets that announce themselves
 * via the `eip6963:announceProvider` mechanism.
 */
export class InjectedConnector implements ConnectorConfig {
  readonly id = 'injected';
  readonly name = 'Injected Wallet';
  readonly icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%233B82F6" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/></svg>';
  readonly type = 'injected' as const;

  /** Active event listeners stored for cleanup */
  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  /** Cached provider reference */
  private _provider: EthereumProvider | null = null;
  /** Discovered EIP-6963 providers */
  private _eip6963Providers: Map<string, EIP6963ProviderDetail> = new Map();
  /** Whether init() has been called */
  private _initialized = false;

  constructor() {
    this._listenForEIP6963();
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  /**
   * Initialize the connector by capturing the current injected provider.
   */
  async init(): Promise<void> {
    if (this._initialized) return;

    const win = typeof window !== 'undefined'
      ? (window as Window & { ethereum?: EthereumProvider })
      : undefined;
    if (win?.ethereum) {
      this._provider = win.ethereum as EthereumProvider;
    }

    this._initialized = true;
  }

  /**
   * Request connection from the injected provider.
   *
   * Triggers the wallet's permission prompt and returns connected accounts.
   */
  async connect(_params?: Record<string, unknown>): Promise<ConnectionResult> {
    const provider = this._getProviderOrThrow();

    // eth_requestAccounts triggers the wallet connection UI
    const accounts = (await provider.request({
      method: 'eth_requestAccounts',
    })) as string[];

    const chainId = (await provider.request({
      method: 'eth_chainId',
    })) as string;

    // Wire up runtime event listeners
    this._bindProviderEvents(provider);

    return { accounts, chainId, provider };
  }

  /**
   * Disconnect is a no-op for injected providers since the wallet
   * lives in the browser. We fire a disconnect event for consistency.
   */
  async disconnect(): Promise<void> {
    const handlers = this._handlers.get('disconnect') ?? new Set();
    for (const handler of handlers) {
      handler();
    }
  }

  // ─── Provider interaction ───────────────────────────────────────

  /**
   * Forward a JSON-RPC request to the injected provider.
   */
  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    const provider = this._getProviderOrThrow();
    return provider.request(args);
  }

  async getAccounts(): Promise<string[]> {
    const provider = this._getProviderOrThrow();
    return (await provider.request({
      method: 'eth_accounts',
    })) as string[];
  }

  async getChainId(): Promise<string> {
    const provider = this._getProviderOrThrow();
    return (await provider.request({
      method: 'eth_chainId',
    })) as string;
  }

  /**
   * Check whether an ethereum provider is available in the current window.
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as Window & { ethereum?: EthereumProvider })?.ethereum || this._eip6963Providers.size > 0;
  }

  // ─── Events ─────────────────────────────────────────────────────

  on<E extends keyof ConnectorEvents>(
    event: E,
    handler: ConnectorEvents[E]
  ): void;
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event)!.add(handler);
  }

  off<E extends keyof ConnectorEvents>(
    event: E,
    handler: ConnectorEvents[E]
  ): void;
  off(event: string, handler: (...args: unknown[]) => void): void {
    this._handlers.get(event)?.delete(handler);
  }

  // ─── EIP-6963 ──────────────────────────────────────────────────

  /**
   * Listen for EIP-6963 provider announcements to discover wallets
   * that don't set window.ethereum directly.
   */
  private _listenForEIP6963(): void {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as EIP6963ProviderDetail;
      if (detail?.info?.uuid) {
        this._eip6963Providers.set(detail.info.uuid, detail);
        // If no provider yet, adopt the first one discovered
        if (!this._provider) {
          this._provider = detail.provider;
        }
      }
    };

    window.addEventListener('eip6963:announceProvider', handler);

    // Ask all wallets to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }

  // ─── Internal ───────────────────────────────────────────────────

  private _getProviderOrThrow(): EthereumProvider {
    if (!this._provider) {
      throw new Error(
        'No injected provider found. Ensure a wallet extension is installed and the connector has been initialized.'
      );
    }
    return this._provider;
  }

  /**
   * Bind runtime events from the provider to our internal event system.
   */
  private _bindProviderEvents(provider: EthereumProvider): void {
    provider.on('accountsChanged', (accounts: unknown) => {
      const handlers = this._handlers.get('accountsChanged') ?? new Set();
      for (const handler of handlers) {
        handler(accounts);
      }
    });

    provider.on('chainChanged', (chainId: unknown) => {
      const handlers = this._handlers.get('chainChanged') ?? new Set();
      for (const handler of handlers) {
        handler(chainId);
      }
    });

    provider.on('disconnect', (error: unknown) => {
      const handlers = this._handlers.get('disconnect') ?? new Set();
      for (const handler of handlers) {
        handler(error);
      }
    });
  }
}
