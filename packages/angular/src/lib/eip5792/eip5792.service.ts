import { Injectable, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Observable,
  BehaviorSubject,
  ReplaySubject,
  from,
  timer,
  EMPTY,
  throwError,
  defer,
} from 'rxjs';
import {
  switchMap,
  catchError,
  takeWhile,
  tap,
  shareReplay,
  map,
  filter,
  take,
} from 'rxjs/operators';
import { Connector } from '@cinacoin/core-sdk';
import {
  walletGetCapabilities,
  walletSendCalls,
  walletGetCallsStatus,
  buildAtomicBatch,
  executeAtomicBatch,
  supportsAtomicBatch,
  hasCapability,
  getChainCapabilities,
  getSupportedChains,
  filterByCapability,
  allCallsSucceeded,
  getFailedReceipts,
  type WalletCapabilities,
  type ChainCapabilities,
  type Call,
  type SendCallsParams,
  type SendCallsResult,
  type CallsStatus,
  type GetCallsStatusResult,
  type AtomicBatchConfig,
  type AtomicBatchResult,
} from '@cinacoin/core-sdk';
import { CINA_CONNECT_INSTANCE } from '../cinacoin.tokens.js';

/** EIP-1193 provider shape used for EIP-5792 RPC calls. */
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

/** Result of sendCalls() observable. */
export interface SendCallsResultObs {
  /** Batch ID for status polling. */
  id: string;
  /** The raw SendCallsResult from the RPC call. */
  raw: SendCallsResult;
}

/** Options for sendCalls(). */
export interface SendCallsOptions {
  /** Chain ID in hex format (defaults to current chain). */
  chainId?: string;
  /** Override capabilities. */
  capabilities?: WalletCapabilities;
  /** EIP-5792 version string. */
  version?: string;
}

/** Options for atomic batch execution. */
export interface AtomicBatchOptions {
  /** Chain ID in hex format (defaults to current chain). */
  chainId?: string;
  /** Override capabilities. */
  capabilities?: WalletCapabilities;
  /** EIP-5792 version string. */
  version?: string;
  /** Simulate before sending. */
  simulate?: boolean;
}

/** Options for getCallsStatus polling. */
export interface GetCallsStatusOptions {
  /** Polling interval in ms. Default: 2000. */
  intervalMs?: number;
  /** Maximum polling time in ms. Default: 60000. */
  timeoutMs?: number;
}

/**
 * Status observable result for getCallsStatus with auto-polling.
 */
export interface CallsStatusObs {
  /** Current status of the batch. */
  status: CallsStatus | null;
  /** Full result with receipts (when confirmed). */
  result: GetCallsStatusResult | null;
  /** Whether polling is still active. */
  isPolling: boolean;
}

/**
 * RxJS-based Angular service for EIP-5792 Wallet Call API.
 *
 * Provides reactive observables for:
 * - `walletCapabilities$` — capabilities per chain
 * - `sendCalls()` — batch calls with Observable
 * - `atomicBatch()` — atomic batch execution
 * - `getCallsStatus()` — status polling
 *
 * Includes SSR-safe guards: all methods return EMPTY on server-side.
 *
 * ```ts
 * constructor(private eip5792: Eip5792Service) {}
 *
 * this.eip5792.walletCapabilities$.subscribe(caps => {
 *   if (this.eip5792.has(caps, '0x1', 'atomicBatch')) {
 *     // Wallet supports atomic batch on mainnet
 *   }
 * });
 * ```
 *
 * @see https://eips.ethereum.org/EIPS/eip-5792
 */
@Injectable({ providedIn: 'root' })
export class Eip5792Service implements OnDestroy {
  /** Whether we are running in a browser. */
  private readonly _isBrowser: boolean;

  /** Current account address (set when capabilities are fetched). */
  private _address = new BehaviorSubject<string | null>(null);

  /** Current chain ID in hex format. */
  private _chainIdHex = new BehaviorSubject<string | null>(null);

  /** Cached wallet capabilities. */
  private _capabilities = new ReplaySubject<WalletCapabilities | null>(1);

  /** Internal reference to the provider. */
  private _provider: Eip1193Provider | null = null;

