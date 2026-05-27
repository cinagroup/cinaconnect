/**
 * Hedera Chain Adapter — provides Hedera-specific operations.
 *
 * Dual-mode adapter supporting:
 * - Native HAPI (Hedera API) for HBAR, HTS tokens, consensus
 * - EVM compatibility mode (HIP-26) for Solidity smart contracts
 *
 * Wallet integrations:
 * - HashPack (window.hashpack)
 * - Blade wallet
 * - Kaiban wallet
 *
 * Mirror Node REST API for historical queries.
 */

import type { Connector } from '../connector.js';
import type { Chain } from '../types.js';

/* ------------------------------------------------------------------ */
/*  Hedera address & account utilities                                  */
/* ------------------------------------------------------------------ */

/**
 * Validate a Hedera account ID (0.0.X format).
 */
export function isValidHederaAccountId(id: string): boolean {
  if (typeof id !== 'string') return false;
  return /^0\.0\.\d+$/.test(id);
}

/**
 * Validate a Hedera EVM address (0x-prefixed 40 hex chars).
 */
export function isValidHederaEvmAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  const hex = address.slice(2);
  return hex.length === 40 && /^[0-9a-fA-F]+$/.test(hex);
}

/**
 * Normalize a Hedera address — accepts both 0.0.X and 0x... formats.
 * Returns the input unchanged if valid.
 */
export function normalizeHederaAddress(address: string): string {
  if (isValidHederaAccountId(address)) return address;
  if (isValidHederaEvmAddress(address)) return address.toLowerCase();
  throw new Error(`Invalid Hedera address: ${address}`);
}

/**
 * Check if a string is a valid Hedera token ID (0.0.X).
 */
export function isValidHederaTokenId(id: string): boolean {
  return isValidHederaAccountId(id);
}

/**
 * Check if a string is a valid Hedera contract ID (0.0.X).
 */
export function isValidHederaContractId(id: string): boolean {
  return isValidHederaAccountId(id);
}

/**
 * Convert a Hedera account ID (0.0.X) to its EVM long-form address.
 * The EVM address is the 20-byte Keccak-256 hash of the encoded account bytes,
 * but for simplicity we use the solidified-address convention:
 * 0.0.123 → 0x000000000000000000000000000000000000007b
 */
export function accountIdToEvmAddress(accountId: string): string {
  if (!isValidHederaAccountId(accountId)) {
    throw new Error(`Invalid Hedera account ID: ${accountId}`);
  }
  const parts = accountId.split('.');
  const num = parseInt(parts[2], 10);
  return '0x' + num.toString(16).padStart(40, '0');
}

/**
 * Parse a Hedera account ID from its numeric parts.
 */
export function parseAccountId(accountId: string): { realm: number; shard: number; num: number } | null {
  if (!isValidHederaAccountId(accountId)) return null;
  const parts = accountId.split('.');
  return {
    shard: parseInt(parts[0], 10),
    realm: parseInt(parts[1], 10),
    num: parseInt(parts[2], 10),
  };
}

/* ------------------------------------------------------------------ */
/*  HBAR formatting                                                     */
/* ------------------------------------------------------------------ */

/** HBAR has 8 decimal places. */
const HBAR_DECIMALS = 8;
const HBAR_DIVISOR = 10n ** BigInt(HBAR_DECIMALS);

/**
 * Serialize a tinybar amount to human-readable HBAR.
 */
