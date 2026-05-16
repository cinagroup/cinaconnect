/**
 * WalletConnect v2 JSON-RPC methods.
 *
 * Defines the standard methods for session management, transaction signing,
 * message signing, and chain operations. Compatible with EIP-155 (EVM).
 */

import type { TransactionRequest } from '@onchainux/core';
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
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_getPermissions',
  'wallet_requestPermissions',
  'eth_accounts',
  'eth_chainId',
  'eth_call',
  'eth_getBalance',
  'eth_estimateGas',
  'eth_gasPrice',
] as const;

/** Standard EVM events. */
export const WC_EVENTS = [
  'chainChanged',
  'accountsChanged',
  'message',
  'disconnect',
  'connect',
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
 * Build default required namespaces for EIP-155 (EVM).
 *
 * @param config - Optional namespace configuration.
 * @returns Required namespaces object.
 */
export function getDefaultRequiredNamespaces(config?: NamespacesConfig): Record<string, RequiredNamespace> {
  const chains = config?.chains ?? ['eip155:1'];
  const methods = config?.methods ?? [...WC_METHODS];
  const events = config?.events ?? [...WC_EVENTS];

  return {
    eip155: {
      chains,
      methods,
      events,
    },
  };
}

// ============================================================
// Method implementations
// ============================================================

/**
 * Build an eth_sendTransaction request.
 *
 * @param tx - Transaction request.
 * @returns JSON-RPC method name and params.
 */
export function buildSendTransaction(tx: TransactionRequest): {
  method: 'eth_sendTransaction';
  params: [TransactionRequest];
} {
  return {
    method: 'eth_sendTransaction',
    params: [tx],
  };
}

/**
 * Build a personal_sign request.
 *
 * @param message - Message to sign (string).
 * @param address - Address to sign with.
 * @returns JSON-RPC method name and params.
 */
export function buildPersonalSign(message: string, address: string): {
  method: 'personal_sign';
  params: [string, string];
} {
  // Ensure message is hex-encoded
  const hexMessage = message.startsWith('0x')
    ? message
    : '0x' + Array.from(new TextEncoder().encode(message))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

  return {
    method: 'personal_sign',
    params: [hexMessage, address],
  };
}

/**
 * Build an eth_signTypedData_v4 (EIP-712) request.
 *
 * @param address - Address to sign with.
 * @param typedData - EIP-712 typed data object.
 * @returns JSON-RPC method name and params.
 */
export function buildSignTypedDataV4(
  address: string,
  typedData: unknown,
): {
  method: 'eth_signTypedData_v4';
  params: [string, unknown];
} {
  return {
    method: 'eth_signTypedData_v4',
    params: [address, typedData],
  };
}

/**
 * Build a wallet_switchEthereumChain request.
 *
 * @param chainId - Target chain ID (decimal).
 * @returns JSON-RPC method name and params.
 */
export function buildSwitchChain(chainId: number): {
  method: 'wallet_switchEthereumChain';
  params: [{ chainId: string }];
} {
  return {
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0x' + chainId.toString(16) }],
  };
}

/**
 * Build a wallet_addEthereumChain request.
 *
 * @param chainId - Chain ID (decimal).
 * @param chainName - Human-readable name.
 * @param rpcUrls - RPC endpoint URLs.
 * @param nativeCurrency - Native currency info.
 * @param blockExplorerUrls - Block explorer URLs.
 * @returns JSON-RPC method name and params.
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
  'wallet_switchEthereumChain': 'Switch the active chain',
  'wallet_addEthereumChain': 'Add a new chain to the wallet',
  'wallet_getPermissions': 'Get wallet permissions',
  'wallet_requestPermissions': 'Request wallet permissions',
  'eth_accounts': 'Get connected accounts',
  'eth_chainId': 'Get current chain ID',
  'eth_call': 'Execute a call without creating a transaction',
  'eth_getBalance': 'Get account balance',
  'eth_estimateGas': 'Estimate gas for a transaction',
  'eth_gasPrice': 'Get current gas price',
  'wc_sessionPropose': 'Propose a new session (internal)',
  'wc_sessionProposeResp': 'Respond to a session proposal (internal)',
  'wc_sessionUpdate': 'Update session state (internal)',
  'wc_sessionDelete': 'Delete a session (internal)',
  'wc_sessionEvent': 'Session event notification (internal)',
  'wc_sessionExtend': 'Extend session TTL (internal)',
  'wc_sessionPing': 'Session keepalive ping (internal)',
  'wc_sessionPong': 'Session keepalive pong (internal)',
};

/**
 * Check if a method is a standard EVM method.
 *
 * @param method - Method name.
 * @returns Whether the method is in the standard EVM list.
 */
export function isEvmMethod(method: string): boolean {
  return (WC_METHODS as readonly string[]).includes(method);
}

/**
 * Check if a method is a WC-internal method.
 *
 * @param method - Method name.
 * @returns Whether the method starts with 'wc_'.
 */
export function isWcInternalMethod(method: string): boolean {
  return method.startsWith('wc_');
}
