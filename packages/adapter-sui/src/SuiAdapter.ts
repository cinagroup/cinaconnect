/**
 * Sui Chain Adapter — provides Sui-specific blockchain operations.
 *
 * Implements the {@link ChainAdapter} interface from @cinacoin/core-sdk
 * and adds Sui-native methods for object queries, SUI balance lookups,
 * and transaction execution on the Sui network.
 *
 * Supports Sui Wallet, Ethos, Suiet, and Martian wallet connectors.
 *
 * @example
 * ```ts
 * import { SuiChainAdapter, SUI_CHAINS } from '@cinacoin/adapter-sui';
 *
 * const adapter = new SuiChainAdapter();
 * adapter.registerChains(SUI_CHAINS);
 *
 * await adapter.connect();
 * const balance = await adapter.getBalance(adapter.getAddress()!);
 * console.log(`Balance: ${balance} SUI`);
 * ```
 *
 * @packageDocumentation
 */

import type { Connector } from '@cinacoin/core-sdk';
import type { Chain } from '@cinacoin/core-sdk';
import type { ChainAdapter } from '@cinacoin/core-sdk';

import {
  isValidSuiAddress,
  type SuiWalletProvider,
  type SuiCoinBalance,
  type SuiObjectResponse,
  type SuiTransactionEffects,
  type SuiTransactionCall,
  type SuiTransferSui,
  type SuiNetwork,
  type SuiChainPreset,
} from './types.js';

import { SuiWalletConnector } from './connectors/sui-wallet.js';
import { EthosConnector } from './connectors/ethos.js';
import { SuietConnector } from './connectors/suiet.js';
import { MartianConnector } from './connectors/martian.js';
import type { SuiConnector } from './types.js';

/* ------------------------------------------------------------------ */
/*  Sui chain presets                                                  */
/* ------------------------------------------------------------------ */

/** Well-known Sui chain presets. */
export const SUI_CHAINS: SuiChainPreset[] = [
  {
    id: 'sui:mainnet',
    name: 'Sui Mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    explorerUrl: 'https://suiscan.xyz/mainnet',
  },
  {
    id: 'sui:testnet',
    name: 'Sui Testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    faucetUrl: 'https://faucet.testnet.sui.io/v1/gas',
    explorerUrl: 'https://suiscan.xyz/testnet',
  },
  {
    id: 'sui:devnet',
    name: 'Sui Devnet',
    rpcUrl: 'https://fullnode.devnet.sui.io:443',
    faucetUrl: 'https://faucet.devnet.sui.io/v1/gas',
    explorerUrl: 'https://suiscan.xyz/devnet',
  },
  {
    id: 'sui:localnet',
    name: 'Sui Localnet',
    rpcUrl: 'http://127.0.0.1:9000',
    explorerUrl: '',
  },
];

/** Supported Sui wallets for discovery / UI rendering. */
export interface SuiWalletInfo {
  id: string;
  name: string;
  icon: string;
  rdns?: string;
  /** URL to install the wallet if not present. */
  downloadUrl: string;
}

export const SUI_WALLETS: SuiWalletInfo[] = [
  {
    id: 'sui-wallet',
    name: 'Sui Wallet',
    icon: 'https://sui.io/favicon.svg',
    rdns: 'sui-wallet',
    downloadUrl: 'https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmalkbfppkfmjfjj',
  },
  {
    id: 'ethos',
    name: 'Ethos Wallet',
    icon: 'https://ethoswallet.xyz/favicon.svg',
    rdns: 'xyz.ethos.wallet',
    downloadUrl: 'https://ethoswallet.xyz',
  },
  {
    id: 'suiet',
    name: 'Suiet Wallet',
    icon: 'https://suiet.app/favicon.svg',
    rdns: 'app.suiet',
    downloadUrl: 'https://suiet.app',
  },
  {
    id: 'martian',
    name: 'Martian Wallet',
    icon: 'https://martianwallet.xyz/favicon.svg',
    rdns: 'xyz.martianwallet',
    downloadUrl: 'https://martianwallet.xyz',
  },
];

/**
 * Convert MIST to SUI (1 SUI = 10^9 MIST).
 */
