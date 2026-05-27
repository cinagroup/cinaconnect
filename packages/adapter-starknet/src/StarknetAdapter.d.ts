/**
 * Starknet Chain Adapter — provides Starknet-specific wallet connection and transaction operations.
 *
 * Supports Argent X and Braavos wallets with native Starknet account abstraction.
 * Implements the ChainAdapter interface from @cinacoin/core-sdk.
 */
import type { ChainAdapter } from '@cinacoin/core-sdk';
import type { Connector } from '@cinacoin/core-sdk';
import type { Chain } from '@cinacoin/core-sdk';
import type { StarknetWalletConnector } from './types.js';
import { type StarknetCall } from './types.js';
/**
 * Starknet chain adapter implementing ChainAdapter from @cinacoin/core-sdk.
 *
 * Provides a unified interface for Starknet wallet operations:
 * - Wallet connection (Argent X, Braavos)
 * - Transaction signing and execution
 * - Balance queries
 * - Native account abstraction support
 */
export declare class StarknetChainAdapter implements ChainAdapter {
    readonly id = "starknet";
    readonly name = "Starknet Adapter";
    private chains;
    private activeConnector;
    private connectorInstance;
    private rpcUrl;
    private _argentX;
    private _braavos;
    /** Register supported Starknet chains. */
    registerChains(chains: Chain[]): void;
    /** Set the connector from the core SDK. */
    setConnector(connector: Connector): void;
    /** Set a custom RPC URL. */
    setRpcUrl(url: string): void;
    /** Set a client for advanced use cases. */
    setClient(_client: unknown): void;
    /** Get the active wallet connector. */
    getActiveConnector(): StarknetWalletConnector | null;
    /** Get the currently connected account address. */
    getAddress(): string | null;
    /**
     * Connect to a Starknet wallet.
     * @param walletId - Wallet id ('argent-x' or 'braavos'). Auto-detects if omitted.
     * @returns The connected Starknet account address.
     */
    connect(walletId?: string): Promise<string>;
    /** Disconnect from the current wallet. */
    disconnect(): Promise<void>;
    /** Get connected account addresses. */
    getAccounts(): Promise<string[]>;
    /**
     * Get native balance for a Starknet address.
     * @param address - Starknet address (hex with 0x prefix).
     * @returns Balance in ETH (as a decimal string, e.g. "1.234").
     */
    getBalance(address: string): Promise<string>;
    /**
     * Sign a Starknet transaction.
     * @param tx - Transaction as calls array or single call.
     * @returns Signed transaction data (not broadcast).
     */
    signTransaction(tx: unknown): Promise<string>;
    /**
     * Send a transaction (sign + execute).
     * Delegates to the connected wallet's account abstraction layer.
     * @param tx - Transaction as calls array or single call.
     * @returns Transaction hash.
     */
    sendTransaction(tx: unknown): Promise<string>;
    /**
     * Sign a message with the connected wallet.
     * @param message - Message to sign (string or Starknet TypedData).
     * @returns Signature as JSON string.
     */
    signMessage(message: string): Promise<string>;
    /**
     * Starknet does not have traditional chain switching — it has networks.
     * This method switches the RPC URL to match the target chain.
     * @param _chainId - Chain ID (mapped to chain).
     */
    switchChain(_chainId: number): Promise<void>;
    /**
     * Execute a Starknet transaction (alias for sendTransaction).
     * @param calls - Transaction calls.
     * @param details - Optional transaction details.
     * @returns Transaction hash.
     */
    executeTransaction(calls: StarknetCall | StarknetCall[], details?: Record<string, unknown>): Promise<string>;
    /** Find a Starknet chain by its ID. */
    findChain(chainId: number): Chain | undefined;
    /** Get supported Starknet wallets. */
    getSupportedWallets(): {
        available: boolean;
        id: string;
        name: string;
        rdns: string;
        icon: string;
        downloadUrl: string;
    }[];
    /** Validate a Starknet address. */
    static isValidAddress(address: string): boolean;
    private _resolveConnector;
    private _getConnector;
    private _toCalls;
    private _isValidAddress;
}
//# sourceMappingURL=StarknetAdapter.d.ts.map