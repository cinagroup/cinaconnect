import type {
  HederaConnector,
  HederaPlatform,
  HederaFeature,
  HederaConnectionResult,
  HederaConnectorEvents,
  HederaProvider,
  HederaNetwork,
  HbarTransferParams,
  TokenTransferParams,
  ContractCallParams,
} from '../types';

/**
 * Shape of the Blade Wallet provider injected at `window.blade`.
 *
 * @see https://blade_wallet.io/
 */
interface BladeProvider {
  request: <T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    blade?: BladeProvider;
  }
}

/**
 * Blade Wallet connector for Hedera Hashgraph.
 *
 * Detects `window.blade` and wraps it with the standard
 * {@link HederaConnector} interface.
 *
 * @see https://blade_wallet.io/
 *
 * @example
 * ```ts
 * const blade = new BladeWalletConnector();
 * if (blade.isAvailable()) {
 *   const result = await blade.connect();
 *   console.log(result.accounts); // ["0.0.12345"]
 * }
 * ```
 */
export class BladeWalletConnector implements HederaConnector {
  readonly id = 'blade';
  readonly name = 'Blade Wallet';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="%232563EB"/><text x="16" y="22" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="bold">B</text></svg>';
  readonly platforms: HederaPlatform[] = ['browser', 'mobile', 'extension'];
  readonly supportedFeatures: HederaFeature[] = [
    'hedera:connect',
    'hedera:signTransaction',
    'hedera:executeTransaction',
    'hedera:getBalance',
    'hedera:transferHbar',
    'hedera:transferToken',
    'hedera:contractCall',
    'hedera:switchNetwork',
  ];

  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _provider: BladeProvider | null = null;

  constructor() {
    this._captureProvider();
  }

  // ─── Availability ────────────────────────────────────────────────

  isAvailable(): boolean {
    this._captureProvider();
    return this._provider !== null;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  async connect(params?: { network?: HederaNetwork }): Promise<HederaConnectionResult> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'connect',
      params: { network: params?.network ?? 'mainnet' },
    })) as { accounts: string[]; network: HederaNetwork };

    this._bindProviderEvents(provider);

    return {
      accounts: result.accounts,
      network: result.network,
      provider: provider as HederaProvider,
    };
  }

  async disconnect(): Promise<void> {
    const provider = this._provider;
    if (provider) {
      try {
        await provider.request({ method: 'disconnect' });
      } catch (err) { console.warn('[blade] Operation failed:', err instanceof Error ? err.message : String(err));
        // Blade may not support programmatic disconnect
      }
    }
    const handlers = this._handlers.get('disconnect') ?? new Set();
    for (const handler of handlers) {
      handler();
    }
  }

  // ─── RPC ─────────────────────────────────────────────────────────

  async request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<T> {
    const provider = this._getProviderOrThrow();
    return provider.request(args) as Promise<T>;
  }

  async getAccounts(): Promise<string[]> {
    const provider = this._getProviderOrThrow();
    const result = (await provider.request({
      method: 'getAccounts',
    })) as { accounts: string[] };
    return result.accounts;
  }

  async getNetwork(): Promise<HederaNetwork> {
    const provider = this._getProviderOrThrow();
    const result = (await provider.request({
      method: 'getNetwork',
    })) as { network: HederaNetwork };
    return result.network;
  }

  async switchNetwork(network: HederaNetwork): Promise<void> {
    const provider = this._getProviderOrThrow();
    await provider.request({
      method: 'switchNetwork',
      params: { network },
    });
  }

  // ─── Hedera-native methods ──────────────────────────────────────

  async signTransaction(params: {
    transaction: string;
  }): Promise<{ signedTransaction: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'signTransaction',
      params: {
        transactionBytes: params.transaction,
      },
    })) as { signedTransactionBytes: string };

    return { signedTransaction: result.signedTransactionBytes };
  }

  async executeTransaction(params: {
    transaction: string;
  }): Promise<{ transactionId: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'executeTransaction',
      params: {
        transactionBytes: params.transaction,
      },
    })) as { transactionId: string };

    return { transactionId: result.transactionId };
  }

  async getBalance(accountId?: string): Promise<{ balance: string; unit: 'tinybar' }> {
    const provider = this._getProviderOrThrow();
    const account = accountId ?? (await this.getAccounts())[0];

    const result = (await provider.request({
      method: 'getBalance',
      params: { accountId: account },
    })) as { balance: string };

    return { balance: result.balance, unit: 'tinybar' };
  }

  async transferHbar(params: HbarTransferParams): Promise<{ transactionId: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'transferHbar',
      params: {
        recipient: params.recipient,
        amount: params.amount,
        memo: params.memo,
      },
    })) as { transactionId: string };

    return { transactionId: result.transactionId };
  }

  async transferToken(params: TokenTransferParams): Promise<{ transactionId: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'transferToken',
      params: {
        tokenId: params.tokenId,
        recipient: params.recipient,
        amount: params.amount,
        memo: params.memo,
      },
    })) as { transactionId: string };

    return { transactionId: result.transactionId };
  }

  async contractCall(params: ContractCallParams): Promise<{ transactionId: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'contractCall',
      params: {
        contractId: params.contractId,
        functionParameters: params.functionParameters,
        gas: params.gas,
        amount: params.amount,
      },
    })) as { transactionId: string };

    return { transactionId: result.transactionId };
  }

  // ─── Events ──────────────────────────────────────────────────────

  on<E extends keyof HederaConnectorEvents>(
    event: E,
    handler: HederaConnectorEvents[E]
  ): void;
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event)!.add(handler);
  }

  off<E extends keyof HederaConnectorEvents>(
    event: E,
    handler: HederaConnectorEvents[E]
  ): void;
  off(event: string, handler: (...args: unknown[]) => void): void {
    this._handlers.get(event)?.delete(handler);
  }

  // ─── Internal ────────────────────────────────────────────────────

  private _captureProvider(): void {
    if (this._provider) return;
    if (typeof window === 'undefined') return;

    const win = window as Window;
    if (win.blade) {
      this._provider = win.blade;
    }
  }

  private _getProviderOrThrow(): BladeProvider {
    this._captureProvider();
    if (!this._provider) {
      throw new Error(
        'Blade Wallet not found. Install the Blade Wallet extension: https://blade_wallet.io/'
      );
    }
    return this._provider;
  }

  private _bindProviderEvents(provider: BladeProvider): void {
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

/**
 * Announce the Blade Hedera provider via EIP-6963 event.
 */
export function announceBladeEIP6963(): void {
  if (typeof window === 'undefined') return;

  const win = window as Window;
  if (!win.blade) return;

  const detail = {
    info: {
      uuid: crypto.randomUUID(),
      name: 'Blade Wallet',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="%232563EB"/><text x="16" y="22" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="bold">B</text></svg>',
      rdns: 'io.blade_wallet',
    },
    provider: win.blade as unknown as HederaProvider,
  };

  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail })
    );
  });

  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', { detail })
  );
}
