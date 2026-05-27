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
 * Shape of the HashPack provider injected at `window.hedera`.
 *
 * @see https://www.hashpack.app/
 */
interface HashPackProvider {
  request: <T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    hedera?: {
      hashpack?: HashPackProvider;
    };
  }
}

/**
 * HashPack Wallet connector for Hedera Hashgraph.
 *
 * Detects `window.hedera.hashpack` and wraps it with the standard
 * {@link HederaConnector} interface.
 *
 * @see https://www.hashpack.app/
 *
 * @example
 * ```ts
 * const hashpack = new HashPackConnector();
 * if (hashpack.isAvailable()) {
 *   const result = await hashpack.connect();
 *   console.log(result.accounts); // ["0.0.12345"]
 * }
 * ```
 */
export class HashPackConnector implements HederaConnector {
  readonly id = 'hashpack';
  readonly name = 'HashPack Wallet';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23000"/><text x="16" y="22" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="bold">HP</text></svg>';
  readonly platforms: HederaPlatform[] = ['browser', 'extension'];
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
  private _provider: HashPackProvider | null = null;

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
    })) as { account: string; network: HederaNetwork };

    this._bindProviderEvents(provider);

    return {
      accounts: [result.account],
      network: result.network,
      provider: provider as HederaProvider,
    };
  }

  async disconnect(): Promise<void> {
    const provider = this._provider;
    if (provider) {
      try {
        await provider.request({ method: 'disconnect' });
      } catch (err) { console.warn('[hashpack] Operation failed:', err instanceof Error ? err.message : String(err));
        // HashPack may not support programmatic disconnect
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
      method: 'getAccount',
    })) as { account: string };
    return [result.account];
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
      method: 'changeNetwork',
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
        transactionData: params.transaction,
      },
    })) as { signedTransaction: string };

    return { signedTransaction: result.signedTransaction };
  }

  async executeTransaction(params: {
    transaction: string;
  }): Promise<{ transactionId: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'executeTransaction',
      params: {
        transactionData: params.transaction,
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
    if (win.hedera?.hashpack) {
      this._provider = win.hedera.hashpack;
    }
  }

  private _getProviderOrThrow(): HashPackProvider {
    this._captureProvider();
    if (!this._provider) {
      throw new Error(
        'HashPack Wallet not found. Install the HashPack browser extension: https://www.hashpack.app/'
      );
    }
    return this._provider;
  }

  private _bindProviderEvents(provider: HashPackProvider): void {
    provider.on('accountChanged', (account: unknown) => {
      const handlers = this._handlers.get('accountsChanged') ?? new Set();
      for (const handler of handlers) {
        handler(account);
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
 * Announce the HashPack Hedera provider via EIP-6963 event.
 */
export function announceHashPackEIP6963(): void {
  if (typeof window === 'undefined') return;

  const win = window as Window;
  if (!win.hedera?.hashpack) return;

  const detail = {
    info: {
      uuid: crypto.randomUUID(),
      name: 'HashPack Wallet',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23000"/><text x="16" y="22" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="bold">HP</text></svg>',
      rdns: 'app.hashpack',
    },
    provider: win.hedera.hashpack as unknown as HederaProvider,
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
