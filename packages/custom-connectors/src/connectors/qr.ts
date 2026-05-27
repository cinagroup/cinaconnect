import { ConnectorConfig, ConnectorEvents, ConnectionResult } from '../types';

/**
 * Parameters accepted by QRConnector.connect().
 */
interface QRConnectParams {
  /** WalletConnect URI (from QR scan or manual paste) */
  uri?: string;
  /** Project ID for WalletConnect Cloud relay */
  projectId?: string;
}

/**
 * QR code wallet connector.
 *
 * Generates a WalletConnect URI and renders a QR code for mobile wallet pairing.
 * Falls back to a deep link URL for mobile browsers where QR scanning isn't possible.
 */
export class QRConnector implements ConnectorConfig {
  readonly id = 'qr';
  readonly name = 'Scan QR Code';
  readonly icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%2310B981" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2z"/></svg>';
  readonly type = 'qr' as const;

  /** Internal event handlers */
  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  /** Current WalletConnect URI */
  private _uri: string | null = null;
  /** Whether we have an active session */
  private _connected = false;
  /** Cached accounts */
  private _accounts: string[] = [];
  /** Cached chain ID */
  private _chainId = '0x1';
  /** WalletConnect relay project ID */
  private _projectId: string;
  /** Core SDK SignClient (lazily initialized) */
  private _signClient: any = null;
  /** Active session topic */
  private _sessionTopic: string | null = null;

  constructor(projectId = '') {
    this._projectId = projectId;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  /**
   * Initialize the connector by creating a SignClient instance.
   */
  async init(): Promise<void> {
    if (this._signClient) return;

    const { SignClient } = await import('@cinacoin/core-sdk');
    this._signClient = await SignClient.init({
      projectId: this._projectId,
      metadata: {
        name: 'Cinacoin',
        description: 'Cinacoin QR Wallet',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: [],
      },
    });
  }

  /**
   * Start a WalletConnect pairing session.
   *
   * If a URI is provided (e.g. from a QR scan), it pairs directly.
   * Otherwise a new connection URI is generated for display as a QR code.
   */
  async connect(params?: Record<string, unknown>): Promise<ConnectionResult> {
    const client = await this._getClientOrThrow();
    const qrParams = (params ?? {}) as QRConnectParams;

    if (qrParams.uri) {
      // Pair with existing URI (mobile wallet scanned our QR)
      await client.pair({ uri: qrParams.uri });
    } else {
      // Generate a new pairing URI to display as QR
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
            ],
            chains: ['eip155:1'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      });

      this._uri = uri ?? null;

      // Wait for the remote wallet to approve
      const session = await approval();
      this._sessionTopic = session.topic;
      this._accounts = session.namespaces?.eip155?.accounts?.map(
        (a: string) => a.split(':').pop()
      ) ?? [];
      this._connected = true;

      this._bindSessionEvents(session);

      return {
        accounts: this._accounts,
        chainId: this._chainId,
        provider: session,
      };
    }

    return {
      accounts: this._accounts,
      chainId: this._chainId,
      provider: null,
    };
  }

  /**
   * Disconnect the active WalletConnect session.
   */
  async disconnect(): Promise<void> {
    if (this._sessionTopic && this._signClient) {
      try {
        await this._signClient.disconnect({
          topic: this._sessionTopic,
          reason: { code: 6000, message: 'User disconnected' },
        });
      } catch {
        // Session may already be gone — ignore
      }
    }

    this._connected = false;
    this._sessionTopic = null;
    this._uri = null;
    this._accounts = [];

    const handlers = this._handlers.get('disconnect') ?? new Set();
    for (const handler of handlers) {
      handler();
    }
  }

  // ─── Provider interaction ───────────────────────────────────────

  /**
   * Forward a JSON-RPC request through the WalletConnect session.
   */
  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    if (!this._sessionTopic || !this._signClient) {
      throw new Error('No active WalletConnect session. Call connect() first.');
    }

    return this._signClient.request({
      topic: this._sessionTopic,
      request: {
        method: args.method,
        params: args.params ?? [],
      },
      chainId: `eip155:${parseInt(this._chainId, 16)}`,
    });
  }

  async getAccounts(): Promise<string[]> {
    return this._accounts;
  }

  async getChainId(): Promise<string> {
    return this._chainId;
  }

  /**
   * QR connector is always "available" since it works on any device
   * (mobile or desktop) as long as the browser is present.
   */
  isAvailable(): boolean {
    return true;
  }

  // ─── Accessors ──────────────────────────────────────────────────

  /**
   * Get the current WalletConnect URI for QR code rendering.
   * Returns null if no URI has been generated yet.
   */
  getURI(): string | null {
    return this._uri;
  }

  /**
   * Build a deep-link URL for mobile wallets that support it.
   *
   * @param walletDeepLink - Wallet's URL scheme (e.g. "metamask://wc?uri=")
   * @returns Full deep-link URL with encoded URI
   */
  getDeepLink(walletDeepLink: string): string | null {
    if (!this._uri) return null;
    return `${walletDeepLink}${encodeURIComponent(this._uri)}`;
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

  // ─── Internal ───────────────────────────────────────────────────

  private async _getClientOrThrow(): Promise<any> {
    if (!this._signClient) {
      await this.init();
    }
    if (!this._signClient) {
      throw new Error('SignClient initialization failed.');
    }
    return this._signClient;
  }

  /**
   * Bind session-level events to our internal event system.
   */
  private _bindSessionEvents(session: any): void {
    if (!this._signClient) return;

    this._signClient.on('session_event', (event: any) => {
      const { params } = event;
      if (params.event.name === 'accountsChanged') {
        this._accounts = params.event.data;
        const handlers = this._handlers.get('accountsChanged') ?? new Set();
        for (const handler of handlers) {
          handler(this._accounts);
        }
      }
      if (params.event.name === 'chainChanged') {
        this._chainId = `0x${Number(params.event.data).toString(16)}`;
        const handlers = this._handlers.get('chainChanged') ?? new Set();
        for (const handler of handlers) {
          handler(this._chainId);
        }
      }
    });

    this._signClient.on('session_delete', () => {
      this._connected = false;
      this._sessionTopic = null;
      this._accounts = [];

      const handlers = this._handlers.get('disconnect') ?? new Set();
      for (const handler of handlers) {
        handler();
      }
    });
  }
}
