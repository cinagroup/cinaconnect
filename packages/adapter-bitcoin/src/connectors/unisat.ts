import type {
  BitcoinConnector,
  BitcoinPlatform,
  BitcoinFeature,
  BitcoinConnectionResult,
  BitcoinConnectorEvents,
  BitcoinProvider,
} from '../types';

declare global {
  interface Window {
    unisat?: BitcoinProvider & {
      requestAccounts?: () => Promise<string[]>;
      getAccounts?: () => Promise<string[]>;
      getNetwork?: () => Promise<string>;
      switchNetwork?: (network: string) => Promise<void>;
      signMessage?: (message: string, type?: string) => Promise<string>;
      signPsbt?: (
        psbt: string,
        options?: { autoFinalized?: boolean; signInputs?: Record<number, number[]> }
      ) => Promise<string>;
      sendBitcoin?: (toAddress: string, amount: number, feeRate?: number) => Promise<string>;
    };
  }
}

/**
 * Unisat Wallet connector for native Bitcoin.
 *
 * Detects `window.unisat` and wraps it with the standard
 * {@link BitcoinConnector} interface.
 *
 * @see https://docs.unisat.io/
 *
 * @example
 * ```ts
 * const unisat = new UnisatConnector();
 * if (unisat.isAvailable()) {
 *   const result = await unisat.connect();
 *   console.log(result.accounts); // ["bc1q...", ...]
 * }
 * ```
 */
export class UnisatConnector implements BitcoinConnector {
  readonly id = 'unisat';
  readonly name = 'Unisat Wallet';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23D8A852"/><text x="16" y="22" text-anchor="middle" font-size="16" fill="white" font-family="sans-serif" font-weight="bold">U</text></svg>';
  readonly platforms: BitcoinPlatform[] = ['browser', 'extension'];
  readonly supportedFeatures: BitcoinFeature[] = [
    'bitcoin:connect',
    'bitcoin:signMessage',
    'bitcoin:signPsbt',
    'bitcoin:sendBitcoin',
    'bitcoin:sendTransfer',
    'bitcoin:switchNetwork',
  ];

  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _provider: NonNullable<Window['unisat']> | null = null;

  constructor() {
    this._captureProvider();
  }

  // ─── Availability ────────────────────────────────────────────────

