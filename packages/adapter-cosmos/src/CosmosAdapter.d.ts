/**
 * Cosmos Chain Adapter for Cinacoin.
 *
 * Provides a unified interface for interacting with Cosmos SDK chains:
 * Cosmos Hub, Osmosis, Injective, Celestia, and more.
 *
 * Supports Keplr and Leap wallet connectors for signing and transaction
 * broadcasting. Uses @cosmjs/stargate for RPC queries and transaction building.
 *
 * @example
 * ```ts
 * const cosmos = new CosmosAdapter({
 *   chainId: 'cosmoshub-4',
 *   rpcUrl: 'https://rpc.cosmos.network',
 * });
 * const { address } = await cosmos.connect();
 * await cosmos.sendTransfer({
 *   to: 'cosmos1...',
 *   amount: 1000000,
 *   denom: 'uatom',
 * });
 * ```
 *
 * @packageDocumentation
 */
import type { Connector } from '@cinacoin/core-sdk';
import type { Chain } from '@cinacoin/core-sdk';
import type { CosmosWalletConnector, CosmosChainId, Coin, TxResult, TransferParams } from './types.js';
/** Well-known Cosmos SDK chain presets. */
export declare const COSMOS_CHAINS: Chain[];
/**
 * Chain metadata for well-known Cosmos SDK chains.
 * Includes bech32 prefixes, coin types, and REST endpoints.
 */
export declare const COSMOS_CHAIN_INFO: Record<string, {
    chainId: CosmosChainId;
    name: string;
    rpcUrl: string;
    restUrl: string;
    bech32Prefix: string;
    coinType: number;
    nativeDenom: string;
    nativeSymbol: string;
    nativeDecimals: number;
}>;
/**
 * Configuration for creating a CosmosAdapter instance.
 */
export interface CosmosAdapterConfig {
    /** Cosmos chain ID (e.g. "cosmoshub-4"). */
    chainId: CosmosChainId;
    /** RPC endpoint URL for Tendermint/Cosmos RPC. */
    rpcUrl?: string;
    /** REST (LCD) endpoint URL for queries. */
    restUrl?: string;
    /** Preferred wallet connector ("keplr" or "leap"). */
    wallet?: 'keplr' | 'leap';
}
/**
 * Result from a `connect()` call.
 */
export interface CosmosConnectResult {
    /** Bech32 address of the connected account. */
    address: string;
    /** Connected chain ID. */
    chainId: string;
}
/**
 * Cosmos chain adapter implementing the Cinacoin `ChainAdapter` pattern.
 *
 * Wraps a wallet connector (Keplr or Leap) with chain-specific operations:
 * connecting, signing, transferring tokens, and querying balances.
 *
 * Uses @cosmjs/stargate under the hood for transaction building and
 * RPC communication.
 */
