import { Injectable, Inject, OnDestroy } from '@angular/core';
import {
  Observable,
  ReplaySubject,
  BehaviorSubject,
  from,
  EMPTY,
} from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Connector, Chain, TransactionRequest } from '@cinacoin/core-sdk';
import {
  CINA_CONNECT_INSTANCE,
  CINA_CONNECT_OPTIONS,
  type CinacoinAngularConfig,
} from './cinacoin.tokens.js';

/** Account state returned by the SDK. */
export interface Account {
  /** Connected wallet address. */
  address: string | null;
  /** Current chain ID. */
  chainId: number | null;
  /** Account balance (in smallest unit / wei). */
  balance: string | null;
  /** Native currency symbol. */
  chainSymbol: string | null;
}

/** Network state. */
export interface Network {
  /** Chain ID. */
  chainId: number | null;
  /** Chain name. */
  name: string | null;
  /** Native currency symbol. */
  symbol: string | null;
  /** Whether a connection is active. */
  connected: boolean;
}

/**
 * Injectable Angular service for interacting with Cinacoin Core SDK.
 *
 * Provides reactive state via RxJS Observables and imperative wallet operations.
 *
 * ```ts
 * constructor(private cina: CinacoinService) {}
 *
 * ngOnInit() {
 *   this.cina.account$.subscribe(account => { ... });
 * }
 *
 * connect() {
 *   this.cina.open();
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CinacoinService implements OnDestroy {
  private _account$ = new ReplaySubject<Account>(1);
  private _network$ = new ReplaySubject<Network>(1);
  private _open$ = new BehaviorSubject<boolean>(false);

  private _onAccountsChangedHandler?: (accounts: string[]) => void;
  private _onChainChangedHandler?: (chainId: string) => void;
  private _onDisconnectHandler?: () => void;

  constructor(
    @Inject(CINA_CONNECT_OPTIONS) private options: CinacoinAngularConfig,
    @Inject(CINA_CONNECT_INSTANCE) private connector: Connector,
  ) {
    this._initialize();
  }

  /** @internal Initialize event listeners on the connector. */
  private _initialize(): void {
    if (!this.connector) {
      this._account$.next({ address: null, chainId: null, balance: null, chainSymbol: null });
      this._network$.next({ chainId: null, name: null, symbol: null, connected: false });
      return;
    }

    // Set up account change listener
    this._onAccountsChangedHandler = (accounts: string[]) => {
      if (accounts.length > 0) {
        const address = accounts[0];
        const chainId = this.connector.getChainId?.() ?? null;
        this._account$.next({
          address,
          chainId: chainId ? Number(chainId) : null,
          balance: null,
          chainSymbol: null,
        });
        this._emitNetwork();
      }
    };

    // Set up chain change listener
    this._onChainChangedHandler = (_chainId: string) => {
      this._emitNetwork();
      this._refreshAccount();
    };

    // Set up disconnect listener
    this._onDisconnectHandler = () => {
      this._account$.next({ address: null, chainId: null, balance: null, chainSymbol: null });
      this._network$.next({ chainId: null, name: null, symbol: null, connected: false });
      this._open$.next(false);
    };

    // Register listeners on the underlying provider if available
    const provider = this.connector.getProvider?.();
    if (provider && typeof provider.on === 'function') {
      provider.on('accountsChanged', this._onAccountsChangedHandler);
      provider.on('chainChanged', this._onChainChangedHandler);
      provider.on('disconnect', this._onDisconnectHandler);
    }

    // Emit initial state
    this._emitNetwork();
    this._refreshAccount();
  }

  /** Emit current network state. */
  private _emitNetwork(): void {
    const chainId = this.connector.getChainId?.() ?? null;
    const chain = this._findChain(chainId);
    this._network$.next({
      chainId: chainId ? Number(chainId) : null,
      name: chain?.name ?? null,
      symbol: chain?.nativeCurrency?.symbol ?? null,
      connected: chainId != null,
    });
  }

  /** Refresh account state from connector. */
  private async _refreshAccount(): Promise<void> {
    try {
      const accounts = await this.connector.getAccounts?.();
      const chainId = this.connector.getChainId?.();
      const chain = this._findChain(chainId);

      if (accounts && accounts.length > 0) {
        this._account$.next({
          address: accounts[0],
          chainId: chainId ? Number(chainId) : null,
          balance: null,
          chainSymbol: chain?.nativeCurrency?.symbol ?? null,
        });
      } else {
        this._account$.next({ address: null, chainId: null, balance: null, chainSymbol: null });
      }
    } catch {
      this._account$.next({ address: null, chainId: null, balance: null, chainSymbol: null });
    }
  }

  /** Find chain config by chain ID. */
  private _findChain(chainId: number | string | null | undefined): Chain | undefined {
    if (!chainId || !this.options.chains) return undefined;
    const id = Number(chainId);
    return this.options.chains.find((c) => c.id === String(id) || c.id === String(id));
  }

  // -- Reactive State -------------------------------------------------------

  /**
   * Observable of the current account state.
   * Emits on connect, disconnect, and account changes.
   */
  get account$(): Observable<Account> {
    return this._account$.asObservable();
  }

  /**
   * Observable of the current network state.
   * Emits on chain changes and connect/disconnect.
   */
  get network$(): Observable<Network> {
    return this._network$.asObservable();
  }

  /** Whether the connection modal is currently open. */
  get isOpen$(): Observable<boolean> {
    return this._open$.asObservable();
  }

  // -- Modal Control ---------------------------------------------------------

  /**
   * Open the Cinacoin connection modal.
   *
   * Triggers wallet discovery and connection flow.
   */
  open(): void {
    this._open$.next(true);
    // In a full implementation, this would trigger the UI modal.
    // For now, we rely on the ConnectButton component to handle UI.
  }

  /**
   * Close the Cinacoin connection modal.
   */
  close(): void {
    this._open$.next(false);
  }

  // -- Wallet Operations ------------------------------------------------------

  /**
   * Connect to a wallet using the specified connector ID.
   *
   * ```ts
   * await cinaConnect.connect('metamask');
   * ```
   *
   * @param connectorId - The connector ID (e.g., 'metamask', 'walletconnect').
   * @returns Promise resolving when connection is established.
   */
  connect(connectorId?: string): Promise<void> {
    if (!this.connector) {
      return Promise.reject(new Error('Cinacoin connector not initialized'));
    }
    this._open$.next(true);
    return this.connector
      .connect({ chains: this.options.chains?.map((c) => Number(c.id)) })
      .then((result) => {
        this._open$.next(false);
        if (result && result.accounts && result.accounts.length > 0) {
          this._account$.next({
            address: result.accounts[0],
            chainId: result.chainId ?? null,
            balance: null,
            chainSymbol: null,
          });
        }
        this._emitNetwork();
      })
      .catch((err: unknown) => {
        this._open$.next(false);
        throw err;
      });
  }

  /**
   * Disconnect from the current wallet.
   *
   * Clears account state and terminates the session.
   */
  disconnect(): Promise<void> {
    if (!this.connector) {
      return Promise.reject(new Error('Cinacoin connector not initialized'));
    }
    return this.connector.disconnect().then(() => {
      this._account$.next({ address: null, chainId: null, balance: null, chainSymbol: null });
      this._network$.next({ chainId: null, name: null, symbol: null, connected: false });
      this._open$.next(false);
    });
  }

  /**
   * Send a wallet request (generic JSON-RPC).
   *
   * ```ts
   * const result = await cinaConnect.request({
   *   method: 'eth_signTypedData_v4',
   *   params: [address, JSON.stringify(data)]
   * });
   * ```
   *
   * @param args - JSON-RPC request parameters.
   * @returns Promise resolving with the request result.
   */
  request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    if (!this.connector) {
      return Promise.reject(new Error('Cinacoin connector not initialized'));
    }
    const provider = this.connector.getProvider?.();
    if (!provider || typeof provider.request !== 'function') {
      return Promise.reject(new Error('Provider does not support request()'));
    }
    return provider.request(args);
  }

  /**
   * Sign a message with the connected wallet.
   *
   * ```ts
   * const signature = await cinaConnect.signMessage('Hello, world!');
   * ```
   *
   * @param message - The message to sign (string or hex).
   * @returns Promise resolving with the signature.
   */
  signMessage(message: string): Promise<string> {
    if (!this.connector) {
      return Promise.reject(new Error('Cinacoin connector not initialized'));
    }
    // Try personal_sign first, fall back to eth_sign
    const provider = this.connector.getProvider?.();
    if (!provider || typeof provider.request !== 'function') {
      return Promise.reject(new Error('Provider does not support signing'));
    }

    const address = this._account$.value.address;
    if (!address) {
      return Promise.reject(new Error('No account connected'));
    }

    const hexMessage = '0x' + Buffer.from(message, 'utf8').toString('hex');
    return provider.request({
      method: 'personal_sign',
      params: [hexMessage, address],
    }) as Promise<string>;
  }

  /**
   * Send a transaction.
   *
   * ```ts
   * const txHash = await cinaConnect.sendTransaction({
   *   to: '0x...',
   *   value: '1000000000000000000', // 1 ETH in wei
   * });
   * ```
   *
   * @param tx - Transaction parameters.
   * @returns Promise resolving with the transaction hash.
   */
  sendTransaction(tx: TransactionRequest): Promise<string> {
    if (!this.connector) {
      return Promise.reject(new Error('Cinacoin connector not initialized'));
    }
    const provider = this.connector.getProvider?.();
    if (!provider || typeof provider.request !== 'function') {
      return Promise.reject(new Error('Provider does not support transactions'));
    }
    return provider.request({
      method: 'eth_sendTransaction',
      params: [tx],
    }) as Promise<string>;
  }

  /**
   * Switch to a different chain.
   *
   * ```ts
   * await cinaConnect.switchChain(1); // Ethereum mainnet
   * ```
   *
   * @param chainId - The target chain ID.
   */
  switchChain(chainId: number): Promise<void> {
    if (!this.connector) {
      return Promise.reject(new Error('Cinacoin connector not initialized'));
    }
    const provider = this.connector.getProvider?.();
    if (!provider || typeof provider.request !== 'function') {
      return Promise.reject(new Error('Provider does not support chain switching'));
    }
    return provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    }).then(() => {
      this._emitNetwork();
      this._refreshAccount();
    });
  }

  /** Clean up event listeners. */
  ngOnDestroy(): void {
    const provider = this.connector?.getProvider?.();
    if (provider && typeof provider.removeListener === 'function') {
      if (this._onAccountsChangedHandler) {
        provider.removeListener('accountsChanged', this._onAccountsChangedHandler);
      }
      if (this._onChainChangedHandler) {
        provider.removeListener('chainChanged', this._onChainChangedHandler);
      }
      if (this._onDisconnectHandler) {
        provider.removeListener('disconnect', this._onDisconnectHandler);
      }
    }
    this._account$.complete();
    this._network$.complete();
    this._open$.complete();
  }
}
