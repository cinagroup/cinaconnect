/**
 * viem Adapter — wraps viem's Client and Transport for CinaConnect.
 *
 * Provides a ChainAdapter-compatible interface using viem's native
 * methods: getAccount, getBalance, sendTransaction, signMessage,
 * and chain switching via switchChain.
 *
 * @example
 * ```ts
 * import { createViemAdapter } from '@cinaconnect/core-sdk';
 *
 * const adapter = createViemAdapter({
 *   chain: mainnet,
 *   transport: http(),
 * });
 *
 * const balance = await adapter.getBalance('0x...');
 * ```
 */
import type { ChainAdapter } from './types.js';
import type { Connector } from '../connector.js';
import type { TransactionRequest, Chain } from '../types.js';
/** Minimal viem Client shape. */
export interface ViemClient {
    /** viem account(s). */
    account?: ViemAccount | ViemAccount[];
    /** viem chain configuration. */
    chain?: ViemChain;
    /** viem transport reference. */
    transport?: ViemTransport;
    /** Make an RPC request through viem. */
    request(args: {
        method: string;
        params?: unknown[];
    }): Promise<unknown>;
    /** Read contract / call RPC helper. */
    call?(args: {
        to: `0x${string}`;
        data?: `0x${string}`;
    }): Promise<{
        data: `0x${string}`;
    }>;
}
/** viem Account (raw, not derived). */
export interface ViemAccount {
    address: `0x${string}`;
    type?: 'json-rpc' | 'local';
    source?: string;
}
/** viem Chain configuration. */
export interface ViemChain {
    id: number;
    name: string;
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: {
        default: {
            http: string[];
        };
    };
    blockExplorers?: {
        default: {
            url: string;
        };
    };
}
/** viem Transport. */
export interface ViemTransport {
    value: {
        request(args: {
            method: string;
            params?: unknown[];
        }): Promise<unknown>;
    };
}
/**
 * viem-backed chain adapter implementing the CinaConnect ChainAdapter interface.
 */
export declare class ViemChainAdapter implements ChainAdapter {
    readonly id = "viem";
    readonly name = "viem";
    private client;
    private connector;
    private chains;
    constructor(client?: ViemClient, connector?: Connector);
    /** Set the active viem client. */
    setClient(client: ViemClient): void;
    /** Set the active connector. */
    setConnector(connector: Connector): void;
    /** Register supported chains. */
    registerChains(chains: Chain[]): void;
    /** Find a registered chain by numeric ID. */
    findChain(chainId: number): Chain | undefined;
    /**
     * Get the connected account address(es).
     * Mirrors viem's wallet_getAccounts.
     *
     * @returns Array of addresses.
     */
    getAccounts(): Promise<string[]>;
    /**
     * Get native balance for an address via viem.
     *
     * @param address - Ethereum address.
     * @returns Balance in wei (hex string).
     */
    getBalance(address: string): Promise<string>;
    /**
     * Send a transaction via viem's client.
     *
     * @param tx - Transaction request.
     * @returns Transaction hash.
     */
    sendTransaction(tx: TransactionRequest): Promise<string>;
    /**
     * Sign a message with the connected account.
     *
     * @param message - Message to sign (hex or UTF-8 string).
     * @returns Signature as hex string.
     */
    signMessage(message: string): Promise<string>;
    /**
     * Switch the active chain.
     *
     * Uses viem's wallet_switchEthereumChain or the connector's switchChain.
     *
     * @param chainId - Target chain ID.
     */
    switchChain(chainId: number): Promise<void>;
    private provider;
    private formatTransaction;
}
/**
 * Create a ViemChainAdapter from a viem client.
 *
 * @param client - viem Client instance.
 * @param connector - Optional CinaConnect Connector.
 * @returns ViemChainAdapter instance.
 */
export declare function createViemAdapter(client?: ViemClient, connector?: Connector): ViemChainAdapter;
//# sourceMappingURL=viem.d.ts.map