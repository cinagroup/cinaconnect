/**
 * NEAR-specific types for the @cinacoin/adapter-near package.
 */
import type { Chain } from '@cinacoin/core-sdk';
/** Well-known NEAR chain presets. */
export declare const NEAR_CHAINS: Chain[];
/** Metadata for a supported NEAR wallet. */
export interface NearWalletInfo {
    /** Internal wallet id. */
    id: string;
    /** Human-readable name. */
    name: string;
    /** Wallet type identifier. */
    type: 'browser' | 'extension' | 'injected' | 'hardware' | 'mobile';
    /** Wallet icon URL. */
    icon: string;
    /** URL to install the wallet. */
    downloadUrl?: string;
}
/** Supported NEAR wallets. */
export declare const NEAR_WALLETS: NearWalletInfo[];
/** NEAR function call action. */
export interface NearFunctionCall {
    /** Contract to call. */
    contractId: string;
    /** Method name on the contract. */
    methodName: string;
    /** Arguments as a JSON string. */
    args: string;
    /** Deposit in yoctoNEAR (string to handle big numbers). */
    deposit: string;
    /** Gas limit in yoctoNEAR. */
    gas?: string;
}
/** NEAR native token transfer action. */
export interface NearTransferAction {
    /** Recipient NEAR account id. */
    receiverId: string;
    /** Amount in yoctoNEAR (string to handle big numbers). */
    amount: string;
}
/** A NEAR transaction composed of one or more actions. */
export interface NearTransaction {
    /** Function calls or transfer actions. */
    actions: NearFunctionCall | NearTransferAction | (NearFunctionCall | NearTransferAction)[];
}
/** Result of a signed transaction. */
export interface NearTransactionResult {
    /** Transaction hash. */
    transactionHash: string;
    /** Block hash. */
    blockHash?: string;
}
/** NEAR wallet connector interface. */
export interface NearWalletConnector {
    /** Unique connector id (matches wallet id). */
    readonly id: string;
    /** Human-readable name. */
    readonly name: string;
    /** Check if the wallet is available. */
    isAvailable(): boolean;
    /** Connect to the wallet and get the connected account id. */
    connect(): Promise<string>;
    /** Disconnect from the wallet. */
    disconnect(): Promise<void>;
    /** Get the connected account id. */
    getAccountId(): string | null;
    /** Sign a transaction. */
    signTransaction(tx: NearTransaction): Promise<string>;
    /** Send a transaction. */
    sendTransaction(tx: NearTransaction): Promise<NearTransactionResult>;
    /** Sign a message. */
    signMessage(message: string, recipient?: string): Promise<string>;
}
/** NEAR-specific connect parameters. */
export interface NearConnectParams {
    /** Wallet id to connect to. */
    walletId?: string;
    /** Preferred RPC URL. */
    rpcUrl?: string;
    /** Network id ('mainnet' | 'testnet'). */
    networkId?: string;
}
//# sourceMappingURL=types.d.ts.map