export declare class CosmosAdapter {
    /** Unique adapter identifier. */
    readonly id: string;
    /** Human-readable adapter name. */
    readonly name: string;
    private _chainId;
    private _rpcUrl;
    private _restUrl;
    private _connector;
    private _address;
    private _chains;
    private _preferredWallet;
    constructor(config: CosmosAdapterConfig);
    /** Set the Cinacoin connector (optional for Cosmos adapters). */
    setConnector(_connector: Connector): void;
    /** Register supported Cosmos chains. */
    registerChains(chains: Chain[]): void;
    /**
     * Set the RPC endpoint URL.
     * @param url - Tendermint/Cosmos RPC URL.
     */
    setRpcUrl(url: string): void;
    /**
     * Set the REST (LCD) endpoint URL.
     * @param url - Cosmos REST API URL.
     */
    setRestUrl(url: string): void;
    /** Find a chain by numeric ID (Cosmos chains use string IDs — returns first chain). */
    findChain(_chainId: number): Chain | undefined;
    /** Get the current wallet connector. */
    getConnector(): CosmosWalletConnector | null;
    /**
     * Resolve the preferred wallet connector.
     *
     * Tries the preferred wallet first (Keplr by default), then falls back
     * to the other if not available.
     *
     * @param walletId - Override the preferred wallet ("keplr" or "leap").
     * @returns The resolved connector, or null if neither is available.
     */
    resolveWallet(walletId?: 'keplr' | 'leap'): CosmosWalletConnector | null;
    /**
     * Connect to a Cosmos wallet.
     *
     * Resolves the available wallet connector (Keplr → Leap by default),
     * requests chain permissions, and returns the connected address.
     *
     * @param walletId - Override wallet preference ("keplr" | "leap").
     * @returns Connected address and chain ID.
     */
    connect(walletId?: 'keplr' | 'leap'): Promise<CosmosConnectResult>;
    /**
     * Disconnect from the wallet and clear session state.
     */
    disconnect(): Promise<void>;
    /**
     * Get the connected bech32 address.
     * @returns Address string or null if not connected.
     */
    getAddress(): string | null;
    /**
     * Query the native token balance for a given address.
     *
     * Uses the REST (LCD) endpoint to fetch account balances.
     * Falls back to RPC query if REST is unavailable.
     *
     * @param address - Bech32-encoded Cosmos address.
     * @returns Array of Coin objects with denom and amount.
     */
    getBalance(address: string): Promise<Coin[]>;
    /**
     * Get the native token balance as a human-readable decimal string.
     *
     * @param address - Bech32 address.
     * @param denom - Token denomination (defaults to chain native denom).
     * @returns Balance as a decimal string (e.g. "1.234567").
     */
    getBalanceFormatted(address: string, denom?: string): Promise<string>;
    /**
     * Send a token transfer.
     *
     * Builds a MsgSend transaction, signs it via the connected wallet,
     * and broadcasts it to the network.
     *
     * @param params - Transfer parameters (to, amount, denom, optional memo).
     * @returns Transaction result with hash and status.
     */
    sendTransfer(params: TransferParams): Promise<TxResult>;
    /**
     * Sign a transaction.
     *
     * Delegates to the connected wallet's signing method.
     *
     * @param tx - Transaction object to sign (Cosmos SignDoc or raw tx).
     * @returns Signature as hex string.
     */
    signTransaction(tx: unknown): Promise<string>;
    /**
     * Sign an arbitrary message.
     *
     * @param message - Message string to sign.
     * @returns Signature as hex string.
     */
    signMessage(message: string): Promise<string>;
    /**
     * Get the current chain ID.
     * @returns Cosmos chain ID string.
     */
    getChainId(): string;
    /**
     * Get native token denomination for the current chain.
     * @returns Native denom (e.g. "uatom").
     */
    getNativeDenom(): string;
    /**
     * Switch to a different Cosmos chain.
     *
     * Updates the chain ID and resolves new RPC/REST endpoints from the
     * built-in chain presets.
     *
     * @param chainId - Target Cosmos chain ID.
     */
    switchChain(chainId: CosmosChainId): Promise<void>;
    /** Get connected account addresses. Required by ChainAdapter interface. */
    getAccounts(): Promise<string[]>;
    /** Set client (not applicable for Cosmos adapters). */
    setClient(_client: unknown): void;
    /**
     * Query the latest block height via RPC.
     * @returns Block height as a number.
     */
    getBlockHeight(): Promise<number>;
    /**
     * Query account info (account number, sequence) via REST.
     *
     * Required for building transactions.
     *
     * @param address - Bech32 address.
     * @returns Account number and sequence.
     */
    getAccountInfo(address: string): Promise<{
        accountNumber: number;
        sequence: number;
    }>;
    /** Get the native denomination for the current chain. */
    private _getNativeDenom;
    /** Query balance via Tendermint RPC (abci_query fallback). */
    private _queryBalanceViaRPC;
    /**
     * Basic bech32 validation.
     *
     * Checks that the address has a valid bech32 prefix and length.
     * Does not verify the checksum (would require a full bech32 library).
     */
    private _isValidBech32;
    /** Decode bech32 address to raw bytes (simplified). */
    private _bech32ToBytes;
    /** Convert bytes to hex string. */
    private _bytesToHex;
}
//# sourceMappingURL=CosmosAdapter.d.ts.map