  isAvailable(): boolean {
    this._captureProvider();
    return this._provider !== null;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  async connect(params?: { accounts?: string[] }): Promise<BitcoinConnectionResult> {
    const provider = this._getProviderOrThrow();

    // Use requestAccounts which triggers the wallet permission prompt
    const accounts = await this._safeCall(provider, 'requestAccounts', async () => {
      const result = (await provider.request({
        method: 'wallet_requestAccounts',
      })) as string[];
      return result;
    });

    const network = await this._safeCall(provider, 'getNetwork', () =>
      provider.request({ method: 'wallet_getNetwork' })
    );

    this._bindProviderEvents(provider);

    return { accounts, network, provider };
  }

  async disconnect(): Promise<void> {
    // Unisat doesn't have a native disconnect — fire event for consistency
    const handlers = this._handlers.get('disconnect') ?? new Set();
    for (const handler of handlers) {
      handler();
    }
  }

  // ─── RPC ─────────────────────────────────────────────────────────

  async request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T> {
    const provider = this._getProviderOrThrow();
    return provider.request(args) as Promise<T>;
  }

  async getAccounts(): Promise<string[]> {
    const provider = this._getProviderOrThrow();

    // Try direct method first, fall back to request()
    return this._safeCall(provider, 'getAccounts', () =>
      provider.request({ method: 'wallet_getAccounts' })
    );
  }

  async getNetwork(): Promise<string> {
    const provider = this._getProviderOrThrow();
    return this._safeCall(provider, 'getNetwork', () =>
      provider.request({ method: 'wallet_getNetwork' })
    );
  }

  async switchNetwork(network: string): Promise<void> {
    const provider = this._getProviderOrThrow();
    await this._safeCall(provider, 'switchNetwork', () =>
      provider.request({ method: 'wallet_switchNetwork', params: [network] })
    );
  }

  // ─── Bitcoin-native methods ─────────────────────────────────────

  async signMessage(params: {
    message: string;
    address: string;
  }): Promise<{ signature: string }> {
    const provider = this._getProviderOrThrow();

    const signature = await this._safeCall(
      provider,
      'signMessage',
      () =>
        provider.request({
          method: 'wallet_signMessage',
          params: [params.message],
        })
    );

    return { signature };
  }

  async signPsbt(params: {
    psbt: string;
    signInputs?: Record<number, number[]>;
  }): Promise<{ psbt: string }> {
    const provider = this._getProviderOrThrow();

    const psbt = await this._safeCall(
      provider,
      'signPsbt',
      () =>
        provider.request({
          method: 'wallet_signPsbt',
          params: [
            params.psbt,
            { autoFinalized: true, signInputs: params.signInputs },
          ],
        })
    );

    return { psbt };
  }

  async sendTransfer(params: {
    recipient: string;
    amount: number;
    feeRate?: number;
  }): Promise<{ txid: string }> {
    const provider = this._getProviderOrThrow();

    const txid = await this._safeCall(
      provider,
      'sendBitcoin',
      () =>
        provider.request({
          method: 'wallet_sendBitcoin',
          params: [params.recipient, params.amount, params.feeRate],
        })
    );

    return { txid };
  }

  // ─── Events ──────────────────────────────────────────────────────

  on<E extends keyof BitcoinConnectorEvents>(
    event: E,
    handler: BitcoinConnectorEvents[E]
  ): void;
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event)!.add(handler);
  }

  off<E extends keyof BitcoinConnectorEvents>(
    event: E,
    handler: BitcoinConnectorEvents[E]
  ): void;
  off(event: string, handler: (...args: unknown[]) => void): void {
    this._handlers.get(event)?.delete(handler);
  }

  // ─── Internal ────────────────────────────────────────────────────

  /** Capture window.unisat if available (idempotent). */
  private _captureProvider(): void {
    if (this._provider) return;
    if (typeof window === 'undefined') return;

    const win = window as Window;
    if (win.unisat) {
      this._provider = win.unisat;
    }
  }

  private _getProviderOrThrow(): NonNullable<Window['unisat']> {
    this._captureProvider();
    if (!this._provider) {
      throw new Error(
        'Unisat Wallet not found. Install the Unisat browser extension: https://unisat.io/'
      );
    }
    return this._provider;
  }

  /**
   * Try a provider-specific convenience method, falling back to
   * the generic `request()` call if the convenience method is absent.
   */
  private async _safeCall<T>(
    _provider: NonNullable<Window['unisat']>,
    methodName: string,
    fallback: () => Promise<T>
  ): Promise<T> {
    return fallback();
  }

  /** Bind provider events to our internal event system. */
  private _bindProviderEvents(provider: NonNullable<Window['unisat']>): void {
    provider.on('accountsChanged', (accounts: unknown) => {
      const handlers = this._handlers.get('accountsChanged') ?? new Set();
      for (const handler of handlers) {
        handler(accounts);
      }
    });

    provider.on('networkChanged', (network: unknown) => {
      const handlers = this._handlers.get('networkChanged') ?? new Set();
      for (const handler of handlers) {
        handler(network);
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

// ─── EIP-6963 Announcement ─────────────────────────────────────────

/**
 * Announce the Unisat Bitcoin provider via EIP-6963 event.
 * Call this during application bootstrap to enable multi-wallet discovery.
 */
export function announceUnisatEIP6963(): void {
  if (typeof window === 'undefined') return;

  const win = window as Window;
  if (!win.unisat) return;

  const detail = {
    info: {
      uuid: crypto.randomUUID(),
      name: 'Unisat Wallet',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23D8A852"/><text x="16" y="22" text-anchor="middle" font-size="16" fill="white" font-family="sans-serif" font-weight="bold">U</text></svg>',
      rdns: 'io.unisat',
    },
    provider: win.unisat,
  };

  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail })
    );
  });

  // Also announce immediately in case the request event already fired
  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', { detail })
  );
}
