/**
 * ethers v6 Adapter — modern Promise-based API for ethers.js v6.
 *
 * Supports BrowserProvider, JsonRpcSigner, and EIP-1559 transactions
 * through the latest ethers v6 interface.
 *
 * @example
 * ```ts
 * import { Ethers6Adapter } from '@cinacoin/core-sdk';
 * import { BrowserProvider } from 'ethers';
 *
 * const provider = new BrowserProvider(window.ethereum);
 * const adapter = new Ethers6Adapter(provider);
 * await adapter.connect();
 * ```
 */

import type { Connector, RedirectHandler } from '../connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest, Chain } from '../types.js';
import type { DeepLinkParams, RedirectResult } from '../links/index.js';
import { EventEmitter } from '../events.js';

// ---------------------------------------------------------------------------
// ethers v6 type stubs — consumers install `ethers` alongside.
// ---------------------------------------------------------------------------

/** ethers v6 Provider. */
export interface Ethers6Provider {
  getNetwork(): Promise<Ethers6Network>;
  getBalance(address: string, blockTag?: string): Promise<Ethers6BigInt>;
  getBlockNumber(): Promise<number>;
  getGasPrice(): Promise<Ethers6BigInt>;
  getTransaction(hash: string): Promise<Ethers6TransactionResponse | null>;
  getTransactionReceipt(hash: string): Promise<Ethers6TransactionReceipt | null>;
  send(method: string, params: unknown[]): Promise<unknown>;
  call(tx: Ethers6TransactionRequest): Promise<string>;
  listAccounts(): Promise<string[]>;
  getSigner(address?: string): Promise<Ethers6Signer>;
}

/** ethers v6 Network info. */
export interface Ethers6Network {
  chainId: bigint;
  name: string;
}

/** ethers v6 BigInt wrapper. */
export interface Ethers6BigInt {
  toString(): string;
  toHexString(): string;
  toNumber(): number;
}

/** ethers v6 Signer. */
export interface Ethers6Signer {
  getAddress(): Promise<string>;
  getBalance(): Promise<Ethers6BigInt>;
  signMessage(message: string | Uint8Array): Promise<string>;
  signTransaction(transaction: Ethers6TransactionRequest): Promise<string>;
  sendTransaction(transaction: Ethers6TransactionRequest): Promise<Ethers6TransactionResponse>;
  provider?: Ethers6Provider;
}

/** ethers v6 Transaction request. */
export interface Ethers6TransactionRequest {
  from?: string;
  to?: string;
  value?: string | bigint;
  data?: string;
  gasLimit?: string | bigint;
  gasPrice?: string | bigint;
  maxFeePerGas?: string | bigint;
  maxPriorityFeePerGas?: string | bigint;
  nonce?: number | bigint;
  chainId?: number | bigint;
  type?: number;
}

/** ethers v6 Transaction response. */
export interface Ethers6TransactionResponse {
  hash: string;
  from: string;
  to: string | null;
  nonce: number;
  gasLimit: Ethers6BigInt;
  gasPrice?: Ethers6BigInt;
  maxFeePerGas?: Ethers6BigInt;
  maxPriorityFeePerGas?: Ethers6BigInt;
  data: string;
  value: Ethers6BigInt;
  chainId: bigint;
  type: number;
  wait(confirmations?: number): Promise<Ethers6TransactionReceipt>;
}

/** ethers v6 Transaction receipt. */
export interface Ethers6TransactionReceipt {
  hash: string;
  to: string | null;
  from: string;
  contractAddress: string | null;
  blockHash: string;
  blockNumber: number;
  gasUsed: Ethers6BigInt;
  cumulativeGasUsed: Ethers6BigInt;
  status: number;
  logs: Ethers6Log[];
}

/** ethers v6 Log entry. */
export interface Ethers6Log {
  address: string;
  blockHash: string;
  blockNumber: number;
  data: string;
  index: number;
  topics: string[];
  transactionHash: string;
  transactionIndex: number;
  removed?: boolean;
}

// ---------------------------------------------------------------------------
// Ethers6Adapter
// ---------------------------------------------------------------------------

/**
 * ethers v6 adapter implementing the Cinacoin Connector interface.
 *
 * Uses the modern Promise-based API of ethers v6 with BrowserProvider
 * and JsonRpcSigner.
 */
export class Ethers6Adapter extends EventEmitter implements Connector {
  readonly id = 'ethers6';
  readonly name = 'ethers v6';
  readonly icon = '';
  readonly installed: boolean;
  readonly type = 'injected';

  private provider: Ethers6Provider | null;
  private signer: Ethers6Signer | null = null;
  private chains: Chain[] = [];

  // Deep link stubs — injected connectors typically don't need these,
  // but the Connector interface requires them.
  async openDeepLink(
    _walletId: string,
    _uri: string,
    _params?: Partial<DeepLinkParams>,
  ): Promise<RedirectResult> {
    return { success: false, method: 'qr-code', url: '', fallbackUsed: false };
  }
  generateDeepLink(
    _walletId: string,
    _uri: string,
    _queryParams?: Record<string, string>,
  ): string {
    return '';
  }
  setRedirectHandler(_handler?: RedirectHandler): void {
    // no-op for injected connectors
  }

  /**
   * Create an ethers v6 adapter.
   *
   * @param provider - ethers v6 provider (BrowserProvider, JsonRpcProvider).
   */
  constructor(provider?: Ethers6Provider) {
    super();
    this.provider = provider ?? null;
    this.installed = provider !== null;
  }