  /** Whether a wallet is connected. */
  private _isConnected = new BehaviorSubject<boolean>(false);

  /** Active polling subscriptions for cleanup. */
  private _pollingSubscriptions: Map<string, import('rxjs').Subscription> = new Map();

  constructor(
    @Inject(CINA_CONNECT_INSTANCE) private _connector: Connector,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this._isBrowser = isPlatformBrowser(platformId);

    if (!this._isBrowser) {
      this._capabilities.next(null);
      return;
    }

    this._provider = this._connector?.getProvider?.() as Eip1193Provider | null;

    // Listen for account changes to invalidate capabilities cache
    if (this._provider && typeof this._provider.on === 'function') {
      this._provider.on('accountsChanged', (...args: unknown[]) => {
        const accounts = args[0] as string[];
        if (accounts.length > 0) {
          this._address.next(accounts[0]);
          this._isConnected.next(true);
          this._refreshCapabilities();
        } else {
          this._address.next(null);
          this._isConnected.next(false);
          this._capabilities.next(null);
        }
      });

      this._provider.on('chainChanged', (...args: unknown[]) => {
        const chainId = args[0] as string;
        this._chainIdHex.next(chainId);
        this._refreshCapabilities();
      });

      this._provider.on('disconnect', () => {
        this._address.next(null);
        this._isConnected.next(false);
        this._capabilities.next(null);
      });
    }
  }

  // -- Reactive State -------------------------------------------------------

  /**
   * Observable of wallet capabilities keyed by chain ID (hex).
   *
   * Emits when capabilities are fetched or connection changes.
   */
  get walletCapabilities$(): Observable<WalletCapabilities | null> {
    return this._capabilities.asObservable();
  }

  /** Observable of current connected address. */
  get address$(): Observable<string | null> {
    return this._address.asObservable();
  }

  /** Observable of current chain ID in hex format. */
  get chainIdHex$(): Observable<string | null> {
    return this._chainIdHex.asObservable();
  }

  /** Observable of whether a wallet is connected. */
  get isConnected$(): Observable<boolean> {
    return this._isConnected.asObservable();
  }

  // -- Capability Discovery -------------------------------------------------

  /**
   * Fetch wallet capabilities via `wallet_getCapabilities`.
   *
   * Returns an Observable that emits the capabilities object.
   * Automatically caches and re-emits on subsequent calls.
   *
   * ```ts
   * this.eip5792.fetchWalletCapabilities().subscribe(caps => { ... });
   * ```
   *
   * @returns Observable of WalletCapabilities.
   */
  fetchWalletCapabilities(): Observable<WalletCapabilities> {
    if (!this._isBrowser) return EMPTY;
    if (!this._provider) {
      return throwError(() => new Error('No EIP-1193 provider available'));
    }

    const address = this._address.value;
    if (!address) {
      return throwError(() => new Error('No wallet connected'));
    }

    return defer(async () => {
      const client = this._toWalletClient();
      return await walletGetCapabilities(client, address as `0x${string}`);
    }).pipe(
      tap((caps) => {
        this._capabilities.next(caps);
      }),
      catchError((err) => {
        // Method not supported — return empty capabilities
        if (err instanceof Error && err.message.includes('-32601')) {
          this._capabilities.next({});
          return from(Promise.resolve({} as WalletCapabilities));
        }
        return throwError(() => err);
      }),
      shareReplay(1),
    );
  }

  /**
   * Helper: check if a capability is supported on a chain.
   *
   * ```ts
   * if (has(caps, '0x1', 'atomicBatch')) { ... }
   * ```
   */
  has(
    capabilities: WalletCapabilities | null,
    chainId: string,
    capability: keyof ChainCapabilities,
  ): boolean {
    if (!capabilities) return false;
    return hasCapability(capabilities, chainId, capability);
  }

  /**
   * Helper: get capabilities for a specific chain.
   *
   * ```ts
   * const caps = getChainCaps(capabilities, '0x1');
   * ```
   */
  getChainCaps(
    capabilities: WalletCapabilities | null,
    chainId: string,
  ): ChainCapabilities {
    if (!capabilities) return {};
    return getChainCapabilities(capabilities, chainId);
  }

