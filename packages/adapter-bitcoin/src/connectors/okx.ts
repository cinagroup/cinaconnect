import type {
  BitcoinConnector,
  BitcoinPlatform,
  BitcoinFeature,
  BitcoinConnectionResult,
  BitcoinConnectorEvents,
  BitcoinProvider,
} from '../types';

/**
 * Shape of the OKX Bitcoin wallet provider injected at `window.okxwallet.btc`.
 *
 * @see https://www.okx.com/web3
 */
interface OKXBtcProvider {
  request: <T = unknown>(args: { method: string; params?: unknown[] }) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    okxwallet?: {
      /** OKX Bitcoin provider (distinct from the EVM provider) */
      btc?: OKXBtcProvider;
      /** OKX EVM provider — kept here for dual-mode detection */
      ethereum?: unknown;
    };
  }
}

/**
 * OKX Wallet Bitcoin connector.
 *
 * OKX Wallet supports dual EVM/Bitcoin mode. This connector targets
 * `window.okxwallet.btc` — the Bitcoin-specific provider — while
 * correctly handling the dual-mode environment.
 *
 * @see https://www.okx.com/web3
 *
 * @example
 * ```ts
 * const okxBtc = new OKXBitcoinConnector();
 * if (okxBtc.isAvailable()) {
 *   const result = await okxBtc.connect();
 *   console.log(result.accounts); // ["bc1q...", ...]
 * }
 * ```
 */
export class OKXBitcoinConnector implements BitcoinConnector {
  readonly id = 'okx-btc';
  readonly name = 'OKX Wallet (Bitcoin)';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="%23000"/><text x="16" y="22" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="bold">OKX</text></svg>';
  readonly platforms: BitcoinPlatform[] = ['browser', 'mobile', 'extension'];
  readonly supportedFeatures: BitcoinFeature[] = [
    'bitcoin:connect',
    'bitcoin:signMessage',
    'bitcoin:signPsbt',
    'bitcoin:sendBitcoin',
    'bitcoin:sendTransfer',
    'bitcoin:switchNetwork',
  ];

  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _provider: OKXBtcProvider | null = null;

  constructor() {
    this._captureProvider();
  }

  // ─── Availability ────────────────────────────────────────────────

  isAvailable(): boolean {
    this._captureProvider();
    return this._provider !== null;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  async connect(_params?: { accounts?: string[] }): Promise<BitcoinConnectionResult> {
    const provider = this._getProviderOrThrow();

    const accounts = (await provider.request({
      method: 'wallet_requestAccounts',
    })) as string[];

    const network = (await provider.request({
      method: 'wallet_getNetwork',
    })) as string;

    this._bindProviderEvents(provider);

    return { accounts, network, provider: provider as BitcoinProvider };
  }

  async disconnect(): Promise<void> {
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
    return (await provider.request({
      method: 'wallet_getAccounts',
    })) as string[];
  }

  async getNetwork(): Promise<string> {
    const provider = this._getProviderOrThrow();
    return (await provider.request({
      method: 'wallet_getNetwork',
    })) as string;
  }

  async switchNetwork(network: string): Promise<void> {
    const provider = this._getProviderOrThrow();
    await provider.request({
      method: 'wallet_switchNetwork',
      params: [network],
    });
  }

  // ─── Bitcoin-native methods ─────────────────────────────────────

  async signMessage(params: {
    message: string;
    address: string;
  }): Promise<{ signature: string }> {
    const provider = this._getProviderOrThrow();

    const signature = (await provider.request({
      method: 'wallet_signMessage',
      params: [params.message],
    })) as string;

    return { signature };
  }

  async signPsbt(params: {
    psbt: string;
    signInputs?: Record<number, number[]>;
  }): Promise<{ psbt: string }> {
    const provider = this._getProviderOrThrow();

    const psbt = (await provider.request({
      method: 'wallet_signPsbt',
      params: [params.psbt, { signInputs: params.signInputs }],
    })) as string;

    return { psbt };
  }

  async sendTransfer(params: {
    recipient: string;
    amount: number;
    feeRate?: number;
  }): Promise<{ txid: string }> {
    const provider = this._getProviderOrThrow();

    const txid = (await provider.request({
      method: 'wallet_sendBitcoin',
      params: [params.recipient, params.amount, params.feeRate],
    })) as string;

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

  private _captureProvider(): void {
    if (this._provider) return;
    if (typeof window === 'undefined') return;

    const win = window as Window;

    // OKX dual-mode: btc provider sits alongside ethereum
    // Must check btc specifically, NOT ethereum
    if (win.okxwallet?.btc) {
      this._provider = win.okxwallet.btc;
    }
  }

  private _getProviderOrThrow(): OKXBtcProvider {
    this._captureProvider();
    if (!this._provider) {
      throw new Error(
        'OKX Wallet Bitcoin provider not found. Install OKX Wallet and ensure the Bitcoin network is selected: https://www.okx.com/web3'
      );
    }
    return this._provider;
  }

  private _bindProviderEvents(provider: OKXBtcProvider): void {
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
