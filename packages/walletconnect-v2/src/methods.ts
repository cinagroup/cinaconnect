/**
 * WalletConnect v2 JSON-RPC methods.
 *
 * Defines the standard methods for session management, transaction signing,
 * message signing, and chain operations. Compatible with EIP-155 (EVM)
 * and Solana namespaces.
 */

import type { TransactionRequest } from '@cinacoin/core-sdk';
import type { RequiredNamespace } from './types.js';

// ============================================================
// Standard EVM methods (EIP-155)
// ============================================================

/** Standard EVM methods supported by most wallets. */
export const WC_METHODS = [
  'eth_sendTransaction',
  'eth_signTransaction',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v4',
  'eth_sign',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_getPermissions',
  'wallet_requestPermissions',
  'wallet_watchAsset',
  'wallet_scanQRCode',
  'eth_accounts',
  'eth_chainId',
  'eth_call',
  'eth_getBalance',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_blockNumber',
  'eth_getTransactionCount',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_getLogs',
] as const;

/** Standard EVM events. */
export const WC_EVENTS = [
  'chainChanged',
  'accountsChanged',
  'message',
  'disconnect',
  'connect',
  'eth_subscription',
] as const;

// ============================================================
// Multi-chain method presets
// ============================================================

/** Solana (Solana namespace) methods. */
export const SOLANA_METHODS = [
  'solana_signTransaction',
  'solana_signMessage',
  'solana_signAndSendTransaction',
  'solana_signAllTransactions',
  'solana_signAndSendAllTransactions',
  'getAccounts',
] as const;

/** Solana events. */
export const SOLANA_EVENTS = [
  'accountChanged',
  'connect',
  'disconnect',
] as const;

// ============================================================
// Default namespaces
// ============================================================

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
export function getDefaultRequiredNamespaces(config?: NamespacesConfig): Record<string, RequiredNamespace> {
  const chains = config?.chains ?? ['eip155:1'];
  const methods = config?.methods ?? [...WC_METHODS];
  const events = config?.events ?? [...WC_EVENTS];

  const namespaces: Record<string, RequiredNamespace> = {
    eip155: {
      chains: chains.filter((c) => c.startsWith('eip155')),
      methods,
      events,
    },
  };

  const solanaChains = chains.filter((c) => c.startsWith('solana'));
  if (solanaChains.length > 0) {
    namespaces.solana = {
      chains: solanaChains,
      methods: [...SOLANA_METHODS],
      events: [...SOLANA_EVENTS],
    };
  }

  return namespaces;
}

// ============================================================
// EVM method builders
// ============================================================

/**
 * Build an eth_sendTransaction request.
 */
export function buildSendTransaction(tx: TransactionRequest): {
  method: 'eth_sendTransaction';
  params: [TransactionRequest];
} {
  return { method: 'eth_sendTransaction', params: [tx] };
}

/**
 * Build a personal_sign request.
 */
export function buildPersonalSign(message: string, address: string): {
  method: 'personal_sign';
  params: [string, string];
} {
  const hexMessage = message.startsWith('0x')
    ? message
    : '0x' + Array.from(new TextEncoder().encode(message))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
  return { method: 'personal_sign', params: [hexMessage, address] };
}

/**
 * Build an eth_signTypedData_v4 (EIP-712) request.
 */
export function buildSignTypedDataV4(
  address: string,
  typedData: unknown,
): {
  method: 'eth_signTypedData_v4';
  params: [string, unknown];
} {
  return { method: 'eth_signTypedData_v4', params: [address, typedData] };
}

/**
 * Build an eth_sign request.
 */
export function buildEthSign(
  address: string,
  message: string,
): {
  method: 'eth_sign';
  params: [string, string];
} {
  const hexMessage = message.startsWith('0x')
    ? message
    : '0x' + Array.from(new TextEncoder().encode(message))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
  return { method: 'eth_sign', params: [address, hexMessage] };
}

/**
 * Build an eth_signTransaction request.
 */
export function buildSignTransaction(tx: TransactionRequest): {
  method: 'eth_signTransaction';
  params: [TransactionRequest];
} {
  return { method: 'eth_signTransaction', params: [tx] };
}

/**
 * Build a wallet_switchEthereumChain request.
 */
export function buildSwitchChain(chainId: number): {
  method: 'wallet_switchEthereumChain';
  params: [{ chainId: string }];
} {
  return { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + chainId.toString(16) }] };
}

/**
 * Build a wallet_addEthereumChain request.
 */
export function buildAddChain(
  chainId: number,
  chainName: string,
  rpcUrls: string[],
  nativeCurrency: { name: string; symbol: string; decimals: number },
  blockExplorerUrls?: string[],
): {
  method: 'wallet_addEthereumChain';
  params: [AddChainParams];
} {
  return {
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: '0x' + chainId.toString(16),
        chainName,
        rpcUrls,
        nativeCurrency,
        blockExplorerUrls,
      },
    ],
  };
}

