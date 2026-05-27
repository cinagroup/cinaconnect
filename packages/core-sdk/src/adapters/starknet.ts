/**
 * Starknet Chain Adapter — provides Starknet-specific operations.
 *
 * Uses Starknet JSON-RPC v0.7 for on-chain queries and the Starknet wallet
 * standard (window.starknet) for signing and transaction submission.
 * Supports Argent X, Braavos, OKX Wallet, and other SNIP-compliant wallets.
 *
 * Features:
 * - Native STRK / ETH balance queries
 * - Cairo contract interaction (entrypoints, calldata encoding)
 * - ERC-20 on Starknet (STRK, bridged tokens)
 * - Account abstraction (native AA model)
 * - SNIP-12 signing standard
 * - Multi-sig account support
 */

import type { Connector } from '../connector.js';
import type { Chain } from '../types.js';

/* ------------------------------------------------------------------ */
/*  Felt252 / Cairo calldata encoding                                  */
/* ------------------------------------------------------------------ */

/** Maximum value for a felt252 (prime field element). */
export const Felt252_MAX = (1n << 251n) + 17n * (1n << 192n) + 1n;

/**
 * Validate whether a string is a valid felt252 hex.
 */
export function isValidFelt(value: string): boolean {
  if (typeof value !== 'string') return false;
  const hex = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return false;
  if (hex.length > 64) return false; // 252 bits ≈ 63 hex chars
  try {
    const n = BigInt(value);
    return n >= 0n && n < Felt252_MAX;
  } catch {
    return false;
  }
}

/**
 * Pad a felt252 hex string to 64 characters (32 bytes).
 */
export function padHex(value: string): string {
  const hex = value.startsWith('0x') ? value.slice(2) : value;
  return '0x' + hex.padStart(64, '0').toLowerCase();
}

/**
 * Normalize a Starknet address to full 64-char hex with 0x prefix.
 */
export function normalizeStarknetAddress(address: string): string {
  if (typeof address !== 'string') throw new Error('Address must be a string');
  return padHex(address);
}

/**
 * Validate a Starknet address (0x-prefixed hex, up to 64 chars).
 */
export function isValidStarknetAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  const hex = address.slice(2);
  if (hex.length === 0 || hex.length > 64) return false;
  return /^[0-9a-fA-F]+$/.test(hex);
}

/* ------------------------------------------------------------------ */
/*  Cairo calldata encoding                                            */
/* ------------------------------------------------------------------ */

/** A single Cairo calldata element (felt252). */
export type CairoCalldataItem = string | number | bigint;

/** Encode a single value to a felt252 hex string. */
export function encodeFelt252(value: CairoCalldataItem): string {
  if (typeof value === 'string') {
    // Already hex?
    if (value.startsWith('0x') || /^[0-9a-fA-F]+$/.test(value)) {
      const hex = value.startsWith('0x') ? value : '0x' + value;
      if (!isValidFelt(hex)) throw new Error(`Invalid felt252: ${hex}`);
      return padHex(hex);
    }
    // Decimal string
    const n = BigInt(value);
    if (n < 0n || n >= Felt252_MAX) throw new Error(`Value out of felt252 range: ${n}`);
    return padHex('0x' + n.toString(16));
  }
  if (typeof value === 'bigint') {
    if (value < 0n || value >= Felt252_MAX) throw new Error(`Value out of felt252 range: ${value}`);
    return padHex('0x' + value.toString(16));
  }
  // number
  if (value < 0 || value >= Number(Felt252_MAX)) throw new Error(`Value out of felt252 range: ${value}`);
  return padHex('0x' + BigInt(value).toString(16));
}

/**
 * Encode an array of Cairo calldata items.
 */
export function encodeCalldata(items: CairoCalldataItem[]): string[] {
  return items.map(encodeFelt252);
}

/**
 * Encode a Cairo struct as flat felt252 array.
 * The struct is represented as an object with string/number/bigint values.
 */
export function encodeStruct(obj: Record<string, CairoCalldataItem>): string[] {
  return Object.values(obj).map(encodeFelt252);
}

/**
 * Encode a Cairo array with length prefix.
 * Starknet convention: [length, element0, element1, ...]
 */
export function encodeCairoArray(items: CairoCalldataItem[]): string[] {
  return [encodeFelt252(items.length), ...encodeCalldata(items)];
}

/**
 * Encode bytes into a Cairo byte array (bytes31 chunks + pending bytes + bumps).
 * Used for SNIP-12 message encoding and Cairo ByteArray types.
 */
export function encodeByteArray(data: Uint8Array): string[] {
  const chunks: string[] = [];

  // Pack 31 bytes per chunk (bytes31)
  const numFullChunks = Math.floor(data.length / 31);
  for (let i = 0; i < numFullChunks; i++) {
    const slice = data.slice(i * 31, (i + 1) * 31);
    let num = 0n;
    for (let j = 0; j < slice.length; j++) {
      num = (num << 8n) | BigInt(slice[j]);
    }
    chunks.push(padHex('0x' + num.toString(16)));
  }

  // Remaining bytes
  const remaining = data.slice(numFullChunks * 31);
  let pendingNum = 0n;
  for (let j = 0; j < remaining.length; j++) {
    pendingNum = (pendingNum << 8n) | BigInt(remaining[j]);
  }

  // Cairo ByteArray format: [num_chunks, chunk0, chunk1, ..., pending_word, pending_word_size]
  return [
    encodeFelt252(numFullChunks),
    ...chunks,
    padHex('0x' + pendingNum.toString(16)),
    encodeFelt252(remaining.length),
  ];
}

