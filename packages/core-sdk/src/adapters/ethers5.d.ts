/**
 * ethers v5 Adapter — supports legacy dApps on ethers.js v5.
 *
 * Wraps ethers v5's BrowserProvider / Web3Provider and Signer-based
 * connection model for CinaConnect integration.
 *
 * @example
 * ```ts
 * import { Ethers5Adapter } from '@cinaconnect/core-sdk';
 * import { Web3Provider } from '@ethersproject/providers';
 *
 * const adapter = new Ethers5Adapter(provider);
 * await adapter.connect();
 * ```
 */
import type { Connector, RedirectHandler } from '../connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest, Chain } from '../types.js';
import type { DeepLinkParams, RedirectResult } from '../links/index.js';
import { EventEmitter } from '../events.js';
/** ethers v5 Provider (JsonRpcProvider / Web3Provider / BrowserProvider). */
export interface Ethers5Provider {
    getNetwork(): Promise<Ethers5Network>;
    getBalance(address: string, blockTag?: string): Promise<Ethers5BigNumber>;
    getCode(address: string, blockTag?: string): Promise<string>;
    getGasPrice(): Promise<Ethers5BigNumber>;
    getBlockNumber(): Promise<number>;
    getTransaction(hash: string): Promise<Ethers5TransactionResponse | null>;
    getTransactionReceipt(hash: string): Promise<Ethers5TransactionReceipt | null>;
    send(method: string, params: unknown[]): Promise<unknown>;
    listAccounts(): Promise<string[]>;
    getSigner(index?: number): Ethers5Signer | undefined;
}
/** ethers v5 Network info. */
export interface Ethers5Network {
    chainId: number;
    name: string;
}
/** ethers v5 BigNumber. */
export interface Ethers5BigNumber {
    toString(): string;
    toHexString(): string;
    toNumber(): number;
}
/** ethers v5 Signer. */
export interface Ethers5Signer {
    getAddress(): Promise<string>;
    getBalance(): Promise<Ethers5BigNumber>;
    signMessage(message: string | Uint8Array): Promise<string>;
    signTransaction(transaction: Ethers5TransactionRequest): Promise<string>;
    sendTransaction(transaction: Ethers5TransactionRequest): Promise<Ethers5TransactionResponse>;
    connect(provider: Ethers5Provider): Ethers5Signer;
    provider?: Ethers5Provider;
}
/** ethers v5 Transaction request. */
export interface Ethers5TransactionRequest {
    from?: string;
    to?: string;
    value?: string | Ethers5BigNumber;
    data?: string;
    gasLimit?: string | Ethers5BigNumber;
    gasPrice?: string | Ethers5BigNumber;
    maxFeePerGas?: string | Ethers5BigNumber;
    maxPriorityFeePerGas?: string | Ethers5BigNumber;
    nonce?: number | Ethers5BigNumber;
    chainId?: number;
}
/** ethers v5 Transaction response. */
export interface Ethers5TransactionResponse {
    hash: string;
    from: string;
    to: string | null;
    nonce: number;
    gasLimit: Ethers5BigNumber;
    gasPrice?: Ethers5BigNumber;
    maxFeePerGas?: Ethers5BigNumber;
    maxPriorityFeePerGas?: Ethers5BigNumber;
    data: string;
    value: Ethers5BigNumber;
    chainId: number;
    wait(confirmations?: number): Promise<Ethers5TransactionReceipt>;
}
/** ethers v5 Transaction receipt. */
export interface Ethers5TransactionReceipt {
    transactionHash: string;
    transactionIndex: number;
    blockHash: string;
    blockNumber: number;
    from: string;
    to: string | null;
    gasUsed: Ethers5BigNumber;
    cumulativeGasUsed: Ethers5BigNumber;
    status?: number;
    logs: Ethers5Log[];
}
/** ethers v5 Log entry. */
export interface Ethers5Log {
    address: string;
    blockHash: string;
    blockNumber: number;
    data: string;
    logIndex: number;
    topics: string[];
    transactionHash: string;
    transactionIndex: number;
    removed?: boolean;
}
/**
 * ethers v5 adapter implementing the CinaConnect Connector interface.
 *
 * Wraps an ethers v5 provider and signer for seamless integration
 * with legacy dApps still on ethers v5.
 */
export declare class Ethers5Adapter extends EventEmitter implements Connector {
    readonly id = "ethers5";
    readonly name = "ethers v5";
    readonly icon = "";
    readonly installed: boolean;
    readonly type = "injected";
    private provider;
    private signer;
    private chains;
    openDeepLink(_walletId: string, _uri: string, _params?: Partial<DeepLinkParams>): Promise<RedirectResult>;
    generateDeepLink(_walletId: string, _uri: string, _queryParams?: Record<string, string>): string;
    setRedirectHandler(_handler?: RedirectHandler): void;
    /**
     * Create an ethers v5 adapter.
     *
     * @param provider - ethers v5 provider (Web3Provider, BrowserProvider, etc.)
     */
    constructor(provider?: Ethers5Provider);
    connect(params?: ConnectParams): Promise<ConnectionResult>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<string[]>;
    getChainId(): Promise<number>;
    switchChain(chainId: number): Promise<void>;
    signMessage(message: string): Promise<string>;
    signTransaction(tx: TransactionRequest): Promise<string>;
    getProvider(): unknown;
    /**
     * Get the ethers v5 Signer.
     */
    getSigner(): Promise<Ethers5Signer>;
    /**
     * Get the ethers v5 Provider.
     */
    getEthersProvider(): Ethers5Provider | null;
    /**
     * Get native balance for an address.
     */
    getBalance(address?: string): Promise<Ethers5BigNumber>;
    /**
     * Get current gas price.
     */
    getGasPrice(): Promise<Ethers5BigNumber>;
    /**
     * Get current block number.
     */
    getBlockNumber(): Promise<number>;
    /**
     * Send a transaction.
     */
    sendTransaction(tx: TransactionRequest): Promise<Ethers5TransactionResponse>;
    /**
     * Get a transaction by hash.
     */
    getTransaction(hash: string): Promise<Ethers5TransactionResponse | null>;
    /**
     * Get a transaction receipt.
     */
    getTransactionReceipt(hash: string): Promise<Ethers5TransactionReceipt | null>;
    /**
     * Call a contract method.
     */
    call(to: string, data: string, from?: string): Promise<string>;
    /**
     * Get ERC-20 token balance.
     */
    getTokenBalance(tokenAddress: string, userAddress: string): Promise<string>;
    /**
     * Register supported chains.
     */
    registerChains(chains: Chain[]): void;
    /**
     * Find a chain by ID.
     */
    findChain(chainId: number): Chain | undefined;
    /**
     * Set the provider (useful for reconnection).
     */
    setProvider(provider: Ethers5Provider): void;
}
//# sourceMappingURL=ethers5.d.ts.map