/**
 * Build a wallet_watchAsset request.
 */
export function buildWatchAsset(
  type: string,
  options: { address: string; symbol: string; decimals: number; image?: string },
): {
  method: 'wallet_watchAsset';
  params: [{ type: string; options: typeof options }];
} {
  return { method: 'wallet_watchAsset', params: [{ type, options }] };
}

/**
 * Build a wallet_scanQRCode request.
 */
export function buildScanQRCode(regex?: string): {
  method: 'wallet_scanQRCode';
  params: [string?];
} {
  return { method: 'wallet_scanQRCode', params: [regex] };
}

/** Parameters for wallet_addEthereumChain. */
export interface AddChainParams {
  chainId: string;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls?: string[];
}

// ============================================================
// Solana method builders
// ============================================================

/**
 * Build a solana_signMessage request.
 */
export function buildSolanaSignMessage(
  pubkey: string,
  message: string,
): {
  method: 'solana_signMessage';
  params: { pubkey: string; message: string };
} {
  return { method: 'solana_signMessage', params: { pubkey, message } };
}

/**
 * Build a solana_signTransaction request.
 */
export function buildSolanaSignTransaction(transaction: string): {
  method: 'solana_signTransaction';
  params: { transaction: string };
} {
  return { method: 'solana_signTransaction', params: { transaction } };
}

// ============================================================
// Method registry
// ============================================================

/** All known WC v2 methods with descriptions. */
export const METHOD_REGISTRY: Record<string, string> = {
  'eth_sendTransaction': 'Send a transaction on behalf of the user',
  'eth_signTransaction': 'Sign a transaction (without sending)',
  'personal_sign': 'Sign an arbitrary message (EIP-191)',
  'eth_signTypedData': 'Sign typed data (EIP-712, legacy)',
  'eth_signTypedData_v4': 'Sign typed data (EIP-712, v4)',
  'eth_sign': 'Sign a message (legacy, use personal_sign)',
  'wallet_switchEthereumChain': 'Switch the active chain',
  'wallet_addEthereumChain': 'Add a new chain to the wallet',
  'wallet_getPermissions': 'Get wallet permissions',
  'wallet_requestPermissions': 'Request wallet permissions',
  'wallet_watchAsset': 'Add a token to the wallet watchlist',
  'wallet_scanQRCode': 'Request the wallet to scan a QR code',
  'eth_accounts': 'Get connected accounts',
  'eth_chainId': 'Get current chain ID',
  'eth_call': 'Execute a call without creating a transaction',
  'eth_getBalance': 'Get account balance',
  'eth_estimateGas': 'Estimate gas for a transaction',
  'eth_gasPrice': 'Get current gas price',
  'eth_blockNumber': 'Get latest block number',
  'eth_getTransactionCount': 'Get transaction count (nonce)',
  'eth_getTransactionByHash': 'Get transaction by hash',
  'eth_getTransactionReceipt': 'Get transaction receipt',
  'eth_getLogs': 'Get event logs',
  'solana_signTransaction': 'Sign a Solana transaction',
  'solana_signMessage': 'Sign a Solana message',
  'solana_signAndSendTransaction': 'Sign and send a Solana transaction',
  'solana_signAllTransactions': 'Sign multiple Solana transactions',
  'wc_sessionPropose': 'Propose a new session (internal)',
  'wc_sessionProposeResp': 'Respond to a session proposal (internal)',
  'wc_sessionUpdate': 'Update session state (internal)',
  'wc_sessionDelete': 'Delete a session (internal)',
  'wc_sessionEvent': 'Session event notification (internal)',
  'wc_sessionExtend': 'Extend session TTL (internal)',
  'wc_sessionPing': 'Session keepalive ping (internal)',
  'wc_sessionPong': 'Session keepalive pong (internal)',
  'wc_pairingDelete': 'Delete a pairing (internal)',
  'wc_pairingPing': 'Pairing keepalive ping (internal)',
};

/**
 * Check if a method is a standard EVM method.
 */
export function isEvmMethod(method: string): boolean {
  return (WC_METHODS as readonly string[]).includes(method);
}

/**
 * Check if a method is a Solana method.
 */
export function isSolanaMethod(method: string): boolean {
  return (SOLANA_METHODS as readonly string[]).includes(method);
}

/**
 * Check if a method is a WC-internal method.
 */
export function isWcInternalMethod(method: string): boolean {
  return method.startsWith('wc_');
}

/**
 * Get the description of a method from the registry.
 */
export function getMethodDescription(method: string): string {
  return METHOD_REGISTRY[method] ?? `Unknown method: ${method}`;
}
