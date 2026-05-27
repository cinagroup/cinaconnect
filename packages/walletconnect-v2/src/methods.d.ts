/**
 * WalletConnect v2 JSON-RPC methods.
 *
 * Defines the standard methods for session management, transaction signing,
 * message signing, and chain operations. Compatible with EIP-155 (EVM)
 * and Solana namespaces.
 */
import type { TransactionRequest } from '@cinacoin/core-sdk';
import type { RequiredNamespace } from './types.js';
/** Standard EVM methods supported by most wallets. */
export declare const WC_METHODS: readonly ["eth_sendTransaction", "eth_signTransaction", "personal_sign", "eth_signTypedData", "eth_signTypedData_v4", "eth_sign", "wallet_switchEthereumChain", "wallet_addEthereumChain", "wallet_getPermissions", "wallet_requestPermissions", "wallet_watchAsset", "wallet_scanQRCode", "eth_accounts", "eth_chainId", "eth_call", "eth_getBalance", "eth_estimateGas", "eth_gasPrice", "eth_blockNumber", "eth_getTransactionCount", "eth_getTransactionByHash", "eth_getTransactionReceipt", "eth_getLogs"];
/** Standard EVM events. */
export declare const WC_EVENTS: readonly ["chainChanged", "accountsChanged", "message", "disconnect", "connect", "eth_subscription"];
/** Solana (Solana namespace) methods. */
export declare const SOLANA_METHODS: readonly ["solana_signTransaction", "solana_signMessage", "solana_signAndSendTransaction", "solana_signAllTransactions", "solana_signAndSendAllTransactions", "getAccounts"];
/** Solana events. */
export declare const SOLANA_EVENTS: readonly ["accountChanged", "connect", "disconnect"];
/** Configuration for building default required namespaces. */
export interface NamespacesConfig {
    /** CAIP-2 chain IDs (e.g., ['eip155:1', 'eip155:137']). */
    chains?: string[];
    /** Method names (defaults to WC_METHODS). */
    methods?: string[];
    /** Event names (defaults to WC_EVENTS). */
    events?: string[];
}
/**
 * Build default required namespaces for multiple chains.
 *
 * @param config - Optional namespace configuration.
 * @returns Required namespaces object.
 */
export declare function getDefaultRequiredNamespaces(config?: NamespacesConfig): Record<string, RequiredNamespace>;
/**
 * Build an eth_sendTransaction request.
 */
export declare function buildSendTransaction(tx: TransactionRequest): {
    method: 'eth_sendTransaction';
    params: [TransactionRequest];
};
/**
 * Build a personal_sign request.
 */
export declare function buildPersonalSign(message: string, address: string): {
    method: 'personal_sign';
    params: [string, string];
};
/**
 * Build an eth_signTypedData_v4 (EIP-712) request.
 */
export declare function buildSignTypedDataV4(address: string, typedData: unknown): {
    method: 'eth_signTypedData_v4';
    params: [string, unknown];
};
/**
 * Build an eth_sign request.
 */
export declare function buildEthSign(address: string, message: string): {
    method: 'eth_sign';
    params: [string, string];
};
/**
 * Build an eth_signTransaction request.
 */
export declare function buildSignTransaction(tx: TransactionRequest): {
    method: 'eth_signTransaction';
    params: [TransactionRequest];
};
/**
 * Build a wallet_switchEthereumChain request.
 */
export declare function buildSwitchChain(chainId: number): {
    method: 'wallet_switchEthereumChain';
    params: [{
        chainId: string;
    }];
};
/**
 * Build a wallet_addEthereumChain request.
 */
export declare function buildAddChain(chainId: number, chainName: string, rpcUrls: string[], nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
}, blockExplorerUrls?: string[]): {
    method: 'wallet_addEthereumChain';
    params: [AddChainParams];
};
/**
 * Build a wallet_watchAsset request.
 */
export declare function buildWatchAsset(type: string, options: {
    address: string;
    symbol: string;
    decimals: number;
    image?: string;
}): {
    method: 'wallet_watchAsset';
    params: [{
        type: string;
        options: typeof options;
    }];
};
/**
 * Build a wallet_scanQRCode request.
 */
export declare function buildScanQRCode(regex?: string): {
    method: 'wallet_scanQRCode';
    params: [string?];
};
/** Parameters for wallet_addEthereumChain. */
export interface AddChainParams {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    blockExplorerUrls?: string[];
}
/**
 * Build a solana_signMessage request.
 */
export declare function buildSolanaSignMessage(pubkey: string, message: string): {
    method: 'solana_signMessage';
    params: {
        pubkey: string;
        message: string;
    };
};
/**
 * Build a solana_signTransaction request.
 */
export declare function buildSolanaSignTransaction(transaction: string): {
    method: 'solana_signTransaction';
    params: {
        transaction: string;
    };
};
/** All known WC v2 methods with descriptions. */
export declare const METHOD_REGISTRY: Record<string, string>;
/**
 * Check if a method is a standard EVM method.
 */
export declare function isEvmMethod(method: string): boolean;
/**
 * Check if a method is a Solana method.
 */
export declare function isSolanaMethod(method: string): boolean;
/**
 * Check if a method is a WC-internal method.
 */
export declare function isWcInternalMethod(method: string): boolean;
/**
 * Get the description of a method from the registry.
 */
export declare function getMethodDescription(method: string): string;
//# sourceMappingURL=methods.d.ts.map