  // -- Connector interface ---------------------------------------------------

  async connect(params?: ConnectParams): Promise<ConnectionResult> {
    if (!this.provider) {
      throw new Error('No ethers v6 provider set');
    }

    const accounts = await this.provider.listAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts available');
    }

    this.signer = await this.provider.getSigner();
    const network = await this.provider.getNetwork();
    const address = await this.signer.getAddress();

    return {
      sessionId: `${this.id}:${address}`,
      accounts: [address],
      chainId: Number(network.chainId),
      connectorId: this.id,
    };
  }

  async disconnect(): Promise<void> {
    this.signer = null;
  }

  async getAccounts(): Promise<string[]> {
    if (!this.provider) throw new Error('No provider');
    return this.provider.listAccounts();
  }

  async getChainId(): Promise<number> {
    if (!this.provider) throw new Error('No provider');
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this.provider) throw new Error('No provider');

    const hexChainId = `0x${chainId.toString(16)}`;

    try {
      await this.provider.send('wallet_switchEthereumChain', [{ chainId: hexChainId }]);
    } catch (switchError: any) {
      const chain = this.findChain(chainId);
      if (chain) {
        await this.provider.send('wallet_addEthereumChain', [
          {
            chainId: hexChainId,
            chainName: chain.name,
            rpcUrls: [chain.rpcUrl],
            nativeCurrency: chain.nativeCurrency ?? { name: 'ETH', symbol: 'ETH', decimals: 18 },
          },
        ]);
      } else {
        throw new Error(`Chain ${chainId} not found and cannot be added`);
      }
    }
  }

  async signMessage(message: string): Promise<string> {
    const signer = await this.getSigner();
    return signer.signMessage(message);
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    const signer = await this.getSigner();
    return signer.signTransaction(toEthers6Tx(tx));
  }

  getProvider(): unknown {
    return this.provider;
  }

  // -- ethers v6 specific methods --------------------------------------------

  /**
   * Get the ethers v6 Signer.
   */
  async getSigner(): Promise<Ethers6Signer> {
    if (this.signer) return this.signer;
    if (!this.provider) throw new Error('No provider');

    this.signer = await this.provider.getSigner();
    return this.signer;
  }

  /**
   * Get the ethers v6 Provider.
   */
  getEthersProvider(): Ethers6Provider | null {
    return this.provider;
  }

  /**
   * Get native balance for an address.
   */
  async getBalance(address?: string): Promise<Ethers6BigInt> {
    if (!this.provider) throw new Error('No provider');
    const addr = address ?? (await this.getAccounts())[0];
    return this.provider.getBalance(addr);
  }

  /**
   * Get current gas price.
   */
  async getGasPrice(): Promise<Ethers6BigInt> {
    if (!this.provider) throw new Error('No provider');
    return this.provider.getGasPrice();
  }

  /**
   * Get current block number.
   */
  async getBlockNumber(): Promise<number> {
    if (!this.provider) throw new Error('No provider');
    return this.provider.getBlockNumber();
  }

  /**
   * Send a transaction (supports EIP-1559).
   */
  async sendTransaction(tx: TransactionRequest): Promise<Ethers6TransactionResponse> {
    const signer = await this.getSigner();
    return signer.sendTransaction(toEthers6Tx(tx));
  }

  /**
   * Get a transaction by hash.
   */
  async getTransaction(hash: string): Promise<Ethers6TransactionResponse | null> {
    if (!this.provider) throw new Error('No provider');
    return this.provider.getTransaction(hash);
  }

  /**
   * Get a transaction receipt.
   */
  async getTransactionReceipt(hash: string): Promise<Ethers6TransactionReceipt | null> {
    if (!this.provider) throw new Error('No provider');
    return this.provider.getTransactionReceipt(hash);
  }

  /**
   * Call a contract method (read-only).
   */
  async call(to: string, data: string, from?: string): Promise<string> {
    if (!this.provider) throw new Error('No provider');
    return this.provider.call({ to, data, from });
  }

  /**
   * Get ERC-20 token balance.
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const data = '0x70a08231' + userAddress.slice(2).padStart(64, '0').toLowerCase();
    return this.call(tokenAddress, data, userAddress);
  }

  /**
   * Estimate gas for a transaction.
   */
  async estimateGas(tx: TransactionRequest): Promise<Ethers6BigInt> {
    if (!this.provider) throw new Error('No provider');
    return (await this.provider.send('eth_estimateGas', [
      {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      },
    ])) as unknown as Ethers6BigInt;
  }

  /**
   * Register supported chains.
   */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
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

  /**
   * Set the provider.
   */
  setProvider(provider: Ethers6Provider): void {
    this.provider = provider;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEthers6Tx(tx: TransactionRequest): Ethers6TransactionRequest {
  const result: Ethers6TransactionRequest = {};
  if (tx.from) result.from = tx.from;
  if (tx.to) result.to = tx.to;
  if (tx.value) result.value = tx.value;
  if (tx.data) result.data = tx.data;
  if (tx.gas) result.gasLimit = tx.gas;
  if (tx.gasPrice) result.gasPrice = tx.gasPrice;
  if (tx.maxFeePerGas) result.maxFeePerGas = tx.maxFeePerGas;
  if (tx.maxPriorityFeePerGas) result.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
  if (tx.nonce) result.nonce = parseInt(tx.nonce, 16);
  if (tx.chainId) result.chainId = BigInt(tx.chainId);
  // Default to EIP-1559 (type 2) if maxFeePerGas is present
  if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
    result.type = 2;
  }
  return result;
}
