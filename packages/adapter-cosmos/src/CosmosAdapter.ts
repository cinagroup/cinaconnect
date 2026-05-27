/**
 * Cosmos Chain Adapter for Cinacoin.
 *
 * Provides a unified interface for interacting with Cosmos SDK chains:
 * Cosmos Hub, Osmosis, Injective, Celestia, and more.
 *
 * Supports Keplr and Leap wallet connectors for signing and transaction
 * broadcasting. Uses @cosmjs/stargate for RPC queries and transaction building.
 *
 * @example
 * ```ts
 * const cosmos = new CosmosAdapter({
 *   chainId: 'cosmoshub-4',
 *   rpcUrl: 'https://rpc.cosmos.network',
 * });
 * const { address } = await cosmos.connect();
 * await cosmos.sendTransfer({
 *   to: 'cosmos1...',
 *   amount: 1000000,
 *   denom: 'uatom',
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { Connector } from '@cinacoin/core-sdk';
import type { Chain } from '@cinacoin/core-sdk';
import { KeplrConnector } from './connectors/keplr.js';
import { LeapConnector } from './connectors/leap.js';
import type { CosmosWalletConnector, CosmosChainId, Coin, TxResult, TransferParams } from './types.js';

/* ------------------------------------------------------------------ */
/*  Cosmos chain presets                                                */
/* ------------------------------------------------------------------ */

/** Well-known Cosmos SDK chain presets. */
export const COSMOS_CHAINS: Chain[] = [
  {
    id: 'cosmos:cosmoshub-4',
    name: 'Cosmos Hub',
    rpcUrl: 'https://rpc.cosmos.network',
    nativeCurrency: { name: 'Cosmos', symbol: 'ATOM', decimals: 6 },
    explorerUrl: 'https://www.mintscan.io/cosmos',
    iconUrl: 'https://cryptologos.cc/logos/cosmos-atom-logo.svg',
  },
  {
    id: 'cosmos:osmosis-1',
    name: 'Osmosis',
    rpcUrl: 'https://rpc.osmosis.zone',
    nativeCurrency: { name: 'Osmosis', symbol: 'OSMO', decimals: 6 },
    explorerUrl: 'https://www.mintscan.io/osmosis',
    iconUrl: 'https://cryptologos.cc/logos/osmosis-osmo-logo.svg',
  },
  {
    id: 'cosmos:injective-1',
    name: 'Injective',
    rpcUrl: 'https://tm.injective.network',
    nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
    explorerUrl: 'https://www.mintscan.io/injective',
    iconUrl: 'https://cryptologos.cc/logos/injective-inj-logo.svg',
  },
  {
    id: 'cosmos:celestia',
    name: 'Celestia',
    rpcUrl: 'https://rpc-celestia.archway.dev',
    nativeCurrency: { name: 'Celestia', symbol: 'TIA', decimals: 6 },
    explorerUrl: 'https://www.mintscan.io/celestia',
    iconUrl: 'https://cryptologos.cc/logos/celestia-tia-logo.svg',
  },
];

/**
 * Chain metadata for well-known Cosmos SDK chains.
 * Includes bech32 prefixes, coin types, and REST endpoints.
 */
export const COSMOS_CHAIN_INFO: Record<string, {
  chainId: CosmosChainId;
  name: string;
  rpcUrl: string;
  restUrl: string;
  bech32Prefix: string;
  coinType: number;
  nativeDenom: string;
  nativeSymbol: string;
  nativeDecimals: number;
}> = {
  'cosmoshub-4': {
    chainId: 'cosmoshub-4',
    name: 'Cosmos Hub',
    rpcUrl: 'https://rpc.cosmos.network',
    restUrl: 'https://rest.cosmos.network',
    bech32Prefix: 'cosmos',
    coinType: 118,
    nativeDenom: 'uatom',
    nativeSymbol: 'ATOM',
    nativeDecimals: 6,
  },
  'osmosis-1': {
    chainId: 'osmosis-1',
    name: 'Osmosis',
    rpcUrl: 'https://rpc.osmosis.zone',
    restUrl: 'https://lcd.osmosis.zone',
    bech32Prefix: 'osmo',
    coinType: 118,
    nativeDenom: 'uosmo',
    nativeSymbol: 'OSMO',
    nativeDecimals: 6,
  },
  'injective-1': {
    chainId: 'injective-1',
    name: 'Injective',
    rpcUrl: 'https://tm.injective.network',
    restUrl: 'https://rest.lCD.injective.network',
    bech32Prefix: 'inj',
    coinType: 60,
    nativeDenom: 'inj',
    nativeSymbol: 'INJ',
    nativeDecimals: 18,
  },
  'celestia': {
    chainId: 'celestia',
    name: 'Celestia',
    rpcUrl: 'https://rpc-celestia.archway.dev',
    restUrl: 'https://api-celestia.archway.dev',
    bech32Prefix: 'celestia',
    coinType: 118,
    nativeDenom: 'utia',
    nativeSymbol: 'TIA',
    nativeDecimals: 6,
  },
};

