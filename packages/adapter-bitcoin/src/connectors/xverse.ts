import type {
  BitcoinConnector,
  BitcoinPlatform,
  BitcoinFeature,
  BitcoinConnectionResult,
  BitcoinConnectorEvents,
  BitcoinProvider,
} from '../types';

/**
 * Shape of the Xverse Wallet provider injected at `window.xverse`.
 *
 * Xverse supports both Bitcoin and Stacks chains.
 * This connector focuses on Bitcoin functionality.
 *
 * @see https://www.xverse.app/
 */
interface XverseBitcoinProvider {
  request: <T = unknown>(args: { method: string; params?: unknown[] }) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  requestAccounts?: () => Promise<string[]>;
  getAccount?: () => Promise<{
    addresses: Array<{ type: string; address: string; publicKey: string }>;
    walletType: string;
  }>;
}

interface XverseWindow {
  bitcoin?: XverseBitcoinProvider;
}

declare global {
  interface Window {
    xverse?: XverseWindow;
  }
}

/**
 * Xverse Wallet connector for native Bitcoin (+ Stacks support).
 *
 * Detects `window.xverse.bitcoin` and wraps it with the standard
 * {@link BitcoinConnector} interface. Xverse supports both Bitcoin
 * Ordinals and Stacks — this connector covers Bitcoin operations
 * while exposing Stacks through the `request()` interface.
 *
 * @see https://www.xverse.app/
 *
 * @example
 * ```ts
 * const xverse = new XverseConnector();
 * if (xverse.isAvailable()) {
 *   const result = await xverse.connect();
 *   console.log(result.accounts); // ["bc1q...", ...]
 * }
 * ```
 */
export class XverseConnector implements BitcoinConnector {
  readonly id = 'xverse';
  readonly name = 'Xverse Wallet';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="%231E1E2C"/><text x="16" y="22" text-anchor="middle" font-size="16" fill="%236C5DD3" font-family="sans-serif" font-weight="bold">X</text></svg>';
  readonly platforms: BitcoinPlatform[] = ['browser', 'mobile', 'extension'];
  readonly supportedFeatures: BitcoinFeature[] = [
    'bitcoin:connect',
    'bitcoin:signMessage',
    'bitcoin:signPsbt',
    'bitcoin:signTransaction',
    'bitcoin:sendTransfer',
    'bitcoin:switchNetwork',
    'bitcoin:ordinals',
    'bitcoin:brc20',
  ];

  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _provider: XverseBitcoinProvider | null = null;
  private _connectedAccounts: string[] = [];

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

    // Try convenience method first, fall back to request
    let accounts: string[];

    try {
      accounts = await this._requestAccounts(provider);
    } catch {
      // Fallback: getAccount returns structured address info
      const account = await this._getAccount(provider);
      accounts = account.addresses
        .filter((a) => a.type === 'payment' || a.type === 'ordinals')
        .map((a) => a.address);

      if (accounts.length === 0 && account.addresses.length > 0) {
        accounts = account.addresses.map((a) => a.address);
      }
    }

    this._connectedAccounts = accounts;

    this._bindProviderEvents(provider);

    return {
      accounts: this._connectedAccounts,
      network: 'mainnet', // Xverse defaults to mainnet
      provider: provider as BitcoinProvider,
    };
  }

  async disconnect(): Promise<void> {
    this._connectedAccounts = [];
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
    if (this._connectedAccounts.length > 0) {
      return this._connectedAccounts;
    }

    const provider = this._getProviderOrThrow();
    const account = await this._getAccount(provider);
    return account.addresses.map((a) => a.address);
  }

  async getNetwork(): Promise<string> {
    return 'mainnet';
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
      params: [params.message, params.address],
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
      params: [
        params.psbt,
        {
          signInputs: params.signInputs,
          broadcast: false,
        },
      ],
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
      method: 'wallet_sendTransfer',
      params: [
        {
          recipient: params.recipient,
          amount: params.amount,
          feeRate: params.feeRate,
        },
      ],
    })) as string;

    return { txid };
  }

  // ─── Stacks Integration ──────────────────────────────────────────

  /**
   * Get Stacks addresses through the Xverse provider.
   *
   * Xverse uses the same `window.xverse` surface for Stacks operations.
   */
  async getStacksAccount(): Promise<{
    addresses: Array<{ type: string; address: string; publicKey: string }>;
  }> {
    const provider = this._getProviderOrThrow();

    return provider.request({
      method: 'wallet_getStxAccount',
    });
  }

  /**
   * Sign a Stacks transaction through Xverse.
   */
  async signStacksTransaction(params: {
    transaction: string;
  }): Promise<{ signedTransaction: string }> {
    const provider = this._getProviderOrThrow();

    return provider.request({
      method: 'wallet_signStxTransaction',
      params: [params.transaction],
    });
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
    if (win.xverse?.bitcoin) {
      this._provider = win.xverse.bitcoin;
    }
  }

  private _getProviderOrThrow(): XverseBitcoinProvider {
    this._captureProvider();
    if (!this._provider) {
      throw new Error(
        'Xverse Wallet not found. Install Xverse: https://www.xverse.app/'
      );
    }
    return this._provider;
  }

  private async _requestAccounts(
    provider: XverseBitcoinProvider
  ): Promise<string[]> {
    if (provider.requestAccounts) {
      return provider.requestAccounts();
    }

    return (await provider.request({
      method: 'wallet_requestAccounts',
    })) as string[];
  }

  private async _getAccount(
    provider: XverseBitcoinProvider
  ): Promise<{
    addresses: Array<{ type: string; address: string; publicKey: string }>;
    walletType: string;
  }> {
    if (provider.getAccount) {
      return provider.getAccount();
    }

    return (await provider.request({
      method: 'wallet_getAccount',
    })) as {
      addresses: Array<{ type: string; address: string; publicKey: string }>;
      walletType: string;
    };
  }

  private _bindProviderEvents(provider: XverseBitcoinProvider): void {
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
