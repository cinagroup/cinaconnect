/**
 * Sui Chain Adapter — provides Sui-specific blockchain operations.
 *
 * Implements the {@link ChainAdapter} interface from @cinacoin/core-sdk
 * and adds Sui-native methods for object queries, SUI balance lookups,
 * and transaction execution on the Sui network.
 *
 * Supports Sui Wallet, Ethos, Suiet, and Martian wallet connectors.
 *
 * @example
 * ```ts
 * import { SuiChainAdapter, SUI_CHAINS } from '@cinacoin/adapter-sui';
 *
 * const adapter = new SuiChainAdapter();
 * adapter.registerChains(SUI_CHAINS);
 *
 * await adapter.connect();
 * const balance = await adapter.getBalance(adapter.getAddress()!);
 * console.log(`Balance: ${balance} SUI`);
 * ```
 *
 * @packageDocumentation
 */
import type { Connector } from '@cinacoin/core-sdk';
import type { Chain } from '@cinacoin/core-sdk';
import type { ChainAdapter } from '@cinacoin/core-sdk';
import { type SuiCoinBalance, type SuiObjectResponse, type SuiTransactionEffects, type SuiTransactionCall, type SuiTransferSui, type SuiNetwork, type SuiChainPreset } from './types.js';
import type { SuiConnector } from './types.js';
/** Well-known Sui chain presets. */
export declare const SUI_CHAINS: SuiChainPreset[];
/** Supported Sui wallets for discovery / UI rendering. */
export interface SuiWalletInfo {
    id: string;
    name: string;
    icon: string;
    rdns?: string;
    /** URL to install the wallet if not present. */
    downloadUrl: string;
}
export declare const SUI_WALLETS: SuiWalletInfo[];
/**
 * Convert MIST to SUI (1 SUI = 10^9 MIST).
 */
export declare function mistToSui(mist: string | number | bigint): string;
/**
 * Convert SUI to MIST.
 */
export declare function suiToMist(sui: string | number | bigint): bigint;
/**
 * Sui chain adapter implementing chain-specific operations.
 *
 * Wraps a connector/provider with Sui-specific JSON-RPC calls for
 * balance queries, object lookups, transaction signing and execution.
 *
 * Implements {@link ChainAdapter} for compatibility with the core SDK.
 */
