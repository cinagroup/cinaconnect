/**
 * ethers v5 Adapter — supports legacy dApps on ethers.js v5.
 *
 * Wraps ethers v5's BrowserProvider / Web3Provider and Signer-based
 * connection model for Cinacoin integration.
 *
 * @example
 * ```ts
 * import { Ethers5Adapter } from '@cinacoin/core-sdk';
 * import { Web3Provider } from '@ethersproject/providers';
 *
 * const adapter = new Ethers5Adapter(provider);
 * await adapter.connect();
 * ```
 */

import type { Connector, RedirectHandler } from '../connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest, Chain } from '../types.js';
import type { DeepLinkParams, RedirectResult } from '../links/index.js';
import { EventEmitter } from '../events.js';

// ---------------------------------------------------------------------------
// ethers v5 type stubs — consumers install `@ethersproject/*` alongside.
// ---------------------------------------------------------------------------

/** ethers v5 Provider (JsonRpcProvider / Web3Provider / BrowserProvider). */
export interface Ethers5Provider {
  getNetwork(): Promise<Ethers5Network>;
  getBalance(address: string, blockTag?: string): Promise<Ethers5BigNumber>;
  getCode(address: string, blockTag?: string): Promise<string>;
  getGasPrice(): Promise<Ethers5BigNumber>;
  getBlockNumber(): Promise<number>;
  getTransaction(hash: string): Promise<Ethers5TransactionResponse | null>;
  getTransactionReceipt(hash: string): Promise<Ethers5TransactionReceipt | null>;
  send(method: string, params: unknown[]): Promise<unknown>;
  listAccounts(): Promise<string[]>;
  getSigner(index?: number): Ethers5Signer | undefined;
}

/** ethers v5 Network info. */
export interface Ethers5Network {
  chainId: number;
  name: string;
}

/** ethers v5 BigNumber. */
export interface Ethers5BigNumber {
  toString(): string;
  toHexString(): string;
  toNumber(): number;
}

/** ethers v5 Signer. */
export interface Ethers5Signer {
  getAddress(): Promise<string>;
  getBalance(): Promise<Ethers5BigNumber>;
  signMessage(message: string | Uint8Array): Promise<string>;
  signTransaction(transaction: Ethers5TransactionRequest): Promise<string>;
  sendTransaction(transaction: Ethers5TransactionRequest): Promise<Ethers5TransactionResponse>;
  connect(provider: Ethers5Provider): Ethers5Signer;
  provider?: Ethers5Provider;
}

/** ethers v5 Transaction request. */
export interface Ethers5TransactionRequest {
  from?: string;
  to?: string;
  value?: string | Ethers5BigNumber;
  data?: string;
  gasLimit?: string | Ethers5BigNumber;
  gasPrice?: string | Ethers5BigNumber;
  maxFeePerGas?: string | Ethers5BigNumber;
  maxPriorityFeePerGas?: string | Ethers5BigNumber;
  nonce?: number | Ethers5BigNumber;
  chainId?: number;
}

/** ethers v5 Transaction response. */
export interface Ethers5TransactionResponse {
  hash: string;
  from: string;
  to: string | null;
  nonce: number;
  gasLimit: Ethers5BigNumber;
  gasPrice?: Ethers5BigNumber;
  maxFeePerGas?: Ethers5BigNumber;
  maxPriorityFeePerGas?: Ethers5BigNumber;
  data: string;
  value: Ethers5BigNumber;
  chainId: number;
  wait(confirmations?: number): Promise<Ethers5TransactionReceipt>;
}

/** ethers v5 Transaction receipt. */
export interface Ethers5TransactionReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  gasUsed: Ethers5BigNumber;
  cumulativeGasUsed: Ethers5BigNumber;
  status?: number;
  logs: Ethers5Log[];
}

/** ethers v5 Log entry. */
export interface Ethers5Log {
  address: string;
  blockHash: string;
  blockNumber: number;
  data: string;
  logIndex: number;
  topics: string[];
  transactionHash: string;
  transactionIndex: number;
  removed?: boolean;
}

// ---------------------------------------------------------------------------
// Ethers5Adapter
// ---------------------------------------------------------------------------

/**
 * ethers v5 adapter implementing the Cinacoin Connector interface.
 *
 * Wraps an ethers v5 provider and signer for seamless integration
 * with legacy dApps still on ethers v5.
 */
export class Ethers5Adapter extends EventEmitter implements Connector {
  readonly id = 'ethers5';
  readonly name = 'ethers v5';
  readonly icon = '';
  readonly installed: boolean;
  readonly type = 'injected';

