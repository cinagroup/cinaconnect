/**
 * Solana Chain Adapter — provides Solana-specific operations.
 *
 * Uses @solana/web3.js for RPC calls and supports Phantom, Solflare,
 * and Backpack wallet adapters. EIP-1193 compatible adapter layer.
 */
import type { Chain } from '../types.js';
interface SolanaPublicKey {
    toBase58(): string;
    toBuffer(): Buffer;
    equals(other: SolanaPublicKey): boolean;
}
interface SolanaTransaction {
    feePayer: SolanaPublicKey;
    recentBlockhash: string;
    sign(...signers: {
        publicKey: SolanaPublicKey;
        secretKey: Uint8Array;
    }[]): void;
    serialize(options?: {
        requireAllSignatures?: boolean;
        verifySignatures?: boolean;
    }): Buffer;
    addInstruction(instruction: unknown): void;
}
/** Minimal EIP-1193-like provider for Solana wallets. */
interface SolanaProvider {
    publicKey: SolanaPublicKey | null;
    isConnected: boolean;
    connect(): Promise<{
        publicKey: SolanaPublicKey;
    }>;
    disconnect(): Promise<void>;
    signTransaction(tx: SolanaTransaction): Promise<SolanaTransaction>;
    signAllTransactions(txs: SolanaTransaction[]): Promise<SolanaTransaction[]>;
    signMessage?(message: Uint8Array): Promise<{
        signature: Uint8Array;
    }>;
    request?(args: {
        method: string;
        params?: unknown[];
    }): Promise<unknown>;
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
}
/**
 * Validate a Solana base58 address.
 * - Must be 32-44 characters
 * - Must contain only valid base58 characters
 * - Decoded buffer must be exactly 32 bytes
 */
export declare function isValidSolanaAddress(address: string): boolean;
/** Decode a base58 string to a byte array. */
export declare function base58Decode(input: string): Uint8Array;
export interface SolanaWalletInfo {
    id: string;
    name: string;
    rdns: string;
    icon: string;
    /** URL to install the wallet if not present. */
    downloadUrl: string;
}
export declare const SOLANA_WALLETS: SolanaWalletInfo[];
/** Well-known Solana chain presets. */
export declare const SOLANA_CHAINS: Chain[];
/**
 * Solana chain adapter implementing chain-specific operations.
 *
 * Wraps a connector/provider with Solana-specific JSON-RPC calls,
 * transaction building, and message signing.
 */
export declare class SolanaChainAdapter {
    private provider;
    private connection;
    private chains;
    private rpcUrl;
    /** Register supported Solana chains. */
    registerChains(chains: Chain[]): void;
    /** Set the RPC endpoint URL. */
    setRpcUrl(url: string): void;
    /** Set the active wallet provider. */
    setProvider(provider: SolanaProvider): void;
    /** Get the current provider. */
    getProvider(): SolanaProvider | null;
    /**
     * Connect to a Solana wallet.
     * Tries Phantom → Solflare → Backpack in order.
     * @returns The connected public key as a base58 string.
     */
    connect(walletId?: string): Promise<string>;
    /** Disconnect the current wallet. */
    disconnect(): Promise<void>;
    /** Get the connected address. */
    getAddress(): string | null;
    /**
     * Get SOL balance for an address.
     * @param address - Base58-encoded Solana address.
     * @returns Balance in SOL (as a decimal string, e.g. "1.234").
     */
    getBalance(address: string): Promise<string>;
    /**
     * Build a System Program transfer instruction.
     * @param from - Sender address (base58).
     * @param to - Recipient address (base58).
     * @param lamports - Amount in lamports.
     * @returns A transfer instruction.
     */
    buildTransferInstruction(from: string, to: string, lamports: number): unknown;
    /**
     * Send a signed transaction.
     * @param tx - Serialized transaction bytes (base64 string or Uint8Array).
     * @returns Transaction signature (base58).
     */
    sendTransaction(tx: SolanaTransaction | Uint8Array | string): Promise<string>;
    /**
     * Sign a message with the connected wallet.
     * Uses Solana's off-chain message signing (no BIP-322, Solana-specific).
     * @param message - Message as a string or Uint8Array.
     * @returns Signature as a base58-encoded string.
     */
    signMessage(message: string | Uint8Array): Promise<string>;
    /**
     * Build an SPL token transfer instruction.
     * @param mint - SPL token mint address (base58).
     * @param source - Source token account (base58).
     * @param destination - Destination token account (base58).
     * @param owner - Owner of the source account (base58).
     * @param amount - Token amount (in smallest unit, considering decimals).
     * @returns A token transfer instruction object.
     */
    buildSPLTransferInstruction(mint: string, source: string, destination: string, owner: string, amount: number | bigint): unknown;
    /**
     * EIP-1193 compatible request method for Solana.
     * Supports: solana_getBalance, solana_sendTransaction, solana_signMessage, etc.
     */
    request(args: {
        method: string;
        params?: unknown[];
    }): Promise<unknown>;
    /** Find a chain by its ID. */
    findChain(chainId: string): Chain | undefined;
    /** Convert SOL to lamports. */
    static solToLamports(sol: number | string): number;
    /** Convert lamports to SOL. */
    static lamportsToSol(lamports: number): string;
    private _resolveWallet;
    private _setupConnection;
    private _toPublicKey;
    private _bytesToBase58;
    private _getLatestBlockhash;
    private _getAccountInfo;
}
export {};
//# sourceMappingURL=solana.d.ts.map