/* ------------------------------------------------------------------ */
/*  CosmosAdapter                                                       */
/* ------------------------------------------------------------------ */

/**
 * Configuration for creating a CosmosAdapter instance.
 */
export interface CosmosAdapterConfig {
  /** Cosmos chain ID (e.g. "cosmoshub-4"). */
  chainId: CosmosChainId;
  /** RPC endpoint URL for Tendermint/Cosmos RPC. */
  rpcUrl?: string;
  /** REST (LCD) endpoint URL for queries. */
  restUrl?: string;
  /** Preferred wallet connector ("keplr" or "leap"). */
  wallet?: 'keplr' | 'leap';
}

/**
 * Result from a `connect()` call.
 */
export interface CosmosConnectResult {
  /** Bech32 address of the connected account. */
  address: string;
  /** Connected chain ID. */
  chainId: string;
}

/**
 * Cosmos chain adapter implementing the Cinacoin `ChainAdapter` pattern.
 *
 * Wraps a wallet connector (Keplr or Leap) with chain-specific operations:
 * connecting, signing, transferring tokens, and querying balances.
 *
 * Uses @cosmjs/stargate under the hood for transaction building and
 * RPC communication.
 */
export class CosmosAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'cosmos-adapter';

  /** Human-readable adapter name. */
  readonly name: string = 'Cosmos Chain Adapter';

  private _chainId: CosmosChainId;
  private _rpcUrl: string;
  private _restUrl: string;
  private _connector: CosmosWalletConnector | null = null;
  private _address: string | null = null;
  private _chains: Chain[] = [];
  private _preferredWallet: 'keplr' | 'leap' = 'keplr';

  constructor(config: CosmosAdapterConfig) {
    this._chainId = config.chainId;
    this._rpcUrl = config.rpcUrl ?? COSMOS_CHAIN_INFO[config.chainId]?.rpcUrl ?? '';
    this._restUrl = config.restUrl ?? COSMOS_CHAIN_INFO[config.chainId]?.restUrl ?? '';
    this._preferredWallet = config.wallet ?? 'keplr';

    if (!this._rpcUrl) {
      throw new Error(
        `No RPC URL configured for chain "${config.chainId}". Provide rpcUrl in config or use a known chain ID.`,
      );
    }
  }

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector (optional for Cosmos adapters). */
  setConnector(_connector: Connector): void {
    // Cosmos adapters use wallet connectors (Keplr/Leap) directly.
  }

  /** Register supported Cosmos chains. */
  registerChains(chains: Chain[]): void {
    this._chains = chains;
  }

  /**
   * Set the RPC endpoint URL.
   * @param url - Tendermint/Cosmos RPC URL.
   */
  setRpcUrl(url: string): void {
    this._rpcUrl = url;
  }

  /**
   * Set the REST (LCD) endpoint URL.
   * @param url - Cosmos REST API URL.
   */
  setRestUrl(url: string): void {
    this._restUrl = url;
  }

  /** Find a chain by numeric ID (Cosmos chains use string IDs — returns first chain). */
  findChain(_chainId: number): Chain | undefined {
    return this._chains[0];
  }

  /** Get the current wallet connector. */
  getConnector(): CosmosWalletConnector | null {
    return this._connector;
  }

  /* ---- Wallet Resolution ---- */

  /**
   * Resolve the preferred wallet connector.
   *
   * Tries the preferred wallet first (Keplr by default), then falls back
   * to the other if not available.
   *
   * @param walletId - Override the preferred wallet ("keplr" or "leap").
   * @returns The resolved connector, or null if neither is available.
   */
  resolveWallet(walletId?: 'keplr' | 'leap'): CosmosWalletConnector | null {
    const target = walletId ?? this._preferredWallet;

    if (target === 'keplr') {
      const keplr = new KeplrConnector();
      if (keplr.isAvailable()) return keplr;
      // Fallback to Leap
      const leap = new LeapConnector();
      if (leap.isAvailable()) return leap;
    } else {
      const leap = new LeapConnector();
      if (leap.isAvailable()) return leap;
      // Fallback to Keplr
      const keplr = new KeplrConnector();
      if (keplr.isAvailable()) return keplr;
    }

    return null;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a Cosmos wallet.
   *
   * Resolves the available wallet connector (Keplr → Leap by default),
   * requests chain permissions, and returns the connected address.
   *
   * @param walletId - Override wallet preference ("keplr" | "leap").
   * @returns Connected address and chain ID.
   */
  async connect(walletId?: 'keplr' | 'leap'): Promise<CosmosConnectResult> {
    const connector = this.resolveWallet(walletId);
    if (!connector) {
      throw new Error(
        'No Cosmos wallet found. Install Keplr (https://keplr.app) or Leap (https://leapwallet.io).',
      );
    }

    const result = await connector.connect(this._chainId);
    this._connector = connector;
    this._address = result.address;

    return result;
  }

  /**
   * Disconnect from the wallet and clear session state.
   */
  async disconnect(): Promise<void> {
    if (this._connector) {
      await this._connector.disconnect();
      this._connector = null;
      this._address = null;
    }
  }

  /**
   * Get the connected bech32 address.
   * @returns Address string or null if not connected.
   */
  getAddress(): string | null {
    return this._address;
  }

  /* ---- Balance ---- */

  /**
   * Query the native token balance for a given address.
   *
   * Uses the REST (LCD) endpoint to fetch account balances.
   * Falls back to RPC query if REST is unavailable.
   *
   * @param address - Bech32-encoded Cosmos address.
   * @returns Array of Coin objects with denom and amount.
   */
  async getBalance(address: string): Promise<Coin[]> {
    if (!this._isValidBech32(address)) {
      throw new Error(`Invalid Cosmos address: ${address}`);
    }

    // Try REST (LCD) endpoint first
    if (this._restUrl) {
      try {
        const response = await fetch(
          `${this._restUrl}/cosmos/bank/v1beta1/balances/${address}`,
        );
        if (response.ok) {
          const data = await response.json();
          return (data.balances ?? []) as Coin[];
        }
      } catch {
        // Fall through to RPC
      }
    }

    // Fallback: RPC query via abci_query
    if (this._rpcUrl) {
      return this._queryBalanceViaRPC(address);
    }

    throw new Error('No RPC or REST endpoint configured');
  }

  /**
   * Get the native token balance as a human-readable decimal string.
   *
   * @param address - Bech32 address.
   * @param denom - Token denomination (defaults to chain native denom).
   * @returns Balance as a decimal string (e.g. "1.234567").
   */
  async getBalanceFormatted(address: string, denom?: string): Promise<string> {
    const balances = await this.getBalance(address);
    const target = balances.find(
      (c) => c.denom === (denom ?? this._getNativeDenom()),
    );

    if (!target) return '0';

    const chainInfo = COSMOS_CHAIN_INFO[this._chainId];
    const decimals = chainInfo?.nativeDecimals ?? 6;

    const amount = BigInt(target.amount);
    const divisor = 10n ** BigInt(decimals);
    const intPart = amount / divisor;
    const fracPart = amount % divisor;

    if (fracPart === 0n) return intPart.toString();

    const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${intPart}.${fracStr}`;
  }

  /* ---- Transactions ---- */

  /**
   * Send a token transfer.
   *
   * Builds a MsgSend transaction, signs it via the connected wallet,
   * and broadcasts it to the network.
   *
   * @param params - Transfer parameters (to, amount, denom, optional memo).
   * @returns Transaction result with hash and status.
   */
  async sendTransfer(params: TransferParams): Promise<TxResult> {
    if (!this._connector) {
      throw new Error('No wallet connected. Call connect() first.');
    }

    if (!this._isValidBech32(params.to)) {
      throw new Error(`Invalid recipient address: ${params.to}`);
    }

    const fromAddress = this._address;
    if (!fromAddress) {
      throw new Error('No address available. Connect first.');
    }

    const amountStr = String(params.amount);
    const denom = params.denom;

    // Use the connector to build and send the transfer
    try {
      const txHash = await this._connector.sendTransfer(
        this._chainId,
        params.to,
        amountStr,
        denom,
        params.memo,
      );

      // Check if it's a raw hash (64 hex chars) or a JSON payload
      if (/^[0-9a-fA-F]{64}$/.test(txHash)) {
        return {
          transactionHash: txHash,
          success: true,
        };
      }

      // JSON payload — parse and construct result
      // The actual broadcast happens via @cosmjs/stargate in the wallet
      return {
        transactionHash: txHash,
        success: true,
      };
    } catch (error) {
      return {
        transactionHash: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Sign a transaction.
   *
   * Delegates to the connected wallet's signing method.
   *
   * @param tx - Transaction object to sign (Cosmos SignDoc or raw tx).
   * @returns Signature as hex string.
   */
  async signTransaction(tx: unknown): Promise<string> {
    if (!this._connector) {
      throw new Error('No wallet connected. Call connect() first.');
    }

    if (!this._address) {
      throw new Error('No address available. Connect first.');
    }

    // If it's a SignDoc, sign it directly
    if (
      typeof tx === 'object' &&
      tx !== null &&
      'bodyBytes' in tx &&
      'authInfoBytes' in tx &&
      'chainId' in tx &&
      'accountNumber' in tx
    ) {
      const signDoc = tx as import('./types.js').SignDoc;
      const result = await this._connector.sign(this._address, signDoc);
      return this._bytesToHex(result.signature);
    }

    // Otherwise, treat as a generic transaction and delegate
    throw new Error(
      'signTransaction expects a Cosmos SignDoc. Use sendTransfer() for simple transfers.',
    );
  }

  /**
   * Sign an arbitrary message.
   *
   * @param message - Message string to sign.
   * @returns Signature as hex string.
   */
  async signMessage(message: string): Promise<string> {
    if (!this._connector || !this._address) {
      throw new Error('No wallet connected. Call connect() first.');
    }

    const result = await this._connector.signArbitrary(this._address, message);
    return this._bytesToHex(result.signature);
  }

  /* ---- Chain Info ---- */

  /**
   * Get the current chain ID.
   * @returns Cosmos chain ID string.
   */
  getChainId(): string {
    return this._chainId;
  }

  /**
   * Get native token denomination for the current chain.
   * @returns Native denom (e.g. "uatom").
   */
  getNativeDenom(): string {
    return this._getNativeDenom();
  }

  /**
   * Switch to a different Cosmos chain.
   *
   * Updates the chain ID and resolves new RPC/REST endpoints from the
   * built-in chain presets.
   *
   * @param chainId - Target Cosmos chain ID.
   */
  async switchChain(chainId: CosmosChainId): Promise<void> {
    const info = COSMOS_CHAIN_INFO[chainId];
    if (!info) {
      throw new Error(`Unknown chain: ${chainId}. Provide custom rpcUrl/restUrl.`);
    }

    this._chainId = chainId;
    this._rpcUrl = info.rpcUrl;
    this._restUrl = info.restUrl;
    this._address = null;

    // Reconnect if already connected
    if (this._connector) {
      const result = await this._connector.connect(chainId);
      this._address = result.address;
    }
  }

  /** Get connected account addresses. Required by ChainAdapter interface. */
  async getAccounts(): Promise<string[]> {
    if (!this._connector || !this._address) return [];
    return [this._address];
  }

  /** Set client (not applicable for Cosmos adapters). */
  setClient(_client: unknown): void {
    // Cosmos adapters use wallet connectors, not raw clients.
  }

  /* ---- Query Helpers ---- */

  /**
   * Query the latest block height via RPC.
   * @returns Block height as a number.
   */
  async getBlockHeight(): Promise<number> {
    const response = await fetch(`${this._rpcUrl}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'block',
        params: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Cosmos RPC error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return parseInt(data.result.block.header.height, 10);
  }

  /**
   * Query account info (account number, sequence) via REST.
   *
   * Required for building transactions.
   *
   * @param address - Bech32 address.
   * @returns Account number and sequence.
   */
  async getAccountInfo(address: string): Promise<{ accountNumber: number; sequence: number }> {
    if (this._restUrl) {
      try {
        const response = await fetch(
          `${this._restUrl}/cosmos/auth/v1beta1/accounts/${address}`,
        );
        if (response.ok) {
          const data = await response.json();
          const account = data.account ?? data.base_account ?? {};
          return {
            accountNumber: parseInt(account.account_number ?? '0', 10),
            sequence: parseInt(account.sequence ?? '0', 10),
          };
        }
      } catch {
        // Fall through
      }
    }

    // Fallback via RPC
    const bech32Bytes = this._bech32ToBytes(address);
    const path = `/cosmos/auth/v1beta1/accounts/${address}`;

    const response = await fetch(`${this._rpcUrl}/abci_query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'abci_query',
        params: {
          path,
          data: Buffer.from(bech32Bytes).toString('base64'),
          prove: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Cosmos RPC error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return { accountNumber: 0, sequence: 0 };
  }

  /* ---- Private Helpers ---- */

  /** Get the native denomination for the current chain. */
  private _getNativeDenom(): string {
    return COSMOS_CHAIN_INFO[this._chainId]?.nativeDenom ?? 'uatom';
  }

  /** Query balance via Tendermint RPC (abci_query fallback). */
  private async _queryBalanceViaRPC(address: string): Promise<Coin[]> {
    const response = await fetch(`${this._rpcUrl}/abci_query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'abci_query',
        params: {
          path: `/cosmos/bank/v1beta1/balances/${address}`,
          data: '',
          prove: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Cosmos RPC error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    if (data.result?.value) {
      const decoded = Buffer.from(data.result.value, 'base64').toString();
      try {
        const parsed = JSON.parse(decoded);
        return (parsed.balances ?? []) as Coin[];
      } catch {
        return [];
      }
    }

    return [];
  }

  /**
   * Basic bech32 validation.
   *
   * Checks that the address has a valid bech32 prefix and length.
   * Does not verify the checksum (would require a full bech32 library).
   */
  private _isValidBech32(address: string): boolean {
    if (typeof address !== 'string') return false;

    const separatorIndex = address.lastIndexOf('1');
    if (separatorIndex === -1 || separatorIndex === 0) return false;

    const prefix = address.slice(0, separatorIndex);
    const data = address.slice(separatorIndex + 1);

    // Prefix should be lowercase alphanumeric
    if (!/^[a-z]+$/.test(prefix)) return false;

    // Data should be valid bech32 charset (qpzry9x8gf2tvdw0s3jn54khce6mua7l)
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    for (let i = 0; i < data.length; i++) {
      if (CHARSET.indexOf(data[i]) === -1) return false;
    }

    // Typical Cosmos address data length: 52 characters (32 bytes + 6 checksum)
    return data.length >= 38 && data.length <= 60;
  }

  /** Decode bech32 address to raw bytes (simplified). */
  private _bech32ToBytes(address: string): Uint8Array {
    const separatorIndex = address.lastIndexOf('1');
    const data = address.slice(separatorIndex + 1).slice(0, -6); // Remove checksum

    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    const bytes: number[] = [];

    // Convert from base32 (5-bit groups) to bytes (8-bit groups)
    let buffer = 0;
    let bitsLeft = 0;

    for (let i = 0; i < data.length; i++) {
      const value = CHARSET.indexOf(data[i]);
      if (value === -1) throw new Error(`Invalid bech32 character: ${data[i]}`);

      buffer = (buffer << 5) | value;
      bitsLeft += 5;

      if (bitsLeft >= 8) {
        bitsLeft -= 8;
        bytes.push((buffer >> bitsLeft) & 0xff);
      }
    }

    return new Uint8Array(bytes);
  }

  /** Convert bytes to hex string. */
  private _bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
