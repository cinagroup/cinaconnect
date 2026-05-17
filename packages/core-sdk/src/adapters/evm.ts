/**
 * EVM Chain Adapter — provides chain-specific operations using viem.
 *
 * Supports standard EVM chains (Ethereum, Polygon, BSC, Arbitrum, etc.)
 * through viem's client API.
 */

import type { Connector } from '../connector.js';
import type { TransactionRequest, Chain } from '../types.js';

/** Minimal EIP-1193-like provider interface for internal use. */
interface EIP1193Like {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/**
 * EVM adapter wraps a connector with EVM-specific operations.
 *
 * It translates generic connector calls into EVM-specific JSON-RPC
 * methods and provides viem-based utilities.
 */
export class EvmAdapter {
  private connector: Connector | null = null;
  private chains: Chain[] = [];

  /**
   * Register supported EVM chains.
   */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
  }

  /**
   * Set the active connector.
   */
  setConnector(connector: Connector): void {
    this.connector = connector;
  }

  /** Get the current connector. */
  getConnector(): Connector | null {
    return this.connector;
  }

  /** Get the underlying provider or throw. */
  private provider(): EIP1193Like {
    if (!this.connector) throw new Error('No connector set');
    const p = this.connector.getProvider();
    if (!p) throw new Error('Provider not available');
    return p as EIP1193Like;
  }

  /**
   * Get the native balance for an address.
   * @param address - Ethereum address.
   * @returns Balance in wei (hex string).
   */
  async getBalance(address: string): Promise<string> {
    return (await this.provider().request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    })) as string;
  }

  /**
   * Call a contract read method.
   * @param params - Call parameters.
   * @returns Result data (hex string).
   */
  async call(params: EthCallParams): Promise<string> {
    return (await this.provider().request({
      method: 'eth_call',
      params: [
        {
          to: params.to,
          data: params.data,
          from: params.from,
          value: params.value,
        },
        params.blockNumber ?? 'latest',
      ],
    })) as string;
  }

  /**
   * Estimate gas for a transaction.
   * @param tx - Transaction parameters.
   * @returns Gas estimate (hex string).
   */
  async estimateGas(tx: Partial<TransactionRequest>): Promise<string> {
    return (await this.provider().request({
      method: 'eth_estimateGas',
      params: [
        {
          from: tx.from,
          to: tx.to,
          data: tx.data,
          value: tx.value,
        },
      ],
    })) as string;
  }

  /**
   * Get the current gas price.
   * @returns Gas price in wei (hex string).
   */
  async getGasPrice(): Promise<string> {
    return (await this.provider().request({
      method: 'eth_gasPrice',
    })) as string;
  }

  /**
   * Get a transaction by hash.
   * @param hash - Transaction hash.
   * @returns Transaction data.
   */
  async getTransaction(hash: string): Promise<unknown> {
    return this.provider().request({
      method: 'eth_getTransactionByHash',
      params: [hash],
    });
  }

  /**
   * Get a transaction receipt.
   * @param hash - Transaction hash.
   * @returns Receipt data.
   */
  async getTransactionReceipt(hash: string): Promise<unknown> {
    return this.provider().request({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    });
  }

  /**
   * Get the current block number.
   * @returns Block number (decimal).
   */
  async getBlockNumber(): Promise<number> {
    const hex = (await this.provider().request({
      method: 'eth_blockNumber',
    })) as string;
    return parseInt(hex, 16);
  }

  /**
   * Get ERC-20 token balance for an address.
   * @param tokenAddress - ERC-20 contract address.
   * @param userAddress - User wallet address.
   * @returns Token balance (as a bigint-compatible hex string).
   */
  async getTokenBalance(
    tokenAddress: string,
    userAddress: string,
  ): Promise<string> {
    // ERC-20 balanceOf function selector + padded address
    const data =
      '0x70a08231' +
      userAddress.slice(2).padStart(64, '0').toLowerCase();

    return this.call({
      to: tokenAddress,
      data,
    });
  }

  /**
   * Format a transaction into a signable format.
   * @param tx - Transaction request.
   * @returns Formatted transaction for signing.
   */
  formatTransaction(tx: TransactionRequest): Record<string, unknown> {
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

  /**
   * Find a chain by ID.
   */
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
}

/** Parameters for an eth_call. */
export interface EthCallParams {
  /** Target contract address. */
  to: string;
  /** Encoded function call data. */
  data?: string;
  /** Caller address. */
  from?: string;
  /** ETH value to send (hex). */
  value?: string;
  /** Block number (default: 'latest'). */
  blockNumber?: string;
}
