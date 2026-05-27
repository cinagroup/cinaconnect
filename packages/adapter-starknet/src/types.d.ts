/**
 * Starknet-specific types for the @cinacoin/adapter-starknet package.
 */
import type { Chain } from '@cinacoin/core-sdk';
/** Well-known Starknet chain presets. */
export declare const STARKNET_CHAINS: Chain[];
/** Metadata for a supported Starknet wallet. */
export interface StarknetWalletInfo {
    /** Internal wallet id. */
    id: string;
    /** Human-readable name. */
    name: string;
    /** EIP-6963 RDNS identifier. */
    rdns: string;
    /** Wallet icon URL. */
    icon: string;
    /** URL to install the wallet. */
    downloadUrl: string;
}
/** Supported Starknet wallets. */
export declare const STARKNET_WALLETS: StarknetWalletInfo[];
/** Raw Starknet invoke/call transaction. */
export interface StarknetCall {
    /** Contract address. */
    contractAddress: string;
    /** Entrypoint method name. */
    entrypoint: string;
    /** Calldata as decimal strings. */
    calldata: string[];
}
/** Transaction to be executed. */
export interface StarknetTransaction {
    /** Single call or array of calls (multicall). */
    calls: StarknetCall | StarknetCall[];
    /** Optional details (maxFee, nonce, version). */
    details?: {
        maxFee?: string;
        nonce?: string;
        version?: string;
    };
}
/** Result of a signed transaction. */
export interface StarknetTransactionResult {
    /** Transaction hash. */
    transactionHash: string;
}
/** Starknet wallet connector interface. */
export interface StarknetWalletConnector {
    /** Unique connector id (matches wallet id). */
    readonly id: string;
    /** Human-readable name. */
    readonly name: string;
    /** Check if the wallet is installed. */
    isInstalled(): boolean;
    /** Connect to the wallet and get the connected account address. */
    connect(): Promise<string>;
    /** Disconnect from the wallet. */
    disconnect(): Promise<void>;
    /** Get the connected account address. */
    getAccount(): string | null;
    /** Sign a Starknet transaction. */
    signTransaction(calls: StarknetCall[]): Promise<unknown>;
    /** Execute a Starknet transaction. */
    executeTransaction(calls: StarknetCall[], details?: Record<string, unknown>): Promise<StarknetTransactionResult>;
    /** Sign a message. */
    signMessage(message: string | unknown): Promise<string>;
}
/** Starknet-specific connect parameters. */
export interface StarknetConnectParams {
    /** Wallet id to connect to ('argent-x' | 'braavos'). */
    walletId?: string;
    /** Preferred RPC URL. */
    rpcUrl?: string;
}
//# sourceMappingURL=types.d.ts.map