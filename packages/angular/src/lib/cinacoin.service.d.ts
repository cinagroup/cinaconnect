import { OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Connector, TransactionRequest } from '@cinacoin/core-sdk';
import { type CinacoinAngularConfig } from './cinacoin.tokens.js';
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
export declare class CinacoinService implements OnDestroy {
    private options;
    private connector;
    private _account$;
    private _network$;
    private _open$;
    private _onAccountsChangedHandler?;
    private _onChainChangedHandler?;
    private _onDisconnectHandler?;
    constructor(options: CinacoinAngularConfig, connector: Connector);
    /** @internal Initialize event listeners on the connector. */
    private _initialize;
    /** Emit current network state. */
    private _emitNetwork;
    /** Refresh account state from connector. */
    private _refreshAccount;
    /** Find chain config by chain ID. */
    private _findChain;
    /**
     * Observable of the current account state.
     * Emits on connect, disconnect, and account changes.
     */
    get account$(): Observable<Account>;
    /**
     * Observable of the current network state.
     * Emits on chain changes and connect/disconnect.
     */
    get network$(): Observable<Network>;
    /** Whether the connection modal is currently open. */
    get isOpen$(): Observable<boolean>;
    /**
     * Open the Cinacoin connection modal.
     *
     * Triggers wallet discovery and connection flow.
     */
    open(): void;
    /**
     * Close the Cinacoin connection modal.
     */
    close(): void;
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
    connect(connectorId?: string): Promise<void>;
    /**
     * Disconnect from the current wallet.
     *
     * Clears account state and terminates the session.
     */
    disconnect(): Promise<void>;
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
    request(args: {
        method: string;
        params?: unknown[];
    }): Promise<unknown>;
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
    signMessage(message: string): Promise<string>;
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
    sendTransaction(tx: TransactionRequest): Promise<string>;
    /**
     * Switch to a different chain.
     *
     * ```ts
     * await cinaConnect.switchChain(1); // Ethereum mainnet
     * ```
     *
     * @param chainId - The target chain ID.
     */
    switchChain(chainId: number): Promise<void>;
    /** Clean up event listeners. */
    ngOnDestroy(): void;
}
//# sourceMappingURL=cinacoin.service.d.ts.map