export function mistToSui(mist: string | number | bigint): string {
  const mistNum = BigInt(mist);
  const whole = mistNum / 1_000_000_000n;
  const frac = mistNum % 1_000_000_000n;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

/**
 * Convert SUI to MIST.
 */
export function suiToMist(sui: string | number | bigint): bigint {
  if (typeof sui === 'bigint') return sui * 1_000_000_000n;
  const str = String(sui);
  const [whole, frac] = str.split('.');
  const wholePart = BigInt(whole || '0') * 1_000_000_000n;
  if (!frac) return wholePart;
  const fracPadded = frac.padEnd(9, '0').slice(0, 9);
  return wholePart + BigInt(fracPadded);
}

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter                                                     */
/* ------------------------------------------------------------------ */

/**
 * Sui chain adapter implementing chain-specific operations.
 *
 * Wraps a connector/provider with Sui-specific JSON-RPC calls for
 * balance queries, object lookups, transaction signing and execution.
 *
 * Implements {@link ChainAdapter} for compatibility with the core SDK.
 */
export class SuiChainAdapter implements ChainAdapter {
  readonly id = 'sui';
  readonly name = 'Sui Chain Adapter';

  private provider: SuiWalletProvider | null = null;
  private chains: Map<string, SuiChainPreset> = new Map();
  private currentNetwork: SuiNetwork = 'mainnet';
  private rpcUrl: string = SUI_CHAINS[0].rpcUrl;

  /** Registered connectors for discovery. */
  private connectors: SuiConnector[] = [];

  constructor() {
    // Register default connectors
    this.registerConnector(new SuiWalletConnector());
    this.registerConnector(new SuietConnector());
    this.registerConnector(new EthosConnector());
    this.registerConnector(new MartianConnector());

    // Register default chains
    for (const chain of SUI_CHAINS) {
      this.chains.set(chain.id, chain);
    }
  }

  /* ---- Connector Management ---- */

  /**
   * Register a Sui wallet connector for discovery.
   */
  registerConnector(connector: SuiConnector): void {
    if (!this.connectors.some((c) => c.id === connector.id)) {
      this.connectors.push(connector);
    }
  }

  /**
   * Get all registered connectors.
   */
  getConnectors(): SuiConnector[] {
    return [...this.connectors];
  }

  /**
   * Get connectors that are currently available (wallet installed).
   */
  getAvailableConnectors(): SuiConnector[] {
    return this.connectors.filter((c) => c.isAvailable());
  }

  /* ---- ChainAdapter Implementation ---- */

  /**
   * Set the underlying connector (compatibility shim).
   * @deprecated Use the adapter's own connect() method instead.
   */
  setConnector(connector: Connector): void {
    // No-op for now — connector integration with core SDK Connector
    // is handled through the adapter's own wallet connector system.
  }

  /**
   * Register supported Sui chains.
   *
   * @param chains - Array of chain definitions. Each chain must have
   *   an `id` (e.g. "sui:mainnet") and an `rpcUrl`.
   */
  registerChains(chains: Chain[]): void {
    for (const chain of chains) {
      const preset: SuiChainPreset = {
        id: chain.id,
        name: chain.name,
        rpcUrl: chain.rpcUrl ?? this.rpcUrl,
        explorerUrl: chain.explorerUrl ?? '',
      };
      this.chains.set(preset.id, preset);
    }
  }

  /**
   * Find a Sui chain by its ID.
   */
  findChain(chainId: number): Chain | undefined {
    // Sui uses string-based chain IDs, so numeric lookup returns mainnet
    // by convention or undefined.
    for (const chain of this.chains.values()) {
      if (chain.id === `sui:mainnet`) {
        return {
          id: chain.id,
          name: chain.name,
          rpcUrl: chain.rpcUrl,
          nativeCurrency: { name: 'Sui', symbol: 'SUI', decimals: 9 },
          explorerUrl: chain.explorerUrl,
        };
      }
    }
    return undefined;
  }

  /**
   * Get connected account addresses.
   *
   * @returns Array with the connected Sui address, or empty array.
   */
  async getAccounts(): Promise<string[]> {
    const address = this.provider?.account;
    return address ? [address] : [];
  }

  /**
   * Get SUI balance for an address.
   *
   * @param address - Sui address (hex with 0x prefix).
   * @returns Balance in SUI as a decimal string (e.g. "1.234").
   */
  async getBalance(address: string, coinType?: string): Promise<string> {
    if (!isValidSuiAddress(address)) {
      throw new Error(`Invalid Sui address: ${address}`);
    }

    const coin = coinType ?? '0x2::sui::SUI';

    try {
      const result = await this._rpcCall<SuiCoinBalance>('suix_getBalance', [
        address,
        coin,
      ]);
      return mistToSui(result.totalBalance);
    } catch {
      return '0';
    }
  }

  /**
   * Send a transaction (alias for executeTransaction for ChainAdapter compat).
   *
   * @param tx - Serialized transaction bytes as a base64 string.
   * @returns Transaction digest.
   */
  async sendTransaction(tx: string | { txBytes: string }): Promise<string> {
    const txBytes = typeof tx === 'string' ? tx : tx.txBytes;
    return this.executeTransaction(txBytes);
  }

  /**
   * Sign a message.
   *
   * @param message - Message string to sign.
   * @returns Signature as a base64 string.
   */
  async signMessage(message: string): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');
    if (!this.provider.signMessage) {
      throw new Error('Connected wallet does not support message signing');
    }
    const result = await this.provider.signMessage(message);
    return result.signature;
  }

  /**
   * Switch the active Sui network.
   *
   * @param network - Network identifier: "mainnet", "testnet", "devnet", or "localnet".
   *   Also accepts the Sui chain ID string (e.g. "sui:testnet").
   */
  async switchChain(chainId: number): Promise<void>;
  async switchChain(chainId: SuiNetwork | string): Promise<void>;
  async switchChain(identifier: SuiNetwork | string | number): Promise<void> {
    let network: SuiNetwork;

    if (typeof identifier === 'number') {
      // Numeric mapping: 0 → mainnet, 1 → testnet, 2 → devnet, 3 → localnet
      const mapping: SuiNetwork[] = ['mainnet', 'testnet', 'devnet', 'localnet'];
      network = mapping[identifier] ?? 'mainnet';
    } else if (identifier.startsWith('sui:')) {
      const net = identifier.split(':')[1] as SuiNetwork;
      network = net;
    } else {
      network = identifier as SuiNetwork;
    }

    const chain = this.chains.get(`sui:${network}`);
    if (!chain) {
      throw new Error(`Unknown Sui network: ${network}`);
    }

    this.currentNetwork = network;
    this.rpcUrl = chain.rpcUrl;
  }

  /* ---- Sui-Specific Methods ---- */

  /**
   * Get the currently connected address.
   *
   * @returns The Sui address string, or null if not connected.
   */
  getAddress(): string | null {
    return this.provider?.account ?? null;
  }

  /**
   * Connect to a Sui wallet.
   *
   * If `walletId` is provided, attempts to connect using that specific
   * connector. Otherwise, tries available connectors in order:
   * Sui Wallet → Suiet → Ethos.
   *
   * @param walletId - Optional wallet connector id
   *   ("sui-wallet", "ethos", "suiet").
   * @returns Connected address.
   */
  async connect(walletId?: string): Promise<string> {
    let connector: SuiConnector | undefined;

    if (walletId) {
      connector = this.connectors.find((c) => c.id === walletId);
      if (!connector) throw new Error(`Unknown Sui wallet connector: ${walletId}`);
    }

    // Try specific connector or auto-detect
    if (connector) {
      if (!connector.isAvailable()) {
        throw new Error(`${connector.name} is not installed.`);
      }
      const result = await connector.connect();
      this.provider = connector.getProvider();
      this._bindProviderEvents();
      return result.accounts[0];
    }

    // Auto-detect: Sui Wallet → Suiet → Ethos → Martian
    const available = this.getAvailableConnectors();
    if (available.length === 0) {
      throw new Error(
        'No Sui wallet found. Install Sui Wallet, Suiet, Ethos Wallet, or Martian Wallet.',
      );
    }

    const result = await available[0].connect();
    this.provider = available[0].getProvider();
    this._bindProviderEvents();
    return result.accounts[0];
  }

  /**
   * Disconnect from the current wallet.
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
    }
  }

  /**
   * Whether a wallet is currently connected.
   */
  isConnected(): boolean {
    return this.provider?.connected ?? false;
  }

  /**
   * Get the current Sui network.
   */
  getNetwork(): SuiNetwork {
    return this.currentNetwork;
  }

  /**
   * Get the current RPC URL.
   */
  getRpcUrl(): string {
    return this.rpcUrl;
  }

  /* ---- Transaction Operations ---- */

  /**
   * Sign a Sui transaction.
   *
   * @param tx - Serialized transaction bytes as a base64 string.
   * @returns Signed transaction bytes and signature.
   */
  async signTransaction(tx: string): Promise<{ bytes: string; signature: string }> {
    if (!this.provider) throw new Error('No provider connected. Call connect() first.');
    return this.provider.signTransaction(tx);
  }

  /**
   * Execute a Sui transaction on the network.
   *
   * This signs the transaction via the connected wallet and submits it
   * to the Sui network, waiting for local execution confirmation.
   *
   * @param tx - Serialized transaction bytes as a base64 string.
   * @returns Transaction digest (hash).
   */
  async executeTransaction(
    tx: string,
    options?: { requestType?: 'WaitForLocalExec' | 'WaitForEffectsCert' },
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected. Call connect() first.');

    const result = await this.provider.signAndExecuteTransaction(tx, {
      requestType: options?.requestType ?? 'WaitForLocalExec',
    });
    return result.digest;
  }

  /**
   * Build and execute a SUI coin transfer.
   *
   * Convenience method that constructs a TransferSUI transaction
   * and executes it through the connected wallet.
   *
   * @param params - Transfer parameters.
   * @returns Transaction digest.
   */
  async transferSui(params: SuiTransferSui): Promise<string> {
    if (!isValidSuiAddress(params.recipient)) {
      throw new Error(`Invalid recipient address: ${params.recipient}`);
    }

    if (!this.provider) throw new Error('No provider connected. Call connect() first.');

    // Build a simple PaySui transaction call
    const txCall: SuiTransactionCall = {
      target: '0x2::pay::split_and_transfer',
      typeArguments: ['0x2::sui::SUI'],
      arguments: [
        params.recipient,
        params.amount ? String(params.amount) : null, // null = full balance
      ],
    };

    // The transaction bytes would be built by the wallet or a Move call builder.
    // For now, we delegate to the wallet's signAndExecuteTransaction.
    // In a full implementation, you'd use @mysten/sui.js TransactionBlock here.
    const txBytes = JSON.stringify(txCall);
    const result = await this.provider.signAndExecuteTransaction(txBytes);
    return result.digest;
  }

  /**
   * Build a Move function call transaction.
   *
   * @param call - Move function call descriptor.
   * @returns Transaction bytes as base64 string.
   */
  buildMoveCall(call: SuiTransactionCall): string {
    return btoa(JSON.stringify(call));
  }

  /* ---- Query Operations ---- */

  /**
   * Query a Sui object by its ID.
   *
   * @param objectId - Sui object ID (hex with 0x prefix).
   * @returns Object response with data or error.
   */
  async getObject(objectId: string): Promise<SuiObjectResponse> {
    return this._rpcCall<SuiObjectResponse>('sui_getObject', [
      objectId,
      {
        showType: true,
        showOwner: true,
        showContent: true,
      },
    ]);
  }

  /**
   * Get all SUI coin objects owned by an address.
   *
   * @param address - Sui address.
   * @param cursor - Optional pagination cursor.
   * @returns Coin objects owned by the address.
   */
  async getCoins(
    address: string,
    coinType?: string,
    cursor?: string,
  ): Promise<{
    data: Array<{
      coinType: string;
      coinObjectId: string;
      version: string;
      digest: string;
      balance: string;
    }>;
    hasNextPage: boolean;
    nextCursor?: string;
  }> {
    if (!isValidSuiAddress(address)) {
      throw new Error(`Invalid Sui address: ${address}`);
    }

    const type = coinType ?? '0x2::sui::SUI';
    return this._rpcCall('suix_getCoins', [address, type, cursor, null]);
  }

  /**
   * Get the total SUI balance (shortcut for getBalance).
   *
   * @param address - Sui address.
   * @returns Balance in SUI as a decimal string.
   */
  async getSuiBalance(address: string): Promise<string> {
    return this.getBalance(address);
  }

  /**
   * Get all coin types owned by an address.
   *
   * @param address - Sui address.
   */
  async getAllBalances(address: string): Promise<SuiCoinBalance[]> {
    if (!isValidSuiAddress(address)) {
      throw new Error(`Invalid Sui address: ${address}`);
    }

    return this._rpcCall<SuiCoinBalance[]>('suix_getAllBalances', [address]);
  }

  /**
   * Get transaction effects by digest.
   *
   * @param digest - Transaction digest.
   */
  async getTransactionEffects(digest: string): Promise<SuiTransactionEffects> {
    return this._rpcCall<SuiTransactionEffects>('sui_getTransactionBlock', [
      digest,
      { showEffects: true },
    ]);
  }

  /**
   * Get the current network epoch info.
   */
  async getEpochInfo(): Promise<{
    epoch: string;
    referenceGasPrice: string;
  }> {
    return this._rpcCall('suix_getEpochs', [null, '1']);
  }

  /**
   * Get reference gas price for the current epoch.
   *
   * @returns Reference gas price in MIST.
   */
  async getReferenceGasPrice(): Promise<string> {
    const result = await this._rpcCall<{ referenceGasPrice: string }>(
      'suix_getReferenceGasPrice',
      [],
    );
    return result.referenceGasPrice;
  }

  /* ---- Private Helpers ---- */

  /**
   * Make a JSON-RPC call to the Sui full node.
   */
  private async _rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sui RPC error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Sui RPC error: ${data.error.message ?? JSON.stringify(data.error)}`);
    }

    return data.result as T;
  }

  /**
   * Bind provider event listeners to clear state on disconnect.
   */
  private _bindProviderEvents(): void {
    if (!this.provider) return;
    this.provider.on('disconnect', () => {
      this.provider = null;
    });
  }
}
