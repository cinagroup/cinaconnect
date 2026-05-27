var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
import { Injectable } from '@angular/core';
import { ReplaySubject, BehaviorSubject, } from 'rxjs';
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
let CinacoinService = (() => {
    let _classDecorators = [Injectable({ providedIn: 'root' })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CinacoinService = _classThis = class {
        constructor(options, connector) {
            this.options = options;
            this.connector = connector;
            this._account$ = new ReplaySubject(1);
            this._network$ = new ReplaySubject(1);
            this._open$ = new BehaviorSubject(false);
            this._initialize();
        }
        /** @internal Initialize event listeners on the connector. */
        _initialize() {
            if (!this.connector) {
                this._account$.next({ address: null, chainId: null, balance: null, chainSymbol: null });
                this._network$.next({ chainId: null, name: null, symbol: null, connected: false });
                return;
            }
            // Set up account change listener
            this._onAccountsChangedHandler = (accounts) => {
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
            this._onChainChangedHandler = (_chainId) => {
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
        _emitNetwork() {
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
        async _refreshAccount() {
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
                }
                else {
                    this._account$.next({ address: null, chainId: null, balance: null, chainSymbol: null });
                }
            }
            catch {
                this._account$.next({ address: null, chainId: null, balance: null, chainSymbol: null });
            }
        }
        /** Find chain config by chain ID. */
        _findChain(chainId) {
            if (!chainId || !this.options.chains)
                return undefined;
            const id = Number(chainId);
            return this.options.chains.find((c) => c.id === String(id) || c.id === String(id));
        }
        // -- Reactive State -------------------------------------------------------
        /**
         * Observable of the current account state.
         * Emits on connect, disconnect, and account changes.
         */
        get account$() {
            return this._account$.asObservable();
        }
        /**
         * Observable of the current network state.
         * Emits on chain changes and connect/disconnect.
         */
        get network$() {
            return this._network$.asObservable();
        }
        /** Whether the connection modal is currently open. */
        get isOpen$() {
            return this._open$.asObservable();
        }
        // -- Modal Control ---------------------------------------------------------
        /**
         * Open the Cinacoin connection modal.
         *
         * Triggers wallet discovery and connection flow.
         */
        open() {
            this._open$.next(true);
            // In a full implementation, this would trigger the UI modal.
            // For now, we rely on the ConnectButton component to handle UI.
        }
        /**
         * Close the Cinacoin connection modal.
         */
        close() {
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
        connect(connectorId) {
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
                .catch((err) => {
                this._open$.next(false);
                throw err;
            });
        }
        /**
         * Disconnect from the current wallet.
         *
         * Clears account state and terminates the session.
         */
        disconnect() {
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
        request(args) {
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
        signMessage(message) {
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
            });
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
        sendTransaction(tx) {
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
            });
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
        switchChain(chainId) {
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
        ngOnDestroy() {
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
    };
    __setFunctionName(_classThis, "CinacoinService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CinacoinService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CinacoinService = _classThis;
})();
export { CinacoinService };
//# sourceMappingURL=cinacoin.service.js.map