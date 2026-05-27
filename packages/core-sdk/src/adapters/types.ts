/**
 * ChainAdapter interface for Cinacoin adapters.
 *
 * Defines the contract that all chain adapters (viem, wagmi, ethers, etc.)
 * must implement to work with the Cinacoin SDK.
 */

import type { Connector } from '../connector.js';
import type { Chain } from '../types.js';

/**
 * ChainAdapter interface — common methods across all adapter implementations.
 *
 * Each adapter (viem, wagmi, ethers5, ethers6, solana, bitcoin) implements
 * this interface to provide chain-specific operations.
 */
export interface ChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string;

  /** Human-readable adapter name. */
  readonly name: string;

  /** Set the underlying client/provider. */
  setClient?(client: unknown): void;

  /** Set the active connector. */
  setConnector(connector: Connector): void;

  /** Register supported chains. */
  registerChains(chains: Chain[]): void;

  /** Find a chain by numeric ID. */
  findChain(chainId: number): Chain | undefined;

  /** Get connected account addresses. */
  getAccounts(): Promise<string[]>;

  /** Get native balance for an address. */
  getBalance(address: string): Promise<string>;

  /** Send a transaction. */
  sendTransaction(tx: unknown): Promise<string>;

  /** Sign a message. */
  signMessage(message: string): Promise<string>;

  /** Switch the active chain. */
  switchChain(chainId: number): Promise<void>;
}

/**
 * ChainAdapterMethods — optional utility methods adapters may expose.
 */
export interface ChainAdapterMethods {
  /** Get the current chain ID. */
  getChainId(): Promise<number>;

  /** Get gas price. */
  getGasPrice(): Promise<string>;

  /** Get current block number. */
  getBlockNumber(): Promise<number>;

  /** Estimate gas for a transaction. */
  estimateGas(tx: unknown): Promise<string>;

  /** Get transaction by hash. */
  getTransaction(hash: string): Promise<unknown>;

  /** Get transaction receipt. */
  getTransactionReceipt(hash: string): Promise<unknown>;

  /** Call a contract method (read-only). */
  call(params: { to: string; data?: string; from?: string }): Promise<string>;

  /** Get ERC-20 token balance. */
  getTokenBalance(tokenAddress: string, userAddress: string): Promise<string>;

  /** Format a transaction for the underlying provider. */
  formatTransaction(tx: unknown): Record<string, unknown>;
}

/**
 * Adapter factory configuration.
 */
export interface AdapterFactoryConfig {
  /** Adapter type ('viem' | 'wagmi' | 'ethers5' | 'ethers6' | 'solana' | 'cosmos' | 'sui' | 'starknet' | 'xrpl' | 'near' | 'bitcoin'). */
  type: 'viem' | 'wagmi' | 'ethers5' | 'ethers6' | 'solana' | 'cosmos' | 'sui' | 'starknet' | 'xrpl' | 'near' | 'bitcoin';

  /** Underlying client/provider. */
  client?: unknown;

  /** Cinacoin connector. */
  connector?: Connector;

  /** Supported chains. */
  chains?: Chain[];
}