  private provider: Ethers5Provider | null;
  private signer: Ethers5Signer | null = null;
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
   * Create an ethers v5 adapter.
   *
   * @param provider - ethers v5 provider (Web3Provider, BrowserProvider, etc.)
   */
  constructor(provider?: Ethers5Provider) {
    super();
    this.provider = provider ?? null;
    this.installed = provider !== null;
  }

  // -- Connector interface ---------------------------------------------------

  async connect(params?: ConnectParams): Promise<ConnectionResult> {
    if (!this.provider) {
      throw new Error('No ethers v5 provider set');
    }

    const accounts = await this.provider.listAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts available');
    }

    this.signer = this.provider.getSigner(0) ?? null;
    if (!this.signer) {
      throw new Error('Unable to get signer from provider');
    }

    const network = await this.provider.getNetwork();
    const address = await this.signer.getAddress();

    return {
      sessionId: `${this.id}:${address}`,
      accounts: [address],
      chainId: network.chainId,
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
    return network.chainId;
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this.provider) throw new Error('No provider');

    try {
      // Try wallet_switchEthereumChain first
      await this.provider.send('wallet_switchEthereumChain', [{ chainId: `0x${chainId.toString(16)}` }]);
    } catch (switchError: any) {
      // Chain not added — try wallet_addEthereumChain
      const chain = this.findChain(chainId);
      if (chain) {
        await this.provider.send('wallet_addEthereumChain', [
          {
            chainId: `0x${chainId.toString(16)}`,
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
    return signer.signTransaction(toEthers5Tx(tx));
  }

  getProvider(): unknown {
    return this.provider;
  }

  // -- ethers v5 specific methods --------------------------------------------

  /**
   * Get the ethers v5 Signer.
   */
  async getSigner(): Promise<Ethers5Signer> {
    if (this.signer) return this.signer;
    if (!this.provider) throw new Error('No provider');

    this.signer = this.provider.getSigner(0) ?? null;
    if (!this.signer) {
      throw new Error('Unable to get signer');
    }
    return this.signer;
  }

  /**
   * Get the ethers v5 Provider.
   */
  getEthersProvider(): Ethers5Provider | null {
    return this.provider;
  }

  /**
   * Get native balance for an address.
   */
  async getBalance(address?: string): Promise<Ethers5BigNumber> {
    if (!this.provider) throw new Error('No provider');
    const addr = address ?? (await this.getAccounts())[0];
    return this.provider.getBalance(addr);
  }

  /**
   * Get current gas price.
   */
  async getGasPrice(): Promise<Ethers5BigNumber> {
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
   * Send a transaction.
   */
  async sendTransaction(tx: TransactionRequest): Promise<Ethers5TransactionResponse> {
    const signer = await this.getSigner();
    return signer.sendTransaction(toEthers5Tx(tx));
  }

  /**
   * Get a transaction by hash.
   */
  async getTransaction(hash: string): Promise<Ethers5TransactionResponse | null> {
    if (!this.provider) throw new Error('No provider');
    return this.provider.getTransaction(hash);
  }

  /**
   * Get a transaction receipt.
   */
  async getTransactionReceipt(hash: string): Promise<Ethers5TransactionReceipt | null> {
    if (!this.provider) throw new Error('No provider');
    return this.provider.getTransactionReceipt(hash);
  }

  /**
   * Call a contract method.
   */
  async call(to: string, data: string, from?: string): Promise<string> {
    if (!this.provider) throw new Error('No provider');
    return (await this.provider.send('eth_call', [
      { to, data, from },
      'latest',
    ])) as string;
  }

  /**
   * Get ERC-20 token balance.
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const data = '0x70a08231' + userAddress.slice(2).padStart(64, '0').toLowerCase();
    return this.call(tokenAddress, data, userAddress);
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
   * Set the provider (useful for reconnection).
   */
  setProvider(provider: Ethers5Provider): void {
    this.provider = provider;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEthers5Tx(tx: TransactionRequest): Ethers5TransactionRequest {
  const result: Ethers5TransactionRequest = {};
  if (tx.from) result.from = tx.from;
  if (tx.to) result.to = tx.to;
  if (tx.value) result.value = tx.value;
  if (tx.data) result.data = tx.data;
  if (tx.gas) result.gasLimit = tx.gas;
  if (tx.gasPrice) result.gasPrice = tx.gasPrice;
  if (tx.maxFeePerGas) result.maxFeePerGas = tx.maxFeePerGas;
  if (tx.maxPriorityFeePerGas) result.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
  if (tx.nonce) result.nonce = parseInt(tx.nonce, 16);
  if (tx.chainId) result.chainId = tx.chainId;
  return result;
}
