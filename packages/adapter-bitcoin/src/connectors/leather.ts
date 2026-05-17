import type {
  BitcoinConnector,
  BitcoinPlatform,
  BitcoinFeature,
  BitcoinConnectionResult,
  BitcoinConnectorEvents,
  BitcoinProvider,
} from '../types';

/**
 * Shape of the Leather Bitcoin provider injected at `window.leather`.
 *
 * @see https://leather.io/
 */
interface LeatherProvider {
  request: <T = unknown>(args: { method: string; params?: Record<string, unknown> }) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface LeatherGetAddressResponse {
  address: string;
  publicKey: string;
  addressType: string;
}

interface LeatherSignPsbtResponse {
  psbt: string;
}

interface LeatherSendTransferResponse {
  txid: string;
}

declare global {
  interface Window {
    leather?: {
      bitcoin?: LeatherProvider;
    };
  }
}

/**
 * Leather Wallet connector for native Bitcoin.
 *
 * Detects `window.leather.bitcoin` and wraps it with the standard
 * {@link BitcoinConnector} interface.
 *
 * Leather also supports Stacks — this connector focuses on Bitcoin functionality
 * while exposing the Stacks integration surface via `request()` calls.
 *
 * @see https://leather.io/
 *
 * @example
 * ```ts
 * const leather = new LeatherConnector();
 * if (leather.isAvailable()) {
 *   const result = await leather.connect();
 *   console.log(result.accounts);
 * }
 * ```
 */
export class LeatherConnector implements BitcoinConnector {
  readonly id = 'leather';
  readonly name = 'Leather Wallet';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="%233D5AFE"/><text x="16" y="22" text-anchor="middle" font-size="16" fill="white" font-family="sans-serif" font-weight="bold">L</text></svg>';
  readonly platforms: BitcoinPlatform[] = ['browser', 'extension'];
  readonly supportedFeatures: BitcoinFeature[] = [
    'bitcoin:connect',
    'bitcoin:signMessage',
    'bitcoin:signPsbt',
    'bitcoin:sendTransfer',
    'bitcoin:signTransaction',
    'bitcoin:ordinals',
  ];

  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _provider: LeatherProvider | null = null;

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

    // Leather uses `getAddress` to request connection and retrieve addresses
    const response = (await provider.request({
      method: 'getAddress',
      params: { purpose: 'ordinals' as unknown as string },
    })) as LeatherGetAddressResponse;

    // Leather defaults to mainnet
    const network = 'mainnet';

    this._bindProviderEvents(provider);

    return { accounts: [response.address], network, provider: provider as BitcoinProvider };
  }

  async disconnect(): Promise<void> {
    const handlers = this._handlers.get('disconnect') ?? new Set();
    for (const handler of handlers) {
      handler();
    }
  }

  // ─── RPC ─────────────────────────────────────────────────────────

  async request<T = unknown>(args: {
    method: string;
    params?: unknown[];
  }): Promise<T> {
    const provider = this._getProviderOrThrow();

    // Leather expects `params` as a Record, not an array
    const leatherParams: Record<string, unknown> = {};
    if (args.params && Array.isArray(args.params)) {
      args.params.forEach((p, i) => {
        leatherParams[`arg${i}`] = p;
      });
    }

    return provider.request({ method: args.method, params: leatherParams }) as Promise<T>;
  }

  async getAccounts(): Promise<string[]> {
    const provider = this._getProviderOrThrow();
    const response = (await provider.request({
      method: 'getAddresses',
    })) as { addresses: Array<{ address: string }> };

    return response.addresses.map((a) => a.address);
  }

  async getNetwork(): Promise<string> {
    // Leather doesn't have a native network getter for Bitcoin; default to mainnet
    return 'mainnet';
  }

  async switchNetwork(_network: string): Promise<void> {
    throw new Error(
      'Leather Wallet does not support programmatic network switching for Bitcoin. ' +
        'Please change the network in the extension settings.'
    );
  }

  // ─── Bitcoin-native methods ─────────────────────────────────────

  async signMessage(params: {
    message: string;
    address: string;
  }): Promise<{ signature: string }> {
    const provider = this._getProviderOrThrow();

    const response = (await provider.request({
      method: 'signMessage',
      params: {
        message: params.message,
        address: params.address,
      },
    })) as { signature: string };

    return { signature: response.signature };
  }

  async signPsbt(params: {
    psbt: string;
    signInputs?: Record<number, number[]>;
  }): Promise<{ psbt: string }> {
    const provider = this._getProviderOrThrow();

    const response = (await provider.request({
      method: 'signPsbt',
      params: {
        psbt: params.psbt,
        signInputs: params.signInputs,
      },
    })) as LeatherSignPsbtResponse;

    return { psbt: response.psbt };
  }

  async sendTransfer(params: {
    recipient: string;
    amount: number;
    feeRate?: number;
  }): Promise<{ txid: string }> {
    const provider = this._getProviderOrThrow();

    const response = (await provider.request({
      method: 'sendTransfer',
      params: {
        address: params.recipient,
        amount: params.amount,
        feeRate: params.feeRate,
      },
    })) as LeatherSendTransferResponse;

    return { txid: response.txid };
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
    if (win.leather?.bitcoin) {
      this._provider = win.leather.bitcoin;
    }
  }

  private _getProviderOrThrow(): LeatherProvider {
    this._captureProvider();
    if (!this._provider) {
      throw new Error(
        'Leather Wallet not found. Install the Leather browser extension: https://leather.io/'
      );
    }
    return this._provider;
  }

  private _bindProviderEvents(provider: LeatherProvider): void {
    provider.on('addressesChanged', (addresses: unknown) => {
      const handlers = this._handlers.get('accountsChanged') ?? new Set();
      for (const handler of handlers) {
        handler(addresses);
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

// ─── Stacks Integration Helper ──────────────────────────────────────

/**
 * Send a Stacks request through Leather.
 *
 * Leather uses the same `window.leather` surface for Stacks operations.
 * This helper provides typed access to Stacks-specific methods.
 *
 * @param leather Connector instance
 * @param method Stacks method name (e.g. 'stx_getAddress', 'stx_signMessage')
 * @param params Method parameters
 * @returns Typed response
 */
export async function leatherStacksRequest<T = unknown>(
  leather: LeatherConnector,
  method: string,
  params?: Record<string, unknown>
): Promise<T> {
  return leather.request<T>({
    method,
    params: params ? Object.values(params) : undefined,
  });
}
