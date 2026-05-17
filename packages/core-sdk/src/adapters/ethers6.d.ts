/**
 * ethers v6 Adapter — modern Promise-based API for ethers.js v6.
 *
 * Supports BrowserProvider, JsonRpcSigner, and EIP-1559 transactions
 * through the latest ethers v6 interface.
 *
 * @example
 * ```ts
 * import { Ethers6Adapter } from '@cinaconnect/core-sdk';
 * import { BrowserProvider } from 'ethers';
 *
 * const provider = new BrowserProvider(window.ethereum);
 * const adapter = new Ethers6Adapter(provider);
 * await adapter.connect();
 * ```
 */
import type { Connector, RedirectHandler } from '../connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest, Chain } from '../types.js';
import type { DeepLinkParams, RedirectResult } from '../links/index.js';
import { EventEmitter } from '../events.js';
/** ethers v6 Provider. */
export interface Ethers6Provider {
    getNetwork(): Promise<Ethers6Network>;
    getBalance(address: string, blockTag?: string): Promise<Ethers6BigInt>;
    getBlockNumber(): Promise<number>;
    getGasPrice(): Promise<Ethers6BigInt>;
    getTransaction(hash: string): Promise<Ethers6TransactionResponse | null>;
    getTransactionReceipt(hash: string): Promise<Ethers6TransactionReceipt | null>;
    send(method: string, params: unknown[]): Promise<unknown>;
    call(tx: Ethers6TransactionRequest): Promise<string>;
    listAccounts(): Promise<string[]>;
    getSigner(address?: string): Promise<Ethers6Signer>;
}
/** ethers v6 Network info. */
export interface Ethers6Network {
    chainId: bigint;
    name: string;
}
/** ethers v6 BigInt wrapper. */
export interface Ethers6BigInt {
    toString(): string;
    toHexString(): string;
    toNumber(): number;
}
/** ethers v6 Signer. */
export interface Ethers6Signer {
    getAddress(): Promise<string>;
    getBalance(): Promise<Ethers6BigInt>;
    signMessage(message: string | Uint8Array): Promise<string>;
    signTransaction(transaction: Ethers6TransactionRequest): Promise<string>;
    sendTransaction(transaction: Ethers6TransactionRequest): Promise<Ethers6TransactionResponse>;
    provider?: Ethers6Provider;
}
/** ethers v6 Transaction request. */
export interface Ethers6TransactionRequest {
    from?: string;
    to?: string;
    value?: string | bigint;
    data?: string;
    gasLimit?: string | bigint;
    gasPrice?: string | bigint;
    maxFeePerGas?: string | bigint;
    maxPriorityFeePerGas?: string | bigint;
    nonce?: number | bigint;
    chainId?: number | bigint;
    type?: number;
}
/** ethers v6 Transaction response. */
export interface Ethers6TransactionResponse {
    hash: string;
    from: string;
    to: string | null;
    nonce: number;
    gasLimit: Ethers6BigInt;
    gasPrice?: Ethers6BigInt;
    maxFeePerGas?: Ethers6BigInt;
    maxPriorityFeePerGas?: Ethers6BigInt;
    data: string;
    value: Ethers6BigInt;
    chainId: bigint;
    type: number;
    wait(confirmations?: number): Promise<Ethers6TransactionReceipt>;
}
/** ethers v6 Transaction receipt. */
export interface Ethers6TransactionReceipt {
    hash: string;
    to: string | null;
    from: string;
    contractAddress: string | null;
    blockHash: string;
    blockNumber: number;
    gasUsed: Ethers6BigInt;
    cumulativeGasUsed: Ethers6BigInt;
    status: number;
    logs: Ethers6Log[];
}
/** ethers v6 Log entry. */
export interface Ethers6Log {
    address: string;
    blockHash: string;
    blockNumber: number;
    data: string;
    index: number;
    topics: string[];
    transactionHash: string;
    transactionIndex: number;
    removed?: boolean;
}
/**
 * ethers v6 adapter implementing the CinaConnect Connector interface.
 *
 * Uses the modern Promise-based API of ethers v6 with BrowserProvider
 * and JsonRpcSigner.
 */
export declare class Ethers6Adapter extends EventEmitter implements Connector {
    readonly id = "ethers6";
    readonly name = "ethers v6";
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
     * Create an ethers v6 adapter.
     *
     * @param provider - ethers v6 provider (BrowserProvider, JsonRpcProvider).
     */
    constructor(provider?: Ethers6Provider);
    connect(params?: ConnectParams): Promise<ConnectionResult>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<string[]>;
    getChainId(): Promise<number>;
    switchChain(chainId: number): Promise<void>;
    signMessage(message: string): Promise<string>;
    signTransaction(tx: TransactionRequest): Promise<string>;
    getProvider(): unknown;
    /**
     * Get the ethers v6 Signer.
     */
    getSigner(): Promise<Ethers6Signer>;
    /**
     * Get the ethers v6 Provider.
     */
    getEthersProvider(): Ethers6Provider | null;
    /**
     * Get native balance for an address.
     */
    getBalance(address?: string): Promise<Ethers6BigInt>;
    /**
     * Get current gas price.
     */
    getGasPrice(): Promise<Ethers6BigInt>;
    /**
     * Get current block number.
     */
    getBlockNumber(): Promise<number>;
    /**
     * Send a transaction (supports EIP-1559).
     */
    sendTransaction(tx: TransactionRequest): Promise<Ethers6TransactionResponse>;
    /**
     * Get a transaction by hash.
     */
    getTransaction(hash: string): Promise<Ethers6TransactionResponse | null>;
    /**
     * Get a transaction receipt.
     */
    getTransactionReceipt(hash: string): Promise<Ethers6TransactionReceipt | null>;
    /**
     * Call a contract method (read-only).
     */
    call(to: string, data: string, from?: string): Promise<string>;
    /**
     * Get ERC-20 token balance.
     */
    getTokenBalance(tokenAddress: string, userAddress: string): Promise<string>;
    /**
     * Estimate gas for a transaction.
     */
    estimateGas(tx: TransactionRequest): Promise<Ethers6BigInt>;
    /**
     * Register supported chains.
     */
    registerChains(chains: Chain[]): void;
    /**
     * Find a chain by ID.
     */
    findChain(chainId: number): Chain | undefined;
    /**
     * Set the provider.
     */
    setProvider(provider: Ethers6Provider): void;
}
//# sourceMappingURL=ethers6.d.ts.map