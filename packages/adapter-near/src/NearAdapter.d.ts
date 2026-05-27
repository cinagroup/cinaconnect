/**
 * NEAR Chain Adapter — provides NEAR-specific wallet connection and transaction operations.
 *
 * Supports NEAR Wallet, Here Wallet, and Meteor Wallet.
 * Implements the ChainAdapter interface from @cinacoin/core-sdk.
 */
import type { ChainAdapter } from '@cinacoin/core-sdk';
import type { Connector } from '@cinacoin/core-sdk';
import type { Chain } from '@cinacoin/core-sdk';
import type { NearWalletConnector } from './types.js';
interface MeteorWalletProvider {
    id: string;
    isConnected: boolean;
    account: {
        accountId: string;
    } | null;
    connect(): Promise<{
        accountId: string;
    }>;
    disconnect(): Promise<void>;
    signAndSendTransaction(params: {
        receiverId: string;
        actions: {
            type: string;
            params: Record<string, unknown>;
        }[];
    }): Promise<{
        transactionHash: string;
    }>;
    sendMoney(params: {
        receiverId: string;
        amount: string;
    }): Promise<{
        transactionHash: string;
    }>;
    signMessage(params: {
        message: string;
        recipient: string;
    }): Promise<{
        signature: string;
    }>;
}
declare global {
    interface Window {
        meteorWallet?: MeteorWalletProvider;
    }
}
/**
 * NEAR chain adapter implementing ChainAdapter from @cinacoin/core-sdk.
 *
 * Provides a unified interface for NEAR wallet operations:
 * - Wallet connection (NEAR Wallet, Here Wallet, Meteor Wallet)
 * - Transaction signing and sending
 * - NEAR token transfers
 * - NEAR account system support
 */
export declare class NearChainAdapter implements ChainAdapter {
    readonly id = "near";
    readonly name = "NEAR Adapter";
    private chains;
    private activeConnector;
    private connectorInstance;
    private rpcUrl;
    private _nearWallet;
    private _hereWallet;
    private _meteorWallet;
    /** Register supported NEAR chains. */
    registerChains(chains: Chain[]): void;
    /** Set the connector from the core SDK. */
    setConnector(connector: Connector): void;
    /** Set a custom RPC URL. */
    setRpcUrl(url: string): void;
    /** Set a client for advanced use cases. */
    setClient(_client: unknown): void;
    /** Get the active wallet connector. */
    getActiveConnector(): NearWalletConnector | null;
    /** Get the currently connected account id. */
    getAccountId(): string | null;
    /**
     * Connect to a NEAR wallet.
     * @param walletId - Wallet id ('near-wallet', 'here-wallet', or 'meteor-wallet').
     *                   Auto-detects if omitted.
     * @returns The connected NEAR account id (e.g. "alice.near").
     */
    connect(walletId?: string): Promise<string>;
    /** Disconnect from the current wallet. */
    disconnect(): Promise<void>;
    /** Get connected account addresses. */
    getAccounts(): Promise<string[]>;
    /**
     * Get native balance for a NEAR account.
     * @param accountId - NEAR account id (e.g. "alice.near").
     * @returns Balance in NEAR (as a decimal string, e.g. "12.345").
     */
    getBalance(accountId: string): Promise<string>;
    /**
     * Sign a NEAR transaction.
     * @param tx - Transaction as NearTransaction or raw format.
     * @returns Transaction hash (not broadcast).
     */
    signTransaction(tx: unknown): Promise<string>;
    /**
     * Send a NEAR transaction (sign + broadcast).
     * @param tx - Transaction as NearTransaction or raw format.
     * @returns Transaction hash.
     */
    sendTransaction(tx: unknown): Promise<string>;
    /**
     * Send a NEAR token transfer.
     * @param receiverId - Recipient NEAR account id.
     * @param amount - Amount in yoctoNEAR (string to handle large numbers).
     * @returns Transaction hash.
     */
    sendTransfer(receiverId: string, amount: string): Promise<string>;
    /**
     * Sign a message with the connected wallet.
     * @param message - Message to sign.
     * @returns Signature as a string.
     */
    signMessage(message: string): Promise<string>;
    /**
     * NEAR does not have chain switching like EVM — it uses separate networks.
     * This method switches the RPC URL to match the target chain.
     * @param _chainId - Chain ID (mapped to chain).
     */
    switchChain(_chainId: number): Promise<void>;
    /** Find a NEAR chain by its ID. */
    findChain(chainId: number): Chain | undefined;
    /** Get supported NEAR wallets with availability status. */
    getSupportedWallets(): {
        available: boolean;
        id: string;
        name: string;
        type: "browser" | "extension" | "injected" | "hardware" | "mobile";
        icon: string;
        downloadUrl?: string;
    }[];
    /** Validate a NEAR account id. */
    static isValidAccountId(accountId: string): boolean;
    private _resolveConnector;
    private _getConnector;
    private _toNearTransaction;
    private _isValidAccountId;
    /** Convert yoctoNEAR to NEAR (24 decimals). */
    private _yoctoToNear;
}
export {};
//# sourceMappingURL=NearAdapter.d.ts.map