export function formatHbar(tinybar: string | bigint | number): string {
  const n = BigInt(tinybar);
  const isNegative = n < 0n;
  const abs = isNegative ? -n : n;
  const intPart = abs / HBAR_DIVISOR;
  const fracPart = abs % HBAR_DIVISOR;
  const fracStr = fracPart.toString().padStart(HBAR_DECIMALS, '0').replace(/0+$/, '');
  const result = fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Parse a human-readable HBAR amount to tinybar (smallest unit).
 */
export function parseHbarAmount(hbar: string): bigint {
  const trimmed = hbar.trim();
  const isNegative = trimmed.startsWith('-');
  const clean = isNegative ? trimmed.slice(1) : trimmed;
  const parts = clean.split('.');
  const intPart = BigInt(parts[0] || '0');
  let fracPart = 0n;
  if (parts.length > 1) {
    const frac = parts[1].padEnd(HBAR_DECIMALS, '0').slice(0, HBAR_DECIMALS);
    fracPart = BigInt(frac);
  }
  const result = intPart * HBAR_DIVISOR + fracPart;
  return isNegative ? -result : result;
}

/* ------------------------------------------------------------------ */
/*  Hedera Mirror Node REST API types                                   */
/* ------------------------------------------------------------------ */

/** Mirror Node account balance response. */
export interface HederaAccountBalance {
  balance: number;
  timestamp: string;
  tokens?: Array<{ token_id: string; balance: number }>;
  nfts?: Array<{ account_id: string; serial_number: number; token_id: string }>;
}

/** Mirror Node account info response. */
export interface HederaAccountInfo {
  account: string;
  balance: { balance: number; timestamp: string; tokens?: Array<{ token_id: string; balance: number }> };
  key: { _type: string; key: string };
  max_automatic_token_associations: number;
  memo: string;
  receiver_sig_required: boolean;
  alias: string | null;
  ethereum_nonce: number;
  evm_address: string | null;
  created_timestamp: string;
  deleted: boolean;
  expiry_timestamp: string;
}

/** Mirror Node transaction record. */
export interface HederaTransactionRecord {
  bytes: string;
  charged_tx_fee: number;
  consensus_timestamp: string;
  entity_id: string;
  max_fee: string;
  memo_base64: string;
  name: string;
  node: string;
  nonce: number;
  parent_consensus_timestamp: string | null;
  result: string;
  scheduled: boolean;
  staking_reward_transfers: Array<{ account_id: string; amount: number }>;
  transaction_hash: string;
  transaction_id: string;
  transfers: Array<{ account: string; amount: number }>;
  valid_duration_seconds: string;
  valid_start_timestamp: string;
}

/** Mirror Node token info. */
export interface HederaTokenInfo {
  token_id: string;
  name: string;
  symbol: string;
  type: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE';
  decimals: number;
  total_supply: number | string;
  max_supply: number | string;
  admin_key: { _type: string; key: string } | null;
  created_timestamp: string;
  deleted: boolean;
  memo: string;
  treasury_account_id: string;
  custom_fees: {
    created_timestamp: string;
    fixed_fees?: Array<{ amount: number; collector_account_id: string; denominating_token_id: string }>;
    fractional_fees?: Array<{ amount: unknown; collector_account_id: string }>;
    royalty_fees?: Array<{ amount: unknown; collector_account_id: string }>;
  };
}

/** Mirror Node token balance. */
export interface HederaTokenBalance {
  token_id: string;
  balance: number;
  decimals: number;
}

/** Mirror Node NFT info. */
export interface HederaNftInfo {
  account_id: string;
  created_timestamp: string;
  deleted: boolean;
  metadata: string;
  serial_number: number;
  token_id: string;
  spender: string | null;
}

/* ------------------------------------------------------------------ */
/*  Hedera wallet provider interfaces                                   */
/* ------------------------------------------------------------------ */

/** HashPack wallet provider (window.hashpack). */
export interface HashPackProvider {
  /** Wallet name. */
  name: string;
  /** Wallet icon. */
  icon: string;

  /** Get accounts. */
  getAccountNum(): Promise<string | null>;

  /** Connect the wallet. */
  requestConnect(): Promise<{ accountId: string; publicKey: string } | null>;

  /** Sign a message. */
  signMessage(message: string, signerAccountId: string): Promise<{
    signature: string;
    publicKey: string;
    accountId: string;
    signedMessage: string;
  }>;

  /** Send a transaction. */
  signTransaction(signedTx: Uint8Array): Promise<Uint8Array>;

  /** Execute a transaction. */
  submitTransaction(tx: Uint8Array): Promise<string>;

  /** Disconnect. */
  disconnect(): Promise<void>;

  /** EIP-1193 style request (EVM mode). */
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;

  /** Event listeners. */
  on?(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
}

/** Blade wallet provider. */
export interface BladeProvider {
  name: string;
  icon: string;
  getAccountNum(): Promise<string | null>;
  requestConnect(): Promise<{ accountId: string; publicKey: string } | null>;
  signMessage(message: string, signerAccountId: string): Promise<{
    signature: string;
    publicKey: string;
    accountId: string;
  }>;
  signTransaction(signedTx: Uint8Array): Promise<Uint8Array>;
  disconnect(): Promise<void>;
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
}

/** Kaiban wallet provider. */
export interface KaibanProvider {
  name: string;
  icon: string;
  getAccountNum(): Promise<string | null>;
  requestConnect(): Promise<{ accountId: string; publicKey: string } | null>;
  signMessage(message: string, signerAccountId: string): Promise<{
    signature: string;
    publicKey: string;
    accountId: string;
  }>;
  signTransaction(signedTx: Uint8Array): Promise<Uint8Array>;
  disconnect(): Promise<void>;
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/** Combined wallet provider type. */
export type HederaWalletProvider = HashPackProvider | BladeProvider | KaibanProvider;

/** Window type with Hedera wallets. */
interface HederaWindow extends Omit<Window, 'ethereum'> {
  hashpack?: HashPackProvider;
  blade?: BladeProvider;
  kaiban?: KaibanProvider;
  ethereum?: Record<string, unknown> & {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  };
}

/* ------------------------------------------------------------------ */
/*  Wallet metadata                                                     */
/* ------------------------------------------------------------------ */

export interface HederaWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  downloadUrl: string;
}

/** Well-known Hedera wallets. */
export const HEDERA_WALLETS: HederaWalletInfo[] = [
  {
    id: 'hashpack',
    name: 'HashPack',
    rdns: 'com.hashpack.wallet',
    icon: 'https://hashpack.app/icon.png',
    downloadUrl: 'https://www.hashpack.app',
  },
  {
    id: 'blade',
    name: 'Blade',
    rdns: 'app.blade.wallet',
    icon: 'https://blade.io/icon.png',
    downloadUrl: 'https://blade.io',
  },
  {
    id: 'kaiban',
    name: 'Kaiban',
    rdns: 'com.kaiban.wallet',
    icon: 'https://kaiban.io/icon.png',
    downloadUrl: 'https://kaiban.io',
  },
];

/** Hedera chain presets. */
export const HEDERA_CHAINS: Chain[] = [
  {
    id: 'hedera:mainnet',
    name: 'Hedera Mainnet',
    rpcUrl: 'https://mainnet.mirrornode.hedera.com/api/v1',
    nativeCurrency: { name: 'Hbar', symbol: 'HBAR', decimals: 8 },
    explorerUrl: 'https://hashscan.io/mainnet',
    iconUrl: 'https://hedera.com/favicon.ico',
  },
  {
    id: 'hedera:testnet',
    name: 'Hedera Testnet',
    rpcUrl: 'https://testnet.mirrornode.hedera.com/api/v1',
    nativeCurrency: { name: 'Hbar', symbol: 'HBAR', decimals: 8 },
    explorerUrl: 'https://hashscan.io/testnet',
    iconUrl: 'https://hedera.com/favicon.ico',
  },
  {
    id: 'hedera:previewnet',
    name: 'Hedera Previewnet',
    rpcUrl: 'https://previewnet.mirrornode.hedera.com/api/v1',
    nativeCurrency: { name: 'Hbar', symbol: 'HBAR', decimals: 8 },
    explorerUrl: 'https://hashscan.io/previewnet',
    iconUrl: 'https://hedera.com/favicon.ico',
  },
];

/* ------------------------------------------------------------------ */
/*  Mirror Node REST API client                                         */
/* ------------------------------------------------------------------ */

/** Mirror Node REST API client for historical data. */
class MirrorNodeClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers?: Record<string, string>) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = headers ?? {};
  }

  /** Generic GET request. */
  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const resp = await fetch(url, { headers: this.headers });
    if (!resp.ok) {
      throw new Error(`Mirror Node HTTP ${resp.status}: ${resp.statusText}`);
    }
    return resp.json() as Promise<T>;
  }

  /** GET with query params. */
  private async getWithQuery<T>(path: string, params: Record<string, string>): Promise<T> {
    const search = new URLSearchParams(params).toString();
    return this.get<T>(`${path}?${search}`);
  }

  /** Get account balance by ID or EVM address. */
  async getAccountBalance(identifier: string): Promise<HederaAccountBalance> {
    return this.get<HederaAccountBalance>(`/accounts/${identifier}`);
  }

  /** Get full account info. */
  async getAccountInfo(identifier: string): Promise<HederaAccountInfo> {
    return this.get<HederaAccountInfo>(`/accounts/${identifier}`);
  }

  /** Get account token balances. */
  async getAccountTokens(identifier: string): Promise<{ tokens: HederaTokenBalance[] }> {
    return this.get<{ tokens: HederaTokenBalance[] }>(`/accounts/${identifier}/tokens`);
  }

  /** Get account NFTs. */
  async getAccountNfts(identifier: string): Promise<{ nfts: HederaNftInfo[] }> {
    return this.get<{ nfts: HederaNftInfo[] }>(`/accounts/${identifier}/nfts`);
  }

  /** Get transactions for an account. */
  async getAccountTransactions(
    identifier: string,
    limit: number = 10,
    timestamp?: string,
  ): Promise<{ transactions: HederaTransactionRecord[] }> {
    const params: Record<string, string> = { limit: String(limit), order: 'desc' };
    if (timestamp) params.timestamp = `lt:${timestamp}`;
    return this.getWithQuery(`/transactions`, { ...params, 'account.id': identifier });
  }

  /** Get a transaction by transaction ID. */
  async getTransaction(transactionId: string): Promise<{ transactions: HederaTransactionRecord[] }> {
    return this.get(`/transactions/${transactionId}`);
  }

  /** Get token info by token ID. */
  async getTokenInfo(tokenId: string): Promise<HederaTokenInfo> {
    return this.get<HederaTokenInfo>(`/tokens/${tokenId}`);
  }

  /** Get token balances for a specific holder. */
  async getTokenBalances(tokenId: string, accountId: string): Promise<{
    balances: Array<{ account: string; balance: number }>;
  }> {
    return this.getWithQuery(`/tokens/${tokenId}/balances`, { 'account.id': accountId });
  }

  /** Get NFT info. */
  async getNftInfo(tokenId: string, serial: number): Promise<HederaNftInfo> {
    return this.get<HederaNftInfo>(`/tokens/${tokenId}/nfts/${serial}`);
  }

  /** Get network exchange rate. */
  async getExchangeRate(): Promise<{ current_rate: { hbar_equivalent: number; cent_equivalent: number } }> {
    return this.get('/network/exchangerate');
  }

  /** Get network supply. */
  async getNetworkSupply(): Promise<{ released_supply: string; timestamp: string }> {
    return this.get('/network/supply');
  }

  /** Search by EVM address (finds Hedera account). */
  async searchByEvmAddress(evmAddress: string): Promise<HederaAccountInfo> {
    return this.get<HederaAccountInfo>(`/accounts/${evmAddress}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Hedera transaction helpers                                          */
/* ------------------------------------------------------------------ */

/** Hedera transaction type identifiers. */
export const HederaTxType = {
  /** Crypto transfer (HBAR). */
  CRYPTO_TRANSFER: 'CRYPTOTRANSFER',
  /** Token mint. */
  TOKEN_MINT: 'TOKENMINT',
  /** Token burn. */
  TOKEN_BURN: 'TOKENBURN',
  /** Token creation. */
  TOKEN_CREATION: 'TOKENCREATION',
  /** Contract call. */
  CONTRACT_CALL: 'CONTRACTCALL',
  /** Contract creation. */
  CONTRACT_CREATE: 'CONTRACTCREATE',
  /** Message submit (Consensus Service). */
  CONSENSUS_SUBMIT: 'CONSENSUSSUBMITMESSAGE',
  /** File update. */
  FILE_UPDATE: 'FILEUPDATE',
} as const;

export type HederaTxType = (typeof HederaTxType)[keyof typeof HederaTxType];

/** Hedera transaction request. */
export interface HederaTransactionRequest {
  /** Sender account ID (0.0.X). */
  from?: string;
  /** Recipient account ID or EVM address. */
  to: string;
  /** Amount in tinybar (for HBAR transfers). */
  amount?: string;
  /** Token transfers (for HTS tokens). */
  tokenTransfers?: Array<{ token_id: string; amount: number }>;
  /** NFT transfers. */
  nftTransfers?: Array<{ token_id: string; serial_number: number; sender: string; recipient: string }>;
  /** Data payload (for contract calls). */
  data?: string;
  /** Max transaction fee in tinybar. */
  maxFee?: string;
  /** Memo. */
  memo?: string;
  /** Valid duration in seconds. */
  validDurationSeconds?: number;
}

/** Hedera signed transaction result. */
export interface HederaSignedTransaction {
  /** Serialized transaction bytes (base64). */
  bytes: string;
  /** Transaction hash. */
  hash: string;
}

/* ------------------------------------------------------------------ */
/*  Hedera smart contract helpers                                       */
/* ------------------------------------------------------------------ */

/** Encode a Solidity function call (minimal ABI encoder). */
export function encodeFunctionCall(functionSignature: string, params: unknown[] = []): string {
  // Simple function selector: first 4 bytes of keccak256 (simulated with a hash approach)
  // For production, use a proper ABI encoder like @hashgraph/cryptography or ethers abi
  const sigHash = simpleKeccak256(functionSignature).slice(0, 8);
  const encoded = params.map((p) => encodeSolidityParam(p)).join('');
  return '0x' + sigHash + encoded;
}

/** Minimal keccak256 simulation for function signature hashing. */
function simpleKeccak256(input: string): string {
  // In production, use a real keccak256 implementation
  // This is a placeholder that produces a deterministic hash
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  // Convert to hex, padded to 8 chars (4 bytes for function selector)
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/** Encode a single Solidity parameter. */
function encodeSolidityParam(param: unknown): string {
  if (typeof param === 'string' && param.startsWith('0x')) {
    // Address or bytes
    return param.slice(2).padStart(64, '0');
  }
  if (typeof param === 'string') {
    // Try parsing as number first
    const num = BigInt(param);
    return num.toString(16).padStart(64, '0');
  }
  if (typeof param === 'number') {
    return param.toString(16).padStart(64, '0');
  }
  if (typeof param === 'bigint') {
    return param.toString(16).padStart(64, '0');
  }
  if (typeof param === 'boolean') {
    return param ? '1'.padStart(64, '0') : '0'.padStart(64, '0');
  }
  return '0'.padStart(64, '0');
}

/** ABI-encode a contract call result (uint256). */
export function decodeUint256(hex: string): bigint {
  const cleaned = hex.replace(/^0x/, '');
  return BigInt('0x' + cleaned.slice(-64));
}

/** ABI-encode a contract call result (address). */
export function decodeAddress(hex: string): string {
  const cleaned = hex.replace(/^0x/, '');
  return '0x' + cleaned.slice(-40);
}

/** ABI-encode a contract call result (string). */
export function decodeString(hex: string): string {
  const cleaned = hex.replace(/^0x/, '');
  // Simplified: last bytes decoded as UTF-8
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
  }
  // Remove null bytes and try to decode
  const nonNull = bytes.filter((b) => b !== 0);
  try {
    return new TextDecoder().decode(new Uint8Array(nonNull));
  } catch {
    return hex;
  }
}

/* ------------------------------------------------------------------ */
/*  Hedera Chain Adapter                                                */
/* ------------------------------------------------------------------ */

/**
 * Hedera chain adapter implementing chain-specific operations.
 *
 * Supports both native Hedera (HAPI) and EVM compatibility mode (HIP-26).
 * Integrates with HashPack, Blade, and Kaiban wallets.
 * Uses Mirror Node REST API for historical queries.
 */
export class HederaChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'hedera-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'Hedera Chain Adapter';

  private provider: HederaWalletProvider | null = null;
  private chains: Chain[] = [...HEDERA_CHAINS];
  private currentChain: Chain = HEDERA_CHAINS[0];
  private mirrorNodeUrl: string = HEDERA_CHAINS[0].rpcUrl;
  private _accounts: string[] = [];
  private _mirrorNode: MirrorNodeClient | null = null;
  private _connector: Connector | null = null;
  private _evmMode: boolean = false;

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. */
  setConnector(connector: Connector): void {
    this._connector = connector;
  }

  /** Register supported Hedera chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains.length > 0 ? chains : [...HEDERA_CHAINS];
    this.currentChain = this.chains[0];
    this.mirrorNodeUrl = this.currentChain.rpcUrl;
    this._mirrorNode = null;
  }

  /** Find a chain by numeric ID (returns first chain for compatibility). */
  findChain(_chainId: number): Chain | undefined {
    return this.chains.find((c) => {
      // Try matching by numeric suffix of chain ID
      const parts = c.id.split(':');
      const numPart = parts[parts.length - 1];
      if (numPart === String(_chainId)) return true;
      return false;
    });
  }

  /** Set the active wallet provider. */
  setProvider(provider: HederaWalletProvider): void {
    this.provider = provider;
  }

  /** Get the current provider. */
  getProvider(): HederaWalletProvider | null {
    return this.provider;
  }

  /** Get the Mirror Node client (lazy-init). */
  private _getMirrorNode(): MirrorNodeClient {
    if (!this._mirrorNode) {
      this._mirrorNode = new MirrorNodeClient(this.mirrorNodeUrl);
    }
    return this._mirrorNode;
  }

  /** Whether EVM compatibility mode is active. */
  getEvmMode(): boolean {
    return this._evmMode;
  }

  /** Enable or disable EVM compatibility mode (HIP-26). */
  setEvmMode(enabled: boolean): void {
    this._evmMode = enabled;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a Hedera wallet.
   * Tries HashPack → Blade → Kaiban in order.
   * @param walletId - Optional wallet ID to prefer.
   * @returns Array of connected addresses.
   */
  async connect(walletId?: string): Promise<string[]> {
    const target = this._resolveWallet(walletId);
    if (!target) {
      throw new Error(
        'No Hedera wallet found. Install HashPack, Blade, or Kaiban.',
      );
    }

    this.provider = target;

    try {
      const result = await target.requestConnect();
      if (result?.accountId) {
        this._accounts = [result.accountId];
      } else {
        // Try getAccountNum as fallback
        const acc = await target.getAccountNum();
        if (acc) {
          this._accounts = [acc];
        } else {
          throw new Error('Failed to get account from wallet');
        }
      }
    } catch {
      const acc = await target.getAccountNum();
      if (acc) {
        this._accounts = [acc];
      } else {
        throw new Error('Failed to connect to Hedera wallet');
      }
    }

    return this._accounts;
  }

  /** Disconnect from the wallet. */
  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch {
        // Some wallets may not implement disconnect
      }
    }
    this.provider = null;
    this._accounts = [];
  }

  /** Get the connected address (account ID). */
  getAddress(): string | null {
    return this._accounts[0] ?? null;
  }

  /** Get connected account addresses. Required by ChainAdapter interface. */
  async getAccounts(): Promise<string[]> {
    if (!this.provider) throw new Error('Not connected');
    return [...this._accounts];
  }

  /* ---- Chain ID ---- */

  /**
   * Get the current chain ID string.
   * @returns Chain ID string (e.g., 'hedera:mainnet').
   */
  async getChainId(): Promise<string> {
    return this.currentChain.id;
  }

  /** Get numeric chain ID for Hedera (295 for mainnet, 296 for testnet, 297 for previewnet). */
  getChainIdNumeric(): number {
    switch (this.currentChain.id) {
      case 'hedera:mainnet':
        return 295;
      case 'hedera:testnet':
        return 296;
      case 'hedera:previewnet':
        return 297;
      default:
        return 295;
    }
  }

  /* ---- Balance ---- */

  /**
   * Get HBAR balance for an account.
   * @param address - Hedera account ID (0.0.X) or EVM address (0x...).
   * @returns Balance in tinybar (smallest unit, as string).
   */
  async getBalance(address: string): Promise<string> {
    const normalized = normalizeHederaAddress(address);
    try {
      const info = await this._getMirrorNode().getAccountInfo(normalized);
      return String(info.balance.balance);
    } catch {
      // Fallback: try balance endpoint
      try {
        const bal = await this._getMirrorNode().getAccountBalance(normalized);
        return String(bal.balance);
      } catch {
        return '0';
      }
    }
  }

  /**
   * Get formatted HBAR balance (decimal string).
   * @param address - Hedera account ID or EVM address.
   * @returns Balance in HBAR (e.g., "12.34567890").
   */
  async getBalanceFormatted(address: string): Promise<string> {
    const raw = await this.getBalance(address);
    return formatHbar(raw);
  }

  /**
   * Get all token balances for an account.
   * @param address - Hedera account ID or EVM address.
   * @returns Array of token balances.
   */
  async getAllBalances(address: string): Promise<HederaTokenBalance[]> {
    const normalized = normalizeHederaAddress(address);
    try {
      const result = await this._getMirrorNode().getAccountTokens(normalized);
      return result.tokens;
    } catch {
      return [];
    }
  }

  /* ---- Token Operations ---- */

  /**
   * Get HTS token info.
   * @param tokenId - Token ID (0.0.X).
   * @returns Token metadata.
   */
  async getTokenInfo(tokenId: string): Promise<HederaTokenInfo | null> {
    if (!isValidHederaTokenId(tokenId)) {
      throw new Error(`Invalid Hedera token ID: ${tokenId}`);
    }
    try {
      return await this._getMirrorNode().getTokenInfo(tokenId);
    } catch {
      return null;
    }
  }

  /**
   * Get HTS token balance for an account.
   * @param tokenId - Token ID (0.0.X).
   * @param accountId - Account ID.
   * @returns Token balance amount.
   */
  async getTokenBalance(tokenId: string, accountId: string): Promise<string> {
    const normalized = normalizeHederaAddress(accountId);
    try {
      const tokens = await this._getMirrorNode().getAccountTokens(normalized);
      const match = tokens.tokens.find((t) => t.token_id === tokenId);
      return match ? String(match.balance) : '0';
    } catch {
      return '0';
    }
  }

  /**
   * Get NFT holdings for an account.
   * @param address - Hedera account ID.
   * @returns Array of NFT info.
   */
  async getNfts(address: string): Promise<HederaNftInfo[]> {
    const normalized = normalizeHederaAddress(address);
    try {
      const result = await this._getMirrorNode().getAccountNfts(normalized);
      return result.nfts;
    } catch {
      return [];
    }
  }

  /**
   * Get NFT info by token ID and serial number.
   * @param tokenId - Token ID.
   * @param serial - Serial number.
   * @returns NFT info or null.
   */
  async getNftInfo(tokenId: string, serial: number): Promise<HederaNftInfo | null> {
    try {
      return await this._getMirrorNode().getNftInfo(tokenId, serial);
    } catch {
      return null;
    }
  }

  /* ---- Transactions ---- */

  /**
   * Send a transaction.
   * @param tx - HederaTransactionRequest or serialized bytes (base64).
   * @returns Transaction ID.
   */
  async sendTransaction(tx: string | HederaTransactionRequest | Uint8Array): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    // If it's a string (base64 serialized tx bytes)
    if (typeof tx === 'string') {
      return this._submitRawTransaction(tx);
    }

    // If it's Uint8Array
    if (tx instanceof Uint8Array) {
      const bytes = Array.from(tx);
      const base64 = btoa(String.fromCharCode(...bytes));
      return this._submitRawTransaction(base64);
    }

    // HederaTransactionRequest
    return this._sendHederaTransaction(tx);
  }

  /** Submit a raw (already-signed) transaction. */
  private async _submitRawTransaction(base64Bytes: string): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const txBytes = new Uint8Array(
      atob(base64Bytes)
        .split('')
        .map((c) => c.charCodeAt(0)),
    );

    // Sign if the provider supports it
    let signedBytes: Uint8Array;
    if (this.provider.signTransaction) {
      signedBytes = await this.provider.signTransaction(txBytes);
    } else {
      signedBytes = txBytes;
    }

    // Submit
    if ((this.provider as HashPackProvider).submitTransaction) {
      return (this.provider as HashPackProvider).submitTransaction(signedBytes);
    }

    throw new Error('Connected wallet does not support transaction submission');
  }

  /** Build and send a Hedera transaction through the wallet. */
  private async _sendHederaTransaction(tx: HederaTransactionRequest): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    // If EVM mode is enabled and provider supports EIP-1193
    if (this._evmMode && this.provider.request) {
      const evmTo = tx.to.startsWith('0x') ? tx.to : accountIdToEvmAddress(tx.to);
      return this.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.getAddress(),
          to: evmTo,
          value: tx.amount ? '0x' + BigInt(tx.amount).toString(16) : '0x0',
          data: tx.data ?? '0x',
        }],
      }) as Promise<string>;
    }

    // Native mode: @hashgraph/sdk is required to build transactions
    // Here we rely on the wallet to construct and sign, or direct to raw tx submission
    throw new Error(
      'Native Hedera transactions require @hashgraph/sdk for building. ' +
      'Use sendTransaction with pre-built transaction bytes, or enable EVM mode.',
    );
  }

  /**
   * Transfer HBAR.
   * @param to - Recipient account ID or EVM address.
   * @param amountTinybar - Amount in tinybar.
   * @returns Transaction ID.
   */
  async transferHbar(
    to: string,
    amountTinybar: string | bigint | number,
  ): Promise<string> {
    return this.sendTransaction({
      to,
      amount: String(BigInt(amountTinybar)),
    });
  }

  /**
   * Transfer HTS fungible tokens.
   * @param to - Recipient account ID.
   * @param tokenId - Token ID (0.0.X).
   * @param amount - Token amount (in smallest unit based on token decimals).
   * @returns Transaction ID.
   */
  async transferToken(
    to: string,
    tokenId: string,
    amount: number,
  ): Promise<string> {
    return this.sendTransaction({
      to,
      tokenTransfers: [{ token_id: tokenId, amount }],
    });
  }

  /**
   * Transfer an NFT.
   * @param to - Recipient account ID.
   * @param tokenId - Token ID.
   * @param serial - Serial number.
   * @returns Transaction ID.
   */
  async transferNft(
    to: string,
    tokenId: string,
    serial: number,
  ): Promise<string> {
    const sender = this.getAddress();
    if (!sender) throw new Error('No connected account');

    return this.sendTransaction({
      to,
      nftTransfers: [{ token_id: tokenId, serial_number: serial, sender, recipient: to }],
    });
  }

  /* ---- Smart Contract Interaction ---- */

  /**
   * Call a smart contract (read-only).
   * @param contractId - Contract ID (0.0.X) or EVM address.
   * @param data - Encoded function call data.
   * @returns Result (hex string).
   */
  async callContract(contractId: string, data: string): Promise<string> {
    if (this._evmMode && this.provider?.request) {
      const evmAddress = contractId.startsWith('0x')
        ? contractId
        : accountIdToEvmAddress(contractId);

      return this.provider.request({
        method: 'eth_call',
        params: [{ to: evmAddress, data }, 'latest'],
      }) as Promise<string>;
    }

    throw new Error(
      'Contract calls require EVM mode. Enable with setEvmMode(true).',
    );
  }

  /**
   * Execute a contract function (state-changing).
   * @param contractId - Contract ID or EVM address.
   * @param data - Encoded function call data.
   * @param value - HBAR value to send in tinybar.
   * @returns Transaction ID.
   */
  async executeContract(
    contractId: string,
    data: string,
    value?: string,
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    if (this._evmMode && this.provider.request) {
      const evmAddress = contractId.startsWith('0x')
        ? contractId
        : accountIdToEvmAddress(contractId);

      return this.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.getAddress(),
          to: evmAddress,
          data,
          value: value ? '0x' + BigInt(value).toString(16) : '0x0',
        }],
      }) as Promise<string>;
    }

    throw new Error(
      'Contract execution requires EVM mode. Enable with setEvmMode(true).',
    );
  }

  /**
   * Deploy a Solidity contract (EVM mode).
   * @param bytecode - Contract bytecode.
   * @param value - HBAR value in tinybar.
   * @returns Contract address.
   */
  async deployContract(bytecode: string, value?: string): Promise<string> {
    if (!this.provider?.request) {
      throw new Error('Contract deployment requires EVM mode with EIP-1193 provider');
    }

    return this.provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: this.getAddress(),
        data: bytecode,
        value: value ? '0x' + BigInt(value).toString(16) : '0x0',
      }],
    }) as Promise<string>;
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a message.
   * @param message - Message to sign (string or Uint8Array).
   * @returns Signature (hex or base64).
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
    const account = this.getAddress();
    if (!account) throw new Error('No connected account');

    try {
      const result = await this.provider.signMessage(msgStr, account);
      return result.signature;
    } catch {
      // Fallback: try EIP-1193 personal_sign
      if (this.provider.request) {
        return this.provider.request({
          method: 'personal_sign',
          params: [msgStr, account],
        }) as Promise<string>;
      }
      throw new Error('Connected wallet does not support message signing');
    }
  }

  /**
   * Sign a transaction (returns signature without broadcasting).
   * @param tx - Transaction bytes (base64 string) or Uint8Array.
   * @returns Signed transaction bytes (base64).
   */
  async signTransaction(tx: string | Uint8Array): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');
    if (!this.provider.signTransaction) {
      throw new Error('Connected wallet does not support transaction signing');
    }

    let txBytes: Uint8Array;
    if (typeof tx === 'string') {
      txBytes = new Uint8Array(
        atob(tx).split('').map((c) => c.charCodeAt(0)),
      );
    } else {
      txBytes = tx;
    }

    const signed = await this.provider.signTransaction(txBytes);
    return btoa(String.fromCharCode(...signed));
  }

  /* ---- Mirror Node Queries ---- */

  /**
   * Get account transaction history.
   * @param address - Hedera account ID.
   * @param limit - Number of transactions.
   * @returns Transaction records.
   */
  async getTransactions(address: string, limit: number = 10): Promise<HederaTransactionRecord[]> {
    const normalized = normalizeHederaAddress(address);
    try {
      const result = await this._getMirrorNode().getAccountTransactions(normalized, limit);
      return result.transactions;
    } catch {
      return [];
    }
  }

  /**
   * Get transaction details by transaction ID.
   * @param transactionId - Transaction ID (e.g., "0.0.1234-1234567890-000000000").
   * @returns Transaction record or null.
   */
  async getTransaction(transactionId: string): Promise<HederaTransactionRecord | null> {
    try {
      const result = await this._getMirrorNode().getTransaction(transactionId);
      return result.transactions[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get network exchange rate (HBAR to USD).
   * @returns Exchange rate info.
   */
  async getExchangeRate(): Promise<{ hbarUsd: number } | null> {
    try {
      const rate = await this._getMirrorNode().getExchangeRate();
      const hbarUsd = rate.current_rate.cent_equivalent / rate.current_rate.hbar_equivalent / 100;
      return { hbarUsd };
    } catch {
      return null;
    }
  }

  /* ---- Chain Switch ---- */

  /**
   * Switch the active chain.
   * @param chainId - Numeric chain ID.
   */
  async switchChain(chainId: number): Promise<void> {
    const chain = this.chains.find((c) => {
      const numeric = this._chainToNumeric(c.id);
      return numeric === chainId;
    });
    if (chain) {
      this.currentChain = chain;
      this.mirrorNodeUrl = chain.rpcUrl;
      this._mirrorNode = null;
    } else {
      throw new Error(`Chain not found: ${chainId}`);
    }
  }

  /** Switch chain by string ID. */
  async switchChainById(chainId: string): Promise<void> {
    const chain = this.chains.find((c) => c.id === chainId);
    if (!chain) throw new Error(`Chain not found: ${chainId}`);
    this.currentChain = chain;
    this.mirrorNodeUrl = chain.rpcUrl;
    this._mirrorNode = null;
  }

  /* ---- EIP-1193 Compatible Request ---- */

  /**
   * EIP-1193 compatible request method for Hedera.
   */
  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    switch (args.method) {
      case 'hedera_getBalance': {
        const address = (args.params?.[0] ?? '') as string;
        return this.getBalance(address);
      }
      case 'hedera_sendTransaction': {
        const tx = args.params?.[0] as string;
        return this.sendTransaction(tx);
      }
      case 'hedera_signMessage': {
        const msg = args.params?.[0] as string;
        return this.signMessage(msg);
      }
      case 'hedera_getChainId': {
        return this.getChainId();
      }
      case 'hedera_getAccountInfo': {
        const id = (args.params?.[0] ?? '') as string;
        try {
          return await this._getMirrorNode().getAccountInfo(id);
        } catch {
          return null;
        }
      }
      case 'hedera_getTokenInfo': {
        const tokenId = (args.params?.[0] ?? '') as string;
        return this.getTokenInfo(tokenId);
      }
      case 'eth_call': {
        return this.provider?.request?.(args);
      }
      case 'eth_sendTransaction': {
        return this.provider?.request?.(args);
      }
      default:
        throw new Error(`Unsupported Hedera method: ${args.method}`);
    }
  }

  /* ---- Utility ---- */

  /** Find a chain by its string ID. */
  findChainById(chainId: string): Chain | undefined {
    return this.chains.find((c) => c.id === chainId);
  }

  /** Get the Mirror Node URL. */
  getMirrorNodeUrl(): string {
    return this.mirrorNodeUrl;
  }

  /** Set the Mirror Node URL. */
  setMirrorNodeUrl(url: string): void {
    this.mirrorNodeUrl = url;
    this._mirrorNode = null;
  }

  /** Convert a chain string ID to numeric. */
  private _chainToNumeric(chainId: string): number {
    switch (chainId) {
      case 'hedera:mainnet': return 295;
      case 'hedera:testnet': return 296;
      case 'hedera:previewnet': return 297;
      default: return 0;
    }
  }

  /* ---- Private: Wallet resolution ---- */

  private _resolveWallet(walletId?: string): HederaWalletProvider | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as HederaWindow;

    if (walletId) {
      switch (walletId) {
        case 'hashpack':
          return win.hashpack ?? null;
        case 'blade':
          return win.blade ?? null;
        case 'kaiban':
          return win.kaiban ?? null;
        default:
          return win.hashpack ?? win.blade ?? win.kaiban ?? null;
      }
    }

    // Auto-detect: HashPack → Blade → Kaiban
    if (win.hashpack) return win.hashpack;
    if (win.blade) return win.blade;
    if (win.kaiban) return win.kaiban;

    return null;
  }
}