/* ------------------------------------------------------------------ */
/*  SNIP-12 message hashing (simplified)                               */
/* ------------------------------------------------------------------ */

/** SNIP-12 personal message prefix. */
const SNIP12_PREFIX = 'StarkNet Message';

/**
 * Encode a message for SNIP-12 signing.
 * Returns the message as an array of felts for wallet signing.
 */
export function encodeSnip12Message(message: string): string[] {
  const bytes = new TextEncoder().encode(message);
  // Use simple encoding: prefix + length + byte chunks
  const prefixBytes = new TextEncoder().encode(SNIP12_PREFIX);
  const fullBytes = new Uint8Array(prefixBytes.length + 4 + bytes.length);
  fullBytes.set(prefixBytes, 0);
  // length as 4-byte big-endian
  fullBytes[prefixBytes.length] = (bytes.length >> 24) & 0xff;
  fullBytes[prefixBytes.length + 1] = (bytes.length >> 16) & 0xff;
  fullBytes[prefixBytes.length + 2] = (bytes.length >> 8) & 0xff;
  fullBytes[prefixBytes.length + 3] = bytes.length & 0xff;
  fullBytes.set(bytes, prefixBytes.length + 4);

  return encodeByteArray(fullBytes);
}

/* ------------------------------------------------------------------ */
/*  STRK / ETH balance formatting                                      */
/* ------------------------------------------------------------------ */

/** STRK has 18 decimal places. */
export const STRK_DECIMALS = 18;

/** ETH on Starknet has 18 decimal places. */
export const ETH_DECIMALS = 18;

/**
 * Format a Starknet token balance to human-readable decimal string.
 * @param raw - Raw balance (wei/smallest unit).
 * @param decimals - Token decimals (default: 18 for STRK/ETH).
 */
export function formatStarknetBalance(raw: string | bigint | number, decimals: number = STRK_DECIMALS): string {
  const n = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const intPart = n / divisor;
  const fracPart = n % divisor;
  const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
}

/**
 * Parse a human-readable amount to smallest unit.
 */
export function parseStarknetAmount(amount: string, decimals: number = STRK_DECIMALS): bigint {
  const parts = amount.split('.');
  const intPart = BigInt(parts[0] || '0');
  let fracPart = 0n;
  if (parts.length > 1) {
    const frac = parts[1].padEnd(decimals, '0').slice(0, decimals);
    fracPart = BigInt(frac);
  }
  return intPart * 10n ** BigInt(decimals) + fracPart;
}

/* ------------------------------------------------------------------ */
/*  Starknet wallet provider interface                                 */
/* ------------------------------------------------------------------ */

/** A Starknet account as returned by the wallet. */
export interface StarknetAccount {
  /** Account address (0x-prefixed hex). */
  address: string;
  /** Public key. */
  publicKey?: string;
  /** Account type / implementation (e.g., 'argent', 'braavos', 'oz'). */
  type?: string;
}

/** Starknet wallet provider (window.starknet style). */
export interface StarknetWalletProvider {
  /** Wallet name / ID. */
  id?: string;
  /** Wallet display name. */
  name?: string;
  /** Wallet icon URL. */
  icon?: string;
  /** Whether the wallet is currently connected. */
  isConnected: boolean;
  /** Currently connected account. */
  account?: StarknetAccount;
  /** Connected account address. */
  selectedAddress?: string;

  /** Request wallet connection / permission. */
  enable(): Promise<string[]>;

  /** Disconnect the wallet. */
  disconnect(): Promise<void>;

  /** EIP-1193 / SNIP-compliant request. */
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;