  /**
   * Helper: filter capabilities to chains with a specific feature.
   *
   * ```ts
   * const atomicChains = filterBy(capabilities, 'atomicBatch');
   * ```
   */
  filterBy(
    capabilities: WalletCapabilities | null,
    capability: keyof ChainCapabilities,
  ): WalletCapabilities {
    if (!capabilities) return {};
    return filterByCapability(capabilities, capability);
  }

  /**
   * Helper: get all supported chain IDs.
   *
   * ```ts
   * const chains = getSupportedChains(capabilities);
   * ```
   */
  getSupportedChains(capabilities: WalletCapabilities | null): string[] {
    if (!capabilities) return [];
    return getSupportedChains(capabilities);
  }

  // -- Batch Calls ----------------------------------------------------------

  /**
   * Send a batch of calls via `wallet_sendCalls`.
   *
   * Returns an Observable that emits the batch ID.
   *
   * ```ts
   * this.eip5792.sendCalls([
   *   { to: '0x...', value: '0x0', data: '0x...' },
   * ]).subscribe(result => {
   *   console.log('Batch ID:', result.id);
   * });
   * ```
   *
   * @param calls - Array of calls to execute.
   * @param options - Optional send options.
   * @returns Observable of SendCallsResultObs.
   */
  sendCalls(calls: Call[], options?: SendCallsOptions): Observable<SendCallsResultObs> {
    if (!this._isBrowser) return EMPTY;
    if (!this._provider) {
      return throwError(() => new Error('No EIP-1193 provider available'));
    }

    const address = this._address.value;
    if (!address) {
      return throwError(() => new Error('No wallet connected'));
    }

    const currentChainId = this._chainIdHex.value ?? '0x1';

    const params: SendCallsParams = {
      version: options?.version ?? '1.0.0',
      calls,
      chainId: (options?.chainId ?? currentChainId) as `0x${string}`,
      from: address as `0x${string}`,
      ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
    };

    return defer(async () => {
      const client = this._toWalletClient();
      const result: SendCallsResult = await walletSendCalls(client, params);
      return { id: result.id, raw: result };
    }).pipe(
      shareReplay(1),
    );
  }

  // -- Atomic Batch ---------------------------------------------------------

  /**
   * Build an atomic batch configuration (without sending).
   *
   * Useful for previewing batch params before execution.
   *
   * ```ts
   * const preview = this.eip5792.buildBatch(calls);
   * console.log('Is atomic?', preview.isAtomic);
   * ```
   */
  buildBatch(calls: Call[], options?: AtomicBatchOptions): AtomicBatchResult {
    const address = this._address.value;
    if (!address) {
      throw new Error('No wallet connected');
    }

    const currentChainId = this._chainIdHex.value ?? '0x1';

    const config: AtomicBatchConfig = {
      chainId: (options?.chainId ?? currentChainId) as `0x${string}`,
      from: address as `0x${string}`,
      calls,
      ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
      ...(options?.version ? { version: options.version } : {}),
    };

    return buildAtomicBatch(config);
  }

  /**
   * Execute a batch of calls atomically via `wallet_sendCalls`.
   *
   * Returns an Observable that emits the batch ID.
   *
   * ```ts
   * this.eip5792.atomicBatch([approveCall, swapCall]).subscribe(result => {
   *   console.log('Batch ID:', result.id);
   * });
   * ```
   *
   * @param calls - Array of calls to execute atomically.
   * @param options - Optional batch options.
   * @returns Observable of SendCallsResultObs.
   */
  atomicBatch(calls: Call[], options?: AtomicBatchOptions): Observable<SendCallsResultObs> {
    if (!this._isBrowser) return EMPTY;
    if (!this._provider) {
      return throwError(() => new Error('No EIP-1193 provider available'));
    }

    const address = this._address.value;
    if (!address) {
      return throwError(() => new Error('No wallet connected'));
    }

    const currentChainId = this._chainIdHex.value ?? '0x1';

    const config: AtomicBatchConfig = {
      chainId: (options?.chainId ?? currentChainId) as `0x${string}`,
      from: address as `0x${string}`,
      calls,
      ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
      ...(options?.version ? { version: options.version } : {}),
      ...(options?.simulate !== undefined ? { simulate: options.simulate } : {}),
    };

    return defer(async () => {
      const client = this._toWalletClient();
      const result: SendCallsResult = await executeAtomicBatch(client, config);
      return { id: result.id, raw: result };
    }).pipe(
      shareReplay(1),
    );
  }