export declare class SuiChainAdapter implements ChainAdapter {
    readonly id = "sui";
    readonly name = "Sui Chain Adapter";
    private provider;
    private chains;
    private currentNetwork;
    private rpcUrl;
    /** Registered connectors for discovery. */
    private connectors;
    constructor();
    /**
     * Register a Sui wallet connector for discovery.
     */
    registerConnector(connector: SuiConnector): void;
    /**
     * Get all registered connectors.
     */
    getConnectors(): SuiConnector[];
    /**
     * Get connectors that are currently available (wallet installed).
     */
    getAvailableConnectors(): SuiConnector[];
    /**
     * Set the underlying connector (compatibility shim).
     * @deprecated Use the adapter's own connect() method instead.
     */
    setConnector(connector: Connector): void;
    /**
     * Register supported Sui chains.
     *
     * @param chains - Array of chain definitions. Each chain must have
     *   an `id` (e.g. "sui:mainnet") and an `rpcUrl`.
     */
    registerChains(chains: Chain[]): void;
    /**
     * Find a Sui chain by its ID.
     */
    findChain(chainId: number): Chain | undefined;
    /**
     * Get connected account addresses.
     *
     * @returns Array with the connected Sui address, or empty array.
     */
    getAccounts(): Promise<string[]>;
    /**
     * Get SUI balance for an address.
     *
     * @param address - Sui address (hex with 0x prefix).
     * @returns Balance in SUI as a decimal string (e.g. "1.234").
     */
    getBalance(address: string, coinType?: string): Promise<string>;
    /**
     * Send a transaction (alias for executeTransaction for ChainAdapter compat).
     *
     * @param tx - Serialized transaction bytes as a base64 string.
     * @returns Transaction digest.
     */
    sendTransaction(tx: string | {
        txBytes: string;
    }): Promise<string>;
    /**
     * Sign a message.
     *
     * @param message - Message string to sign.
     * @returns Signature as a base64 string.
     */
    signMessage(message: string): Promise<string>;
    /**
     * Switch the active Sui network.
     *
     * @param network - Network identifier: "mainnet", "testnet", "devnet", or "localnet".
     *   Also accepts the Sui chain ID string (e.g. "sui:testnet").
     */
    switchChain(chainId: number): Promise<void>;
    switchChain(chainId: SuiNetwork | string): Promise<void>;
    /**
     * Get the currently connected address.
     *
     * @returns The Sui address string, or null if not connected.
     */
    getAddress(): string | null;
    /**
     * Connect to a Sui wallet.
     *
     * If `walletId` is provided, attempts to connect using that specific
     * connector. Otherwise, tries available connectors in order:
     * Sui Wallet → Suiet → Ethos.
     *
     * @param walletId - Optional wallet connector id
     *   ("sui-wallet", "ethos", "suiet").
     * @returns Connected address.
     */
    connect(walletId?: string): Promise<string>;
    /**
     * Disconnect from the current wallet.
     */
    disconnect(): Promise<void>;
    /**
     * Whether a wallet is currently connected.
     */
    isConnected(): boolean;
    /**
     * Get the current Sui network.
     */
    getNetwork(): SuiNetwork;
    /**
     * Get the current RPC URL.
     */
    getRpcUrl(): string;
    /**
     * Sign a Sui transaction.
     *
     * @param tx - Serialized transaction bytes as a base64 string.
     * @returns Signed transaction bytes and signature.
     */
    signTransaction(tx: string): Promise<{
        bytes: string;
        signature: string;
    }>;
    /**
     * Execute a Sui transaction on the network.
     *
     * This signs the transaction via the connected wallet and submits it
     * to the Sui network, waiting for local execution confirmation.
     *
     * @param tx - Serialized transaction bytes as a base64 string.
     * @returns Transaction digest (hash).
     */
    executeTransaction(tx: string, options?: {
        requestType?: 'WaitForLocalExec' | 'WaitForEffectsCert';
    }): Promise<string>;
    /**
     * Build and execute a SUI coin transfer.
     *
     * Convenience method that constructs a TransferSUI transaction
     * and executes it through the connected wallet.
     *
     * @param params - Transfer parameters.
     * @returns Transaction digest.
     */
    transferSui(params: SuiTransferSui): Promise<string>;
    /**
     * Build a Move function call transaction.
     *
     * @param call - Move function call descriptor.
     * @returns Transaction bytes as base64 string.
     */
    buildMoveCall(call: SuiTransactionCall): string;
    /**
     * Query a Sui object by its ID.
     *
     * @param objectId - Sui object ID (hex with 0x prefix).
     * @returns Object response with data or error.
     */
    getObject(objectId: string): Promise<SuiObjectResponse>;
    /**
     * Get all SUI coin objects owned by an address.
     *
     * @param address - Sui address.
     * @param cursor - Optional pagination cursor.
     * @returns Coin objects owned by the address.
     */
    getCoins(address: string, coinType?: string, cursor?: string): Promise<{
        data: Array<{
            coinType: string;
            coinObjectId: string;
            version: string;
            digest: string;
            balance: string;
        }>;
        hasNextPage: boolean;
        nextCursor?: string;
    }>;
    /**
     * Get the total SUI balance (shortcut for getBalance).
     *
     * @param address - Sui address.
     * @returns Balance in SUI as a decimal string.
     */
    getSuiBalance(address: string): Promise<string>;
    /**
     * Get all coin types owned by an address.
     *
     * @param address - Sui address.
     */
    getAllBalances(address: string): Promise<SuiCoinBalance[]>;
    /**
     * Get transaction effects by digest.
     *
     * @param digest - Transaction digest.
     */
    getTransactionEffects(digest: string): Promise<SuiTransactionEffects>;
    /**
     * Get the current network epoch info.
     */
    getEpochInfo(): Promise<{
        epoch: string;
        referenceGasPrice: string;
    }>;
    /**
     * Get reference gas price for the current epoch.
     *
     * @returns Reference gas price in MIST.
     */
    getReferenceGasPrice(): Promise<string>;
    /**
     * Make a JSON-RPC call to the Sui full node.
     */
    private _rpcCall;
    /**
     * Bind provider event listeners to clear state on disconnect.
     */
    private _bindProviderEvents;
}
//# sourceMappingURL=SuiAdapter.d.ts.map