  /** Listen to events. */
  on?(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
}

/** Browser window augmented with Starknet wallet providers. */
interface StarknetWindow extends Window {
  starknet?: StarknetWalletProvider;
  argentX?: StarknetWalletProvider;
  braavos?: StarknetWalletProvider;
  okxwallet?: StarknetWalletProvider & { starknet?: StarknetWalletProvider };
}

/* ------------------------------------------------------------------ */
/*  Starknet RPC types (JSON-RPC v0.7)                                 */
/* ------------------------------------------------------------------ */

/** Starknet RPC response envelope. */
interface StarknetRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

/** Block reference for RPC calls. */
export type BlockReference = { block_number: number } | { block_hash: string } | 'latest' | 'pending';

/** ERC-20 token info on Starknet. */
export interface StarknetTokenInfo {
  /** Token contract address. */
  address: string;
  /** Token name. */
  name: string;
  /** Token symbol. */
  symbol: string;
  /** Token decimals. */
  decimals: number;
  /** Total supply (raw). */
  totalSupply: string;
}

/** Starknet transaction execution status. */
export interface StarknetTxStatus {
  /** Transaction hash. */
  transaction_hash: string;
  /** Status: RECEIVED | REJECTED | ACCEPTED_ON_L2 | ACCEPTED_ON_L1. */
  status: string;
  /** Finality status. */
  finality_status?: string;
  /** Execution status: SUCCEEDED | REVERTED. */
  execution_status?: string;
  /** Block hash (if included). */
  block_hash?: string;
  /** Block number (if included). */
  block_number?: number;
  /** Revert reason (if failed). */
  revert_reason?: string;
}

/* ------------------------------------------------------------------ */
/*  Starknet wallet registry                                           */
/* ------------------------------------------------------------------ */

/** Wallet metadata for discovery. */
export interface StarknetWalletInfo {
  /** Unique wallet identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Reverse domain name identifier. */
  rdns: string;
  /** Icon URL. */
  icon: string;
  /** Download/install URL. */
  downloadUrl: string;
}

/** Well-known Starknet wallets. */
export const STARKNET_WALLETS: StarknetWalletInfo[] = [
  {
    id: 'argent-x',
    name: 'Argent X',
    rdns: 'im.argent.contract',
    icon: 'https://icons.argent.im/argent-x/icon.png',
    downloadUrl: 'https://www.argent.xyz/argent-x/',
  },
  {
    id: 'braavos',
    name: 'Braavos',
    rdns: 'app.braavos',
    icon: 'https://braavos.app/favicon.ico',
    downloadUrl: 'https://braavos.app/',
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    rdns: 'com.okex.wallet',
    icon: 'https://www.okx.com/favicon.ico',
    downloadUrl: 'https://www.okx.com/download',
  },
];

/** Starknet chain presets. */
export const STARKNET_CHAINS: Chain[] = [
  {
    id: 'starknet:mainnet',
    name: 'Starknet Mainnet',
    rpcUrl: 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7',
    nativeCurrency: { name: 'STRK', symbol: 'STRK', decimals: 18 },
    explorerUrl: 'https://starkscan.co',
    iconUrl: 'https://starknet-favicon.svg',
  },
  {
    id: 'starknet:sepolia',
    name: 'Starknet Sepolia',
    rpcUrl: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7',
    nativeCurrency: { name: 'STRK', symbol: 'STRK', decimals: 18 },
    explorerUrl: 'https://sepolia.starkscan.co',
    iconUrl: 'https://starknet-favicon.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  Starknet JSON-RPC client                                           */
/* ------------------------------------------------------------------ */

/** Starknet RPC client for HTTP JSON-RPC v0.7 calls. */
class StarknetRpcClient {
  private rpcUrl: string;
  private idCounter: number = 0;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  /** Make a JSON-RPC v0.7 call. */
  private async call<T>(method: string, params: unknown[]): Promise<T> {
    const id = ++this.idCounter;
    const resp = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const data = (await resp.json()) as StarknetRpcResponse<T>;
    if (data.error) {
      throw new Error(`Starknet RPC error ${data.error.code}: ${data.error.message}`);
    }

    return data.result!;
  }

  /** Get native balance (STRK) for an address. */
  async getBalance(address: string, block?: BlockReference): Promise<string> {
    const blockRef = block ?? 'latest';
    return this.call<string>('starknet_getBalance', [address, blockRef]);
  }

  /** Get chain ID. */
  async getChainId(): Promise<string> {
    return this.call<string>('starknet_chainId', []);
  }

  /** Get block number. */
  async getBlockNumber(): Promise<number> {
    const result = await this.call<{ block_number: number }>('starknet_blockNumber', []);
    return result.block_number;
  }

  /** Get block hash and number. */
  async getBlockWithTxHashes(block: BlockReference = 'latest'): Promise<{
    block_hash: string;
    block_number: number;
    transactions: string[];
  }> {
    return this.call('starknet_getBlockWithTxHashes', [block]);
  }

  /** Get transaction by hash. */
  async getTransactionByHash(txHash: string): Promise<{
    transaction_hash: string;
    type: string;
    sender_address?: string;
    contract_address?: string;
    calldata?: string[];
    nonce?: string;
    max_fee?: string;
    version?: string;
  }> {
    return this.call('starknet_getTransactionByHash', [txHash]);
  }

  /** Get transaction status. */
  async getTransactionStatus(txHash: string): Promise<{
    transaction_hash: string;
    status: string;
    finality_status?: string;
    execution_status?: string;
    block_hash?: string;
    block_number?: number;
  }> {
    return this.call('starknet_getTransactionStatus', [txHash]);
  }

  /** Get transaction receipt. */
  async getTransactionReceipt(txHash: string): Promise<{
    transaction_hash: string;
    actual_fee?: { amount: string; unit: string };
    events: unknown[];
    execution_status?: string;
    finality_status: string;
    block_hash?: string;
    block_number?: number;
    messages_sent?: unknown[];
  }> {
    return this.call('starknet_getTransactionReceipt', [txHash]);
  }

  /** Add an invoke transaction (broadcast signed tx). */
  async addInvokeTransaction(params: {
    type: 'INVOKE';
    sender_address: string;
    calldata: string[];
    nonce?: string;
    signature?: string[];
    max_fee?: string;
    version?: string;
  }): Promise<{ transaction_hash: string }> {
    return this.call('starknet_addInvokeTransaction', [params]);
  }

  /** Estimate fee for a transaction. */
  async estimateFee(params: {
    type: 'INVOKE';
    sender_address: string;
    calldata: string[];
    nonce?: string;
    version?: string;
  }, block?: BlockReference): Promise<{
    gas_consumed: string;
    gas_price: string;
    overall_fee: string;
    unit: string;
  }> {
    return this.call('starknet_estimateFee', [params, block ?? 'latest']);
  }

  /** Call a contract (read-only). */
  async callContract(params: {
    contract_address: string;
    entry_point_selector?: string;
    calldata?: string[];
  }, block?: BlockReference): Promise<{ result: string[] }> {
    return this.call('starknet_call', [
      {
        contract_address: params.contract_address,
        entry_point_selector: params.entry_point_selector,
        calldata: params.calldata ?? [],
      },
      block ?? 'latest',
    ]);
  }

  /** Get the nonce for an address. */
  async getNonce(address: string, block?: BlockReference): Promise<string> {
    return this.call<string>('starknet_getNonce', [block ?? 'latest', address]);
  }

  /** Get storage value at a contract key. */
  async getStorageAt(
    contractAddress: string,
    key: string,
    block?: BlockReference,
  ): Promise<string> {
    return this.call<string>('starknet_getStorageAt', [
      contractAddress,
      key,
      block ?? 'latest',
    ]);
  }

  /** Get the spec version of the node. */
  async getSpecVersion(): Promise<string> {
    return this.call<string>('starknet_specVersion', []);
  }

  /** Get class (contract ABI / program) by hash. */
  async getClass(classHash: string): Promise<unknown> {
    return this.call('starknet_getClass', ['latest', { class_hash: classHash }]);
  }

  /** Get class hash at a contract address. */
  async getClassHashAt(contractAddress: string): Promise<string> {
    return this.call<string>('starknet_getClassHashAt', ['latest', contractAddress]);
  }
}

/* ------------------------------------------------------------------ */
/*  Starknet ERC-20 helpers                                            */
/* ------------------------------------------------------------------ */

/** STRK token address on Starknet mainnet. */
export const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

/** ETH token address on Starknet mainnet (bridged). */
export const ETH_TOKEN_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

/**
 * Build the calldata for an ERC-20 balanceOf call on Starknet.
 */
export function buildErc20BalanceCalldata(userAddress: string): string[] {
  return [normalizeStarknetAddress(userAddress)];
}

/**
 * Build the calldata for an ERC-20 transfer call on Starknet.
 */
export function buildErc20TransferCalldata(
  recipient: string,
  amount: string | bigint,
): string[] {
  const addr = normalizeStarknetAddress(recipient);
  // Starknet ERC-20 uses u256 amounts (low, high)
  const amountBig = BigInt(amount);
  const low = amountBig & ((1n << 128n) - 1n);
  const high = amountBig >> 128n;
  return [addr, padHex('0x' + low.toString(16)), padHex('0x' + high.toString(16))];
}

/**
 * Build the calldata for an ERC-20 approve call on Starknet.
 */
export function buildErc20ApproveCalldata(
  spender: string,
  amount: string | bigint,
): string[] {
  const addr = normalizeStarknetAddress(spender);
  const amountBig = BigInt(amount);
  const low = amountBig & ((1n << 128n) - 1n);
  const high = amountBig >> 128n;
  return [addr, padHex('0x' + low.toString(16)), padHex('0x' + high.toString(16))];
}

/* ------------------------------------------------------------------ */
/*  Starknet transaction builder                                       */
/* ------------------------------------------------------------------ */

/** A single call in a Starknet invoke transaction. */
export interface StarknetCall {
  /** Contract address. */
  contractAddress: string;
  /** Entrypoint / function selector. */
  entrypoint: string;
  /** Calldata (array of felt252 hex strings). */
  calldata: string[];
}

/** Starknet invoke transaction request. */
export interface StarknetInvokeTransaction {
  /** Transaction type. */
  type: 'INVOKE';
  /** Sender account address. */
  sender_address: string;
  /** Calldata (for Starknet v1 transactions). */
  calldata: string[];
  /** Signature. */
  signature?: string[];
  /** Nonce. */
  nonce?: string;
  /** Max fee (in wei). */
  max_fee?: string;
  /** Transaction version. */
  version?: string;
}

/**
 * Encode multiple Starknet calls into a single invoke calldata.
 *
 * Starknet v1 invoke format:
 * [call_count, call0_contract, call0_selector, call0_data_offset, call0_data_len, ..., call_data...]
 */
export function encodeMultiCall(calls: StarknetCall[]): string[] {
  const allCalldata: string[] = [];
  const callHeaders: string[] = [];

  for (const call of calls) {
    callHeaders.push(
      normalizeStarknetAddress(call.contractAddress),
      encodeFelt252(call.entrypoint),
      encodeFelt252(allCalldata.length + 2), // data offset (after all headers)
      encodeFelt252(call.calldata.length),
    );
    allCalldata.push(...call.calldata);
  }

  return [
    encodeFelt252(calls.length),
    ...callHeaders,
    encodeFelt252(allCalldata.length),
    ...allCalldata,
  ];
}

/**
 * Build a single-call invoke transaction payload.
 */
export function buildInvokeTx(
  senderAddress: string,
  call: StarknetCall,
  options?: {
    nonce?: string;
    maxFee?: string;
    version?: string;
    signature?: string[];
  },
): StarknetInvokeTransaction {
  return {
    type: 'INVOKE',
    sender_address: normalizeStarknetAddress(senderAddress),
    calldata: encodeMultiCall([call]),
    nonce: options?.nonce,
    max_fee: options?.maxFee,
    version: options?.version ?? '0x1',
    signature: options?.signature,
  };
}

/**
 * Build a multi-call invoke transaction payload.
 */
export function buildMultiInvokeTx(
  senderAddress: string,
  calls: StarknetCall[],
  options?: {
    nonce?: string;
    maxFee?: string;
    version?: string;
    signature?: string[];
  },
): StarknetInvokeTransaction {
  return {
    type: 'INVOKE',
    sender_address: normalizeStarknetAddress(senderAddress),
    calldata: encodeMultiCall(calls),
    nonce: options?.nonce,
    max_fee: options?.maxFee,
    version: options?.version ?? '0x1',
    signature: options?.signature,
  };
}

/* ------------------------------------------------------------------ */
/*  StarknetChainAdapter                                               */
/* ------------------------------------------------------------------ */

/**
 * Starknet chain adapter implementing chain-specific operations.
 *
 * Wraps a Starknet wallet provider (window.starknet style) with
 * Starknet-specific JSON-RPC v0.7 calls, Cairo calldata encoding,
 * ERC-20 operations, and account abstraction support.
 *
 * Features:
 * - Native STRK / ETH balance queries
 * - ERC-20 token operations on Starknet
 * - Cairo contract interaction
 * - SNIP-12 message signing
 * - Account abstraction flows (native AA model)
 * - Multi-call batch transactions
 * - Wallet auto-detection (Argent X, Braavos, OKX)
 */
export class StarknetChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'starknet-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'Starknet Chain Adapter';

  private provider: StarknetWalletProvider | null = null;
  private chains: Chain[] = [...STARKNET_CHAINS];
  private currentChain: Chain = STARKNET_CHAINS[0];
  private rpcUrl: string = STARKNET_CHAINS[0].rpcUrl;
  private _accounts: string[] = [];
  private _rpcClient: StarknetRpcClient | null = null;
  private _connector: Connector | null = null;

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. */
  setConnector(connector: Connector): void {
    this._connector = connector;
  }

  /** Register supported Starknet chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains.length > 0 ? chains : [...STARKNET_CHAINS];
    this.currentChain = this.chains[0];
    this.rpcUrl = this.currentChain.rpcUrl;
    this._rpcClient = null;
  }

  /** Find a chain by numeric ID (returns first chain for compatibility). */
  findChain(_chainId: number): Chain | undefined {
    return this.chains[0];
  }

  /** Set the active wallet provider. */
  setProvider(provider: StarknetWalletProvider): void {
    this.provider = provider;
  }

  /** Get the current provider. */
  getProvider(): StarknetWalletProvider | null {
    return this.provider;
  }

  /** Get the RPC client (lazy-init). */
  private _getRpcClient(): StarknetRpcClient {
    if (!this._rpcClient) {
      this._rpcClient = new StarknetRpcClient(this.rpcUrl);
    }
    return this._rpcClient;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a Starknet wallet.
   * Tries Argent X → Braavos → OKX Wallet in order.
   * @param walletId - Optional wallet ID to prefer ('argent-x', 'braavos', 'okx').
   * @returns Array of connected addresses.
   */
  async connect(walletId?: string): Promise<string[]> {
    const target = this._resolveWallet(walletId);
    if (!target) {
      throw new Error(
        'No Starknet wallet found. Install Argent X, Braavos, or OKX Wallet.',
      );
    }

    this.provider = target;

    try {
      const addresses = await this.provider.enable();
      this._accounts = addresses.map((a) => normalizeStarknetAddress(a));
    } catch {
      // Some wallets may throw; try to get account from provider
      if (this.provider.account?.address) {
        this._accounts = [normalizeStarknetAddress(this.provider.account.address)];
      } else if (this.provider.selectedAddress) {
        this._accounts = [normalizeStarknetAddress(this.provider.selectedAddress)];
      } else {
        throw new Error('Failed to connect to Starknet wallet');
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

  /** Get the connected address (first account). */
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
   * Get the current chain ID.
   * Returns the Starknet chain ID as a felt252 hex string (e.g., '0x534e5f4d41494e' for mainnet).
   */
  async getChainId(): Promise<string> {
    return this._getRpcClient().getChainId();
  }

  /** Get the current chain string ID. */
  getChainStringId(): string {
    return this.currentChain.id;
  }

  /* ---- Balance ---- */

  /**
   * Get native STRK balance for an address.
   * @param address - Starknet address.
   * @returns Balance in wei (smallest unit, as hex string).
   */
  async getBalance(address: string): Promise<string> {
    if (!isValidStarknetAddress(address)) {
      throw new Error(`Invalid Starknet address: ${address}`);
    }

    try {
      return await this._getRpcClient().getBalance(
        normalizeStarknetAddress(address),
      );
    } catch {
      return '0x0';
    }
  }

  /**
   * Get formatted STRK balance (decimal string).
   * @param address - Starknet address.
   * @returns Balance in STRK (e.g., "12.345678901234567890").
   */
  async getBalanceFormatted(address: string): Promise<string> {
    const raw = await this.getBalance(address);
    return formatStarknetBalance(raw, STRK_DECIMALS);
  }

  /* ---- Token Balance ---- */

  /**
   * Get ERC-20 token balance on Starknet.
   * @param tokenAddress - ERC-20 contract address.
   * @param userAddress - User wallet address.
   * @returns Token balance (raw hex string).
   */
  async getTokenBalance(
    tokenAddress: string,
    userAddress: string,
  ): Promise<string> {
    if (!isValidStarknetAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }
    if (!isValidStarknetAddress(userAddress)) {
      throw new Error(`Invalid user address: ${userAddress}`);
    }

    try {
      const result = await this._getRpcClient().callContract({
        contract_address: normalizeStarknetAddress(tokenAddress),
        entry_point_selector: 'balance_of',
        calldata: buildErc20BalanceCalldata(userAddress),
      });

      if (result.result && result.result.length >= 2) {
        // u256: [low, high]
        const low = BigInt(result.result[0]);
        const high = BigInt(result.result[1]);
        return padHex('0x' + ((high << 128n) | low).toString(16));
      }

      return result.result?.[0] ?? '0x0';
    } catch {
      return '0x0';
    }
  }

  /* ---- Transactions ---- */

  /**
   * Send a transaction.
   * @param tx - StarknetInvokeTransaction, raw JSON string, or object.
   * @returns Transaction hash.
   */
  async sendTransaction(tx: StarknetInvokeTransaction | string | object): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    let txPayload: StarknetInvokeTransaction;

    if (typeof tx === 'string') {
      txPayload = JSON.parse(tx) as StarknetInvokeTransaction;
    } else if ('type' in tx && tx.type === 'INVOKE' && 'sender_address' in tx && 'calldata' in tx) {
      txPayload = tx as StarknetInvokeTransaction;
    } else {
      // Generic object — try to cast
      txPayload = tx as StarknetInvokeTransaction;
    }

    // If no signature, use wallet to sign and execute
    if (!txPayload.signature || txPayload.signature.length === 0) {
      try {
        const result = await this.provider.request({
          method: 'wallet_addInvokeTransaction',
          params: [txPayload],
        });
        return (result as { transaction_hash: string }).transaction_hash;
      } catch {
        // Try alternative method names
        try {
          const result = await this.provider.request({
            method: 'account_execute',
            params: [txPayload],
          });
          return (result as { transaction_hash: string }).transaction_hash;
        } catch (e) {
          throw new Error(
            `Failed to send transaction: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }

    // Already signed — broadcast directly via RPC
    try {
      const result = await this._getRpcClient().addInvokeTransaction(txPayload);
      return result.transaction_hash;
    } catch {
      throw new Error('Failed to broadcast signed transaction');
    }
  }

  /**
   * Send native STRK tokens.
   * @param to - Recipient address.
   * @param amount - Amount in wei (smallest unit).
   * @param options - Optional nonce, maxFee, version.
   * @returns Transaction hash.
   */
  async transferStrk(
    to: string,
    amount: string | bigint,
    options?: { nonce?: string; maxFee?: string },
  ): Promise<string> {
    const sender = this.getAddress();
    if (!sender) throw new Error('No connected account');
    if (!isValidStarknetAddress(to)) throw new Error(`Invalid recipient address: ${to}`);

    const call: StarknetCall = {
      contractAddress: STRK_TOKEN_ADDRESS,
      entrypoint: 'transfer',
      calldata: buildErc20TransferCalldata(to, amount),
    };

    const tx = buildInvokeTx(sender, call, {
      nonce: options?.nonce,
      maxFee: options?.maxFee,
    });

    return this.sendTransaction(tx);
  }

  /**
   * Send bridged ETH tokens on Starknet.
   * @param to - Recipient address.
   * @param amount - Amount in wei.
   * @param options - Optional nonce, maxFee.
   * @returns Transaction hash.
   */
  async transferEth(
    to: string,
    amount: string | bigint,
    options?: { nonce?: string; maxFee?: string },
  ): Promise<string> {
    const sender = this.getAddress();
    if (!sender) throw new Error('No connected account');
    if (!isValidStarknetAddress(to)) throw new Error(`Invalid recipient address: ${to}`);

    const call: StarknetCall = {
      contractAddress: ETH_TOKEN_ADDRESS,
      entrypoint: 'transfer',
      calldata: buildErc20TransferCalldata(to, amount),
    };

    const tx = buildInvokeTx(sender, call, {
      nonce: options?.nonce,
      maxFee: options?.maxFee,
    });

    return this.sendTransaction(tx);
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a personal message (SNIP-12).
   * @param message - Message to sign (string).
   * @returns Signature object with r, s components.
   */
  async signMessage(message: string): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');
    if (!this.getAddress()) throw new Error('No connected account');

    try {
      const result = await this.provider.request({
        method: 'wallet_signTypedData',
        params: [
          {
            message: message,
            domain: {
              name: 'Cinacoin',
              version: '1',
              chainId: await this.getChainId(),
            },
          },
          this.getAddress()!,
        ],
      });

      // Signature could be { r, s } or array [r, s] or hex string
      if (typeof result === 'string') return result;
      if (Array.isArray(result)) return JSON.stringify(result);
      const sig = result as Record<string, unknown>;
      if (sig.r && sig.s) return JSON.stringify({ r: sig.r, s: sig.s });
      return JSON.stringify(result);
    } catch {
      // Try starknet_signMessage (alternative)
      try {
        const result = await this.provider.request({
          method: 'starknet_signMessage',
          params: [{ message: message }, this.getAddress()!],
        });
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (e) {
        throw new Error(
          `Failed to sign message: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  /**
   * Sign a transaction (returns signature without broadcasting).
   * Uses the wallet's sign method to get a signature for the given transaction.
   * @param tx - StarknetInvokeTransaction.
   * @returns Signature array (string[]).
   */
  async signTransaction(
    tx: StarknetInvokeTransaction | object,
  ): Promise<string[]> {
    if (!this.provider) throw new Error('No provider connected');
    if (!this.getAddress()) throw new Error('No connected account');

    const txPayload = tx as StarknetInvokeTransaction;

    try {
      const result = await this.provider.request({
        method: 'wallet_signInvokeTransaction',
        params: [txPayload],
      });

      if (Array.isArray(result)) return result.map(String);
      const sig = result as { signature?: string[] };
      if (sig.signature) return sig.signature.map(String);
      return [JSON.stringify(result)];
    } catch {
      // Try starknet_signTransaction (alternative)
      try {
        const result = await this.provider.request({
          method: 'starknet_signTransaction',
          params: [txPayload],
        });
        if (Array.isArray(result)) return result.map(String);
        return [JSON.stringify(result)];
      } catch (e) {
        throw new Error(
          `Failed to sign transaction: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  /* ---- Contract Interaction ---- */

  /**
   * Call a Cairo contract (read-only).
   * @param contractAddress - Contract address.
   * @param entrypoint - Function name / selector.
   * @param calldata - Encoded calldata.
   * @returns Result array of felt252 hex strings.
   */
  async callContract(
    contractAddress: string,
    entrypoint: string,
    calldata: string[] = [],
  ): Promise<string[]> {
    if (!isValidStarknetAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }

    const result = await this._getRpcClient().callContract({
      contract_address: normalizeStarknetAddress(contractAddress),
      entry_point_selector: entrypoint,
      calldata,
    });

    return result.result ?? [];
  }

  /**
   * Execute a Cairo contract call (write transaction).
   * @param contractAddress - Contract address.
   * @param entrypoint - Function name.
   * @param calldata - Encoded calldata.
   * @param options - Optional nonce, maxFee.
   * @returns Transaction hash.
   */
  async executeContractCall(
    contractAddress: string,
    entrypoint: string,
    calldata: string[] = [],
    options?: { nonce?: string; maxFee?: string },
  ): Promise<string> {
    const sender = this.getAddress();
    if (!sender) throw new Error('No connected account');

    const call: StarknetCall = {
      contractAddress,
      entrypoint,
      calldata,
    };

    const tx = buildInvokeTx(sender, call, {
      nonce: options?.nonce,
      maxFee: options?.maxFee,
    });

    return this.sendTransaction(tx);
  }

  /**
   * Execute multiple Cairo contract calls in a single transaction.
   * @param calls - Array of contract calls.
   * @param options - Optional nonce, maxFee.
   * @returns Transaction hash.
   */
  async executeMultiCall(
    calls: StarknetCall[],
    options?: { nonce?: string; maxFee?: string },
  ): Promise<string> {
    const sender = this.getAddress();
    if (!sender) throw new Error('No connected account');
    if (calls.length === 0) throw new Error('No calls provided');

    const tx = buildMultiInvokeTx(sender, calls, {
      nonce: options?.nonce,
      maxFee: options?.maxFee,
    });

    return this.sendTransaction(tx);
  }

  /* ---- Account Abstraction ---- */

  /**
   * Check if an address is a deployed Starknet account (has account class).
   * @param address - Address to check.
   * @returns True if the address is a deployed account.
   */
  async isDeployedAccount(address: string): Promise<boolean> {
    try {
      await this._getRpcClient().getClassHashAt(normalizeStarknetAddress(address));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the account class hash for an address.
   * @param address - Account address.
   * @returns Class hash or null.
   */
  async getAccountClassHash(address: string): Promise<string | null> {
    try {
      return await this._getRpcClient().getClassHashAt(
        normalizeStarknetAddress(address),
      );
    } catch {
      return null;
    }
  }

  /**
   * Get the current nonce for an account.
   * @param address - Account address (defaults to connected account).
   * @returns Nonce as hex string.
   */
  async getNonce(address?: string): Promise<string> {
    const addr = address ?? this.getAddress();
    if (!addr) throw new Error('No address provided and no connected account');
    return this._getRpcClient().getNonce(normalizeStarknetAddress(addr));
  }

  /* ---- Transaction Queries ---- */

  /**
   * Get transaction by hash.
   * @param txHash - Transaction hash.
   * @returns Transaction data.
   */
  async getTransaction(txHash: string): Promise<unknown> {
    return this._getRpcClient().getTransactionByHash(txHash);
  }

  /**
   * Get transaction status.
   * @param txHash - Transaction hash.
   * @returns Transaction status.
   */
  async getTransactionStatus(txHash: string): Promise<StarknetTxStatus> {
    return this._getRpcClient().getTransactionStatus(txHash);
  }

  /**
   * Get transaction receipt.
   * @param txHash - Transaction hash.
   * @returns Transaction receipt.
   */
  async getTransactionReceipt(txHash: string): Promise<unknown> {
    return this._getRpcClient().getTransactionReceipt(txHash);
  }

  /**
   * Wait for a transaction to be accepted.
   * @param txHash - Transaction hash.
   * @param maxAttempts - Maximum polling attempts (default: 60).
   * @param intervalMs - Polling interval in ms (default: 2000).
   * @returns Final transaction status.
   */
  async waitForTransaction(
    txHash: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000,
  ): Promise<StarknetTxStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTransactionStatus(txHash);

      if (
        status.finality_status === 'ACCEPTED_ON_L2' ||
        status.finality_status === 'ACCEPTED_ON_L1'
      ) {
        return status;
      }

      if (
        status.status === 'REJECTED' ||
        status.execution_status === 'REVERTED'
      ) {
        return status;
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Transaction ${txHash} not confirmed after ${maxAttempts} attempts`);
  }

  /* ---- Gas & Block ---- */

  /**
   * Estimate gas fee for a transaction.
   * @param tx - Transaction to estimate.
   * @returns Fee estimate.
   */
  async estimateGas(tx: StarknetInvokeTransaction): Promise<string> {
    try {
      const result = await this._getRpcClient().estimateFee({
        type: 'INVOKE',
        sender_address: tx.sender_address,
        calldata: tx.calldata,
        nonce: tx.nonce,
        version: tx.version ?? '0x1',
      });
      return result.overall_fee;
    } catch {
      // Return a default estimate
      return '0x2386f26fc10000'; // ~0.001 STRK
    }
  }

  /** Get current block number. */
  async getBlockNumber(): Promise<number> {
    return this._getRpcClient().getBlockNumber();
  }

  /** Get storage value at a contract key. */
  async getStorageAt(
    contractAddress: string,
    key: string,
  ): Promise<string> {
    return this._getRpcClient().getStorageAt(
      normalizeStarknetAddress(contractAddress),
      key,
    );
  }

  /* ---- Chain Switch ---- */

  /** Switch the active chain by numeric ID (returns first chain for compatibility). */
  async switchChain(chainId: number): Promise<void> {
    const chain = this.findChain(chainId);
    if (chain) {
      this.currentChain = chain;
      this.rpcUrl = chain.rpcUrl;
      this._rpcClient = null;
    }
  }

  /** Switch chain by string ID. */
  async switchChainById(chainId: string): Promise<void> {
    const chain = this.chains.find((c) => c.id === chainId);
    if (!chain) throw new Error(`Chain not found: ${chainId}`);
    this.currentChain = chain;
    this.rpcUrl = chain.rpcUrl;
    this._rpcClient = null;
  }

  /* ---- EIP-1193 Compatible Request ---- */

  /**
   * EIP-1193 compatible request method for Starknet.
   */
  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    switch (args.method) {
      case 'starknet_getBalance': {
        const address = (args.params?.[0] ?? this.getAddress() ?? '') as string;
        return this.getBalance(address);
      }
      case 'starknet_sendTransaction': {
        const tx = args.params?.[0] as StarknetInvokeTransaction;
        return this.sendTransaction(tx);
      }
      case 'starknet_signMessage': {
        const msg = (args.params?.[0] ?? '') as string;
        return this.signMessage(msg);
      }
      case 'starknet_signTransaction': {
        const tx = args.params?.[0] as StarknetInvokeTransaction;
        return this.signTransaction(tx);
      }
      case 'starknet_chainId': {
        return this.getChainId();
      }
      case 'starknet_call': {
        const callArgs = args.params?.[0] as {
          contract_address: string;
          entry_point_selector: string;
          calldata?: string[];
        };
        return this.callContract(
          callArgs.contract_address,
          callArgs.entry_point_selector,
          callArgs.calldata ?? [],
        );
      }
      case 'starknet_getTransactionStatus': {
        const txHash = (args.params?.[0] ?? '') as string;
        return this.getTransactionStatus(txHash);
      }
      default:
        throw new Error(`Unsupported Starknet method: ${args.method}`);
    }
  }

  /* ---- Utility ---- */

  /** Find a chain by its string ID. */
  findChainById(chainId: string): Chain | undefined {
    return this.chains.find((c) => c.id === chainId);
  }

  /** Get the RPC URL. */
  getRpcUrl(): string {
    return this.rpcUrl;
  }

  /** Set the RPC URL. */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
    this._rpcClient = null;
  }

  /* ---- Private: Wallet resolution ---- */

  private _resolveWallet(walletId?: string): StarknetWalletProvider | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as StarknetWindow;

    if (walletId) {
      switch (walletId) {
        case 'argent-x':
          return win.argentX ?? win.starknet ?? null;
        case 'braavos':
          return win.braavos ?? win.starknet ?? null;
        case 'okx':
          return win.okxwallet?.starknet ?? win.starknet ?? null;
        default:
          return win.starknet ?? win.argentX ?? win.braavos ?? win.okxwallet?.starknet ?? null;
      }
    }

    // Auto-detect: Argent X → Braavos → OKX → generic starknet
    if (win.argentX) return win.argentX;
    if (win.braavos) return win.braavos;
    if (win.okxwallet?.starknet) return win.okxwallet.starknet;
    if (win.starknet) return win.starknet;

    return null;
  }
}