  /**
   * Check if the current chain supports atomic batch transactions.
   *
   * ```ts
   * if (this.eip5792.isAtomicSupported('0x1')) { ... }
   * ```
   */
  isAtomicSupported(chainId?: string): boolean {
    const cid = (chainId ?? this._chainIdHex.value ?? '0x1') as `0x${string}`;
    return supportsAtomicBatch(cid);
  }

  // -- Call Status Polling --------------------------------------------------

  /**
   * Get the status of a call batch with auto-polling.
   *
   * Returns an Observable that emits status updates until confirmed.
   *
   * ```ts
   * this.eip5792.getCallsStatus(batchId).subscribe(status => {
   *   console.log('Status:', status.status);
   *   if (status.status === 'CONFIRMED') {
   *     console.log('All succeeded:', status.result ? allSucceeded(status.result) : false);
   *   }
   * });
   * ```
   *
   * @param callId - Batch ID from wallet_sendCalls.
   * @param options - Polling options.
   * @returns Observable of CallsStatusObs.
   */
  getCallsStatus(callId: string, options?: GetCallsStatusOptions): Observable<CallsStatusObs> {
    if (!this._isBrowser) return EMPTY;
    if (!this._provider) {
      return throwError(() => new Error('No EIP-1193 provider available'));
    }

    const intervalMs = options?.intervalMs ?? 2000;
    const timeoutMs = options?.timeoutMs ?? 60000;

    return timer(0, intervalMs).pipe(
      switchMap(() => {
        const client = this._toWalletClient();
        return from(walletGetCallsStatus(client, callId));
      }),
      map((result: GetCallsStatusResult) => ({
        status: result.status,
        result,
        isPolling: result.status !== 'CONFIRMED',
      })),
      takeWhile((state) => state.status !== 'CONFIRMED', true),
      takeWhile((_state, index) => index * intervalMs < timeoutMs, true),
      catchError((err) => {
        return throwError(() => err);
      }),
      shareReplay(1),
    );
  }

  // -- Status Helpers (pure functions) --------------------------------------

  /**
   * Helper: check if all calls in a batch succeeded.
   *
   * ```ts
   * if (allSucceeded(result)) { ... }
   * ```
   */
  allSucceeded(result: GetCallsStatusResult | null): boolean {
    if (!result) return false;
    return allCallsSucceeded(result);
  }

  /**
   * Helper: get failed receipts from a batch result.
   *
   * ```ts
   * const failed = failedReceipts(result);
   * ```
   */
  failedReceipts(result: GetCallsStatusResult | null): GetCallsStatusResult['receipts'] {
    if (!result) return [];
    return getFailedReceipts(result);
  }

  // -- Internal -------------------------------------------------------------

  /** Build a minimal wallet client wrapper for core-sdk functions. */
  private _toWalletClient(): any {
    if (!this._provider) {
      throw new Error('No EIP-1193 provider available');
    }
    return {
      request: (a: { method: string; params?: unknown[] }) => this._provider!.request(a),
    };
  }

  /** Re-fetch capabilities from the wallet. */
  private _refreshCapabilities(): void {
    if (!this._isBrowser || !this._provider) return;
    const address = this._address.value;
    if (!address) return;

    this.fetchWalletCapabilities().subscribe({
      error: (err) => {
        if (!(err instanceof Error) || !err.message.includes('-32601')) {
          console.warn('[Eip5792] Capability refresh failed:', err);
        }
      },
    });
  }

  /** Clean up polling subscriptions. */
  ngOnDestroy(): void {
    this._pollingSubscriptions.forEach((sub) => sub.unsubscribe());
    this._pollingSubscriptions.clear();
    this._capabilities.complete();
    this._address.complete();
    this._chainIdHex.complete();
    this._isConnected.complete();
  }
}
