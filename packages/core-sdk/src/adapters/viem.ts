/**
 * viem Adapter — wraps viem's Client and Transport for Cinacoin.
 *
 * Provides a ChainAdapter-compatible interface using viem's native
 * methods: getAccount, getBalance, sendTransaction, signMessage,
 * and chain switching via switchChain.
 *
 * @example
 * ```ts
 * import { createViemAdapter } from '@cinacoin/core-sdk';
 *
 * const adapter = createViemAdapter({
 *   chain: mainnet,
 *   transport: http(),
 * });
 *
 * const balance = await adapter.getBalance('0x...');
 * ```
 */

import type { ChainAdapter, ChainAdapterMethods } from './types.js';
import type { Connector } from '../connector.js';
import type { TransactionRequest, Chain } from '../types.js';

// ---------------------------------------------------------------------------
// viem type stubs — consumers install `viem` alongside this package.
// The types below mirror viem's public API surface so the adapter compiles
// without requiring viem as a hard dependency of core-sdk.
// ---------------------------------------------------------------------------

/** Minimal viem Client shape. */
export interface ViemClient {
  /** viem account(s). */
  account?: ViemAccount | ViemAccount[];
  /** viem chain configuration. */
  chain?: ViemChain;
  /** viem transport reference. */
  transport?: ViemTransport;
  /** Make an RPC request through viem. */
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  /** Read contract / call RPC helper. */
  call?(args: { to: `0x${string}`; data?: `0x${string}` }): Promise<{ data: `0x${string}` }>;
}

/** viem Account (raw, not derived). */
export interface ViemAccount {
  address: `0x${string}`;
  type?: 'json-rpc' | 'local';
  source?: string;
}

/** viem Chain configuration. */
export interface ViemChain {
  id: number;
  name: string;
  nativeCurrency?: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: string[] } };
  blockExplorers?: { default: { url: string } };
}

/** viem Transport. */
export interface ViemTransport {
  value: {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  };
}

// ---------------------------------------------------------------------------
// ViemChainAdapter
// ---------------------------------------------------------------------------

/**
 * viem-backed chain adapter implementing the Cinacoin ChainAdapter interface.
 */
export class ViemChainAdapter implements ChainAdapter {
  readonly id = 'viem';
  readonly name = 'viem';

  private client: ViemClient | null = null;
  private connector: Connector | null = null;
  private chains: Chain[] = [];

  constructor(client?: ViemClient, connector?: Connector) {
    if (client) this.client = client;
    if (connector) this.connector = connector;
  }

  // -- ChainAdapter interface ------------------------------------------------

  /** Set the active viem client. */
  setClient(client: ViemClient): void {
    this.client = client;
  }

  /** Set the active connector. */
  setConnector(connector: Connector): void {
    this.connector = connector;
  }

  /** Register supported chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
  }

  /** Find a registered chain by numeric ID. */
  findChain(chainId: number): Chain | undefined {
    return this.chains.find((c) => {
      try {
        const id = parseInt(c.id, 16) || parseInt(c.id, 10);
        return id === chainId;
      } catch {
        return false;
      }
    });
  }

  // -- viem-style methods ----------------------------------------------------

  /**
   * Get the connected account address(es).
   * Mirrors viem's wallet_getAccounts.
   *
   * @returns Array of addresses.
   */
  async getAccounts(): Promise<string[]> {
    // Prefer client.account if available
    if (this.client?.account) {
      const acc = this.client.account;
      return Array.isArray(acc) ? acc.map((a) => a.address) : [acc.address];
    }
    if (this.connector) {
      return this.connector.getAccounts();
    }
    throw new Error('No viem client or connector set');
  }

  /**
   * Get native balance for an address via viem.
   *
   * @param address - Ethereum address.
   * @returns Balance in wei (hex string).
   */
  async getBalance(address: string): Promise<string> {
    const provider = this.provider();
    return (await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    })) as string;
  }

  /**
   * Send a transaction via viem's client.
   *
   * @param tx - Transaction request.
   * @returns Transaction hash.
   */
  async sendTransaction(tx: TransactionRequest): Promise<string> {
    const provider = this.provider();
    const formatted = this.formatTransaction(tx);
    return (await provider.request({
      method: 'eth_sendTransaction',
      params: [formatted],
    })) as string;
  }

  /**
   * Sign a message with the connected account.
   *
   * @param message - Message to sign (hex or UTF-8 string).
   * @returns Signature as hex string.
   */
  async signMessage(message: string): Promise<string> {
    // If message doesn't start with 0x, hex-encode it
    const data = message.startsWith('0x') ? message : stringToHex(message);
    const provider = this.provider();
    const accounts = await this.getAccounts();
    if (accounts.length === 0) {
      throw new Error('No account connected');
    }
    return (await provider.request({
      method: 'personal_sign',
      params: [data, accounts[0]],
    })) as string;
  }

  /**
   * Switch the active chain.
   *
   * Uses viem's wallet_switchEthereumChain or the connector's switchChain.
   *
   * @param chainId - Target chain ID.
   */
  async switchChain(chainId: number): Promise<void> {
    const hexChainId = `0x${chainId.toString(16)}`;
    const provider = this.provider();

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch {
      // Fallback to connector switchChain
      if (this.connector) {
        return this.connector.switchChain(chainId);
      }
      throw new Error(`Unable to switch to chain ${chainId}`);
    }
  }

  // -- helpers ---------------------------------------------------------------

  private provider(): { request(args: { method: string; params?: unknown[] }): Promise<unknown> } {
    if (this.client?.transport?.value) {
      return this.client.transport.value;
    }
    if (this.client) {
      return this.client;
    }
    if (this.connector) {
      const p = this.connector.getProvider();
      if (p) return p as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
    }
    throw new Error('No viem client, transport, or connector available');
  }

  private formatTransaction(tx: TransactionRequest): Record<string, unknown> {
    const formatted: Record<string, unknown> = {};
    if (tx.from) formatted.from = tx.from;
    if (tx.to) formatted.to = tx.to;
    if (tx.value) formatted.value = tx.value;
    if (tx.data) formatted.data = tx.data;
    if (tx.gas) formatted.gas = tx.gas;
    if (tx.gasPrice) formatted.gasPrice = tx.gasPrice;
    if (tx.maxFeePerGas) formatted.maxFeePerGas = tx.maxFeePerGas;
    if (tx.maxPriorityFeePerGas) formatted.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
    if (tx.nonce) formatted.nonce = tx.nonce;
    if (tx.chainId) formatted.chainId = `0x${tx.chainId.toString(16)}`;
    return formatted;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a ViemChainAdapter from a viem client.
 *
 * @param client - viem Client instance.
 * @param connector - Optional Cinacoin Connector.
 * @returns ViemChainAdapter instance.
 */
export function createViemAdapter(
  client?: ViemClient,
  connector?: Connector
): ViemChainAdapter {
  return new ViemChainAdapter(client, connector);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a UTF-8 string to hex (0x-prefixed). */
function stringToHex(str: string): `0x${string}` {
  const bytes = new TextEncoder().encode(str);
  return ('0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}
