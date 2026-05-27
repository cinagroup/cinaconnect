/**
 * NEAR Chain Adapter — provides NEAR Protocol-specific operations.
 *
 * Uses the NEAR JSON-RPC API for on-chain queries and the NEAR Wallet Selector
 * standard for signing and transaction submission. Supports MyNearWallet,
 * Meteor Wallet, Here Wallet, Sender, and other NEP-413 compatible wallets.
 *
 * Features:
 * - Native NEAR balance queries (view_account, query)
 * - NEAR transfer transactions
 * - Function calls to NEAR smart contracts
 * - NEP-141 fungible token transfers and balance queries
 * - NEP-171 NFT minting, transfers, and metadata queries
 * - Borsh (Binary Object Representation Serialization) encoding
 * - NEP-413 message signing
 * - Wallet Selector pattern for multi-wallet support
 */

import type { Connector } from '../connector.js';
import type { Chain } from '../types.js';

/* ------------------------------------------------------------------ */
/*  Borsh (Binary Object Representation Serialization)                 */
/*  NEAR's serialization format for transactions and state.            */
/* ------------------------------------------------------------------ */

/** Borsh writer — serializes values into a byte buffer. */
export class BorshWriter {
  private data: number[] = [];
  /** Current write offset. */
  offset: number = 0;

  constructor(options?: { size?: number }) {
    if (options?.size) this.data = new Array(options.size);
  }

  /** Write a single byte (u8). */
  writeU8(value: number): this {
    this.data[this.offset++] = value & 0xff;
    return this;
  }

  /** Write a 16-bit unsigned integer (little-endian). */
  writeU16(value: number): this {
    this.data[this.offset++] = value & 0xff;
    this.data[this.offset++] = (value >> 8) & 0xff;
    return this;
  }

  /** Write a 32-bit unsigned integer (little-endian). */
  writeU32(value: number): this {
    this.data[this.offset++] = value & 0xff;
    this.data[this.offset++] = (value >> 8) & 0xff;
    this.data[this.offset++] = (value >> 16) & 0xff;
    this.data[this.offset++] = (value >> 24) & 0xff;
    return this;
  }

  /** Write a 64-bit unsigned integer as a Borsh u128 (16 bytes, LE). */
  writeU64(value: bigint | string | number): this {
    const n = BigInt(value);
    for (let i = 0; i < 8; i++) {
      this.data[this.offset++] = Number((n >> BigInt(i * 8)) & 0xffn);
    }
    return this;
  }

  /** Write a Borsh u128 (16 bytes, little-endian). */
  writeU128(value: bigint | string): this {
    const n = BigInt(value);
    for (let i = 0; i < 16; i++) {
      this.data[this.offset++] = Number((n >> BigInt(i * 8)) & 0xffn);
    }
    return this;
  }

  /** Write a boolean (1 byte: 0 or 1). */
  writeBool(value: boolean): this {
    this.data[this.offset++] = value ? 1 : 0;
    return this;
  }

  /** Write a length-prefixed byte array. */
  writeBytes(data: Uint8Array | number[]): this {
    this.writeU32(data.length);
    for (let i = 0; i < data.length; i++) {
      this.data[this.offset++] = data[i];
    }
    return this;
  }

  /** Write a length-prefixed UTF-8 string. */
  writeString(str: string): this {
    const bytes = new TextEncoder().encode(str);
    return this.writeBytes(bytes);
  }

  /** Write a fixed-length 32-byte array (used for NEAR hashes/signatures). */
  writeFixed32(hex: string): this {
    const cleaned = hex.replace(/^0x/, '');
    for (let i = 0; i < 32; i++) {
      this.data[this.offset++] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    }
    return this;
  }

  /** Write an optional value (presence byte + value via callback). */
  writeOption<T>(value: T | null, writer: (w: BorshWriter, v: T) => void): this {
    if (value === null || value === undefined) {
      this.writeU8(0);
    } else {
      this.writeU8(1);
      writer(this, value);
    }
    return this;
  }

  /** Write an array with a length prefix, using a callback for each element. */
  writeArray<T>(arr: T[], writer: (w: BorshWriter, v: T) => void): this {
    this.writeU32(arr.length);
    for (const item of arr) {
      writer(this, item);
    }
    return this;
  }

  /** Get the serialized bytes as a Uint8Array. */
  toBytes(): Uint8Array {
    return new Uint8Array(this.data.slice(0, this.offset));
  }

  /** Get the serialized bytes as a base64 string. */
  toBase64(): string {
    return btoa(String.fromCharCode(...this.toBytes()));
  }

  /** Get the serialized bytes as a hex string with 0x prefix. */
  toHex(): string {
    return '0x' + Array.from(this.toBytes())
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/** Borsh reader — deserializes values from a byte buffer. */
export class BorshReader {
  private data: Uint8Array;
  /** Current read offset. */
  offset: number = 0;

  constructor(data: Uint8Array | number[]) {
    this.data = data instanceof Uint8Array ? data : new Uint8Array(data);
  }

  /** Read a single byte (u8). */
  readU8(): number {
    return this.data[this.offset++];
  }

  /** Read a 16-bit unsigned integer (little-endian). */
  readU16(): number {
    const value = this.data[this.offset] | (this.data[this.offset + 1] << 8);
    this.offset += 2;
    return value;
  }

  /** Read a 32-bit unsigned integer (little-endian). */
  readU32(): number {
    const value =
      this.data[this.offset] |
      (this.data[this.offset + 1] << 8) |
      (this.data[this.offset + 2] << 16) |
      (this.data[this.offset + 3] << 24);
    this.offset += 4;
    return value >>> 0;
  }

  /** Read a 64-bit unsigned integer as bigint (little-endian). */
  readU64(): bigint {
    let result = 0n;
    for (let i = 0; i < 8; i++) {
      result |= BigInt(this.data[this.offset + i]) << BigInt(i * 8);
    }
    this.offset += 8;
    return result;
  }

  /** Read a Borsh u128 (16 bytes, little-endian). */
  readU128(): bigint {
    let result = 0n;
    for (let i = 0; i < 16; i++) {
      result |= BigInt(this.data[this.offset + i]) << BigInt(i * 8);
    }
    this.offset += 16;
    return result;
  }

  /** Read a boolean. */
  readBool(): boolean {
    return this.readU8() === 1;
  }

  /** Read a length-prefixed byte array. */
  readBytes(): Uint8Array {
    const len = this.readU32();
    const bytes = this.data.slice(this.offset, this.offset + len);
    this.offset += len;
    return bytes;
  }

  /** Read a length-prefixed UTF-8 string. */
  readString(): string {
    return new TextDecoder().decode(this.readBytes());
  }

  /** Read a fixed-length 32-byte array as hex. */
  readFixed32(): string {
    const bytes = this.data.slice(this.offset, this.offset + 32);
    this.offset += 32;
    return '0x' + Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Read an optional value (presence byte + reader callback). */
  readOption<T>(reader: (r: BorshReader) => T): T | null {
    const present = this.readU8();
    if (!present) return null;
    return reader(this);
  }

  /** Read an array with length prefix, using a callback for each element. */
  readArray<T>(reader: (r: BorshReader) => T): T[] {
    const len = this.readU32();
    const result: T[] = [];
    for (let i = 0; i < len; i++) {
      result.push(reader(this));
    }
    return result;
  }

  /** Remaining bytes count. */
  remaining(): number {
    return this.data.length - this.offset;
  }
}

/* ------------------------------------------------------------------ */
/*  Base58 encoding (used for NEAR signatures, hashes, keys)          */
/* ------------------------------------------------------------------ */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_INVERSE = new Map<string, number>();
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_INVERSE.set(BASE58_ALPHABET[i], i);
}

/** Encode bytes to base58. */
export function base58Encode(bytes: Uint8Array): string {
  let num = 0n;
  for (let i = 0; i < bytes.length; i++) {
    num = num * 256n + BigInt(bytes[i]);
  }

  let encoded = '';
  while (num > 0n) {
    encoded = BASE58_ALPHABET[Number(num % 58n)] + encoded;
    num = num / 58n;
  }

  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    encoded = '1' + encoded;
  }

  return encoded || '1';
}

/** Decode a base58 string to bytes. */
export function base58Decode(str: string): Uint8Array | null {
  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const digit = BASE58_INVERSE.get(str[i]);
    if (digit === undefined) return null;
    num = num * 58n + BigInt(digit);
  }

  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }

  // Add leading zeros
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}

/* ------------------------------------------------------------------ */
/*  SHA-256 (minimal, for NEAR transaction hashing)                    */
/* ------------------------------------------------------------------ */

/** Compute SHA-256 hash of input bytes. Uses Web Crypto API. */
export async function sha256(input: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Strict TS rejects Uint8Array<ArrayBufferLike> as BufferSource.
    // Cast is safe: crypto.subtle only accepts ArrayBuffer-backed views.
    const hash = await crypto.subtle.digest('SHA-256', input as unknown as BufferSource);
    return new Uint8Array(hash);
  }
  // Node.js fallback
  if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
    const { createHash } = await import('crypto' as any);
    return createHash('sha256').update(input).digest();
  }
  throw new Error('SHA-256 not available');
}

/* ------------------------------------------------------------------ */
/*  NEAR account model helpers                                         */
/* ------------------------------------------------------------------ */

/**
 * Validate a NEAR account ID.
 * Rules:
 * - 2-64 characters for top-level, 2+64 for subaccounts
 * - Lowercase letters, digits, hyphens
 * - No consecutive hyphens
 * - Cannot start or end with hyphen
 * - Top-level accounts are specific names (near, testnet, etc.)
 */
export function isValidNearAccount(accountId: string): boolean {
  if (typeof accountId !== 'string') return false;
  if (accountId.length < 2) return false;
  if (accountId.length > 375) return false; // max total length
  if (!/^[a-z0-9._-]+$/.test(accountId)) return false;
  if (accountId.startsWith('-') || accountId.endsWith('-')) return false;
  if (accountId.startsWith('.') || accountId.endsWith('.')) return false;
  if (accountId.includes('--')) return false;
  if (accountId.includes('__')) return false;
  // Check each part (account parts separated by .)
  const parts = accountId.split('.');
  for (const part of parts) {
    if (part.length < 2) return false;
    if (part.startsWith('-') || part.endsWith('-')) return false;
  }
  return true;
}

/**
 * Normalize a NEAR account ID (lowercase, trim).
 */
export function normalizeNearAccount(accountId: string): string {
  return accountId.toLowerCase().trim();
}

/**
 * Check if an account ID is a subaccount.
 */
export function isSubAccount(accountId: string): boolean {
  return accountId.includes('.');
}

/**
 * Get the parent account of a subaccount.
 */
export function getParentAccount(accountId: string): string | null {
  const idx = accountId.indexOf('.');
  return idx >= 0 ? accountId.slice(idx + 1) : null;
}

/* ------------------------------------------------------------------ */
/*  NEAR amount helpers (NEAR has 24 decimal places — yoctoNEAR)       */
/* ------------------------------------------------------------------ */

/**
 * Format yoctoNEAR to human-readable NEAR string.
 * NEAR has 24 decimal places.
 */
export function formatNearBalance(yoctoNear: string | bigint | number): string {
  const n = BigInt(yoctoNear);
  const divisor = 10n ** 24n;
  const intPart = n / divisor;
  const fracPart = n % divisor;
  const fracStr = fracPart.toString().padStart(24, '0').replace(/0+$/, '');
  return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
}

/**
 * Parse a human-readable NEAR amount to yoctoNEAR (smallest unit).
 */
export function parseNearAmount(near: string): bigint {
  const parts = near.split('.');
  const intPart = BigInt(parts[0] || '0');
  let fracPart = 0n;
  if (parts.length > 1) {
    const frac = parts[1].padEnd(24, '0').slice(0, 24);
    fracPart = BigInt(frac);
  }
  return intPart * 10n ** 24n + fracPart;
}

/* ------------------------------------------------------------------ */
/*  NEAR key types                                                     */
/* ------------------------------------------------------------------ */

/** NEAR access key type. */
export enum AccessKeyPermission {
  /** Full access key — can sign any transaction. */
  FullAccess = 0,
  /** Function call key — restricted to specific contracts. */
  FunctionCall = 1,
}

/** NEAR key kind (for key pair representation). */
export enum KeyKind {
  /** ED25519 curve (NEAR standard). */
  ED25519 = 0,
  /** SECP256K1 curve. */
  SECP256K1 = 1,
}

/* ------------------------------------------------------------------ */
/*  NEAR transaction types                                             */
/* ------------------------------------------------------------------ */

/** NEAR action types for transaction building. */
export enum ActionKind {
  /** Create a new account. */
  CreateAccount = 0,
  /** Deploy a smart contract (WASM). */
  DeployContract = 1,
  /** Call a function on a smart contract. */
  FunctionCall = 2,
  /** Transfer NEAR tokens. */
  Transfer = 3,
  /** Stake NEAR tokens (validator). */
  Stake = 4,
  /** Add a new access key. */
  AddKey = 5,
  /** Delete an existing access key. */
  DeleteKey = 6,
  /** Delete an account and refund storage. */
  DeleteAccount = 7,
}

/** A NEAR transaction action. */
export interface NearAction {
  /** The kind of action. */
  kind: ActionKind;
  /** Action-specific data. */
  params: Record<string, unknown>;
}

/**
 * Create a transfer action.
 */
export function createTransferAction(amount: string | bigint): NearAction {
  return {
    kind: ActionKind.Transfer,
    params: { deposit: BigInt(amount).toString() },
  };
}

/**
 * Create a function call action.
 */
export function createFunctionCallAction(
  methodName: string,
  args: Record<string, unknown>,
  gas: string | bigint,
  deposit: string | bigint = '0',
): NearAction {
  return {
    kind: ActionKind.FunctionCall,
    params: {
      methodName,
      args: JSON.stringify(args),
      gas: BigInt(gas).toString(),
      deposit: BigInt(deposit).toString(),
    },
  };
}

/**
 * Create a create account action.
 */
export function createAccountAction(): NearAction {
  return {
    kind: ActionKind.CreateAccount,
    params: {},
  };
}

/**
 * NEAR transaction descriptor for sendTransaction.
 */
export interface NearTransactionRequest {
  /** Target contract/account ID. */
  receiverId: string;
  /** Actions to perform. */
  actions: NearAction[];
  /** Gas limit (default: 30_000_000_000_000 = 30 Tgas). */
  gas?: string;
  /** Attached deposit in yoctoNEAR. */
  deposit?: string;
  /** Nonce (auto-fetched if omitted). */
  nonce?: string;
  /** Block hash (auto-fetched if omitted). */
  blockHash?: string;
}

/**
 * NEAR function call parameters.
 */
export interface NearFunctionCall {
  /** Contract account ID. */
  contractId: string;
  /** Method name to call. */
  methodName: string;
  /** Method arguments (JSON object). */
  args?: Record<string, unknown>;
  /** Gas limit (default: 30 Tgas). */
  gas?: string;
  /** Attached deposit in yoctoNEAR. */
  deposit?: string;
}

/**
 * NEP-141 fungible token transfer parameters.
 */
export interface NearFtTransfer {
  /** FT contract account ID. */
  contractId: string;
  /** Recipient account ID. */
  receiverId: string;
  /** Amount in token's smallest unit. */
  amount: string;
  /** Optional memo string. */
  memo?: string;
  /** Gas for the transfer (default: 100 Tgas). */
  gas?: string;
  /** Attached deposit (must be at least 1 yoctoNEAR for security). */
  deposit?: string;
}

/**
 * NEP-141 FT token metadata.
 */
export interface NearFtMetadata {
  /** Token name. */
  name: string;
  /** Token symbol. */
  symbol: string;
  /** Token icon (URL or data URI). */
  icon?: string;
  /** Reference URL for more info. */
  reference?: string;
  /** Number of decimal places. */
  decimals: number;
}

/**
 * NEP-171 NFT token metadata.
 */
export interface NearNftMetadata {
  /** Token title. */
  title?: string;
  /** Token description. */
  description?: string;
  /** Media URL (image, video, etc.). */
  media?: string;
  /** Media hash for verification. */
  media_hash?: string;
  /** Collection name. */
  collection?: string;
  /** Royalty recipients. */
  royalties?: Record<string, number>;
  /** Extra metadata fields. */
  extra?: string;
  /** Reference URL. */
  reference?: string;
  /** Reference hash. */
  reference_hash?: string;
}

/**
 * NEP-171 NFT token info.
 */
export interface NearNftToken {
  /** Unique token ID. */
  token_id: string;
  /** Current owner account ID. */
  owner_id: string;
  /** Token metadata (may require separate metadata call). */
  metadata?: NearNftMetadata;
}

/**
 * NEP-171 NFT transfer parameters.
 */
export interface NearNftTransfer {
  /** NFT contract account ID. */
  contractId: string;
  /** Recipient account ID. */
  receiverId: string;
  /** Token ID to transfer. */
  tokenId: string;
  /** Optional memo string. */
  memo?: string;
  /** Gas for the transfer. */
  gas?: string;
  /** Attached deposit (must be at least 1 yoctoNEAR). */
  deposit?: string;
}

/**
 * NEP-171 NFT mint parameters.
 */
export interface NearNftMint {
  /** NFT contract account ID. */
  contractId: string;
  /** Recipient account ID (defaults to sender). */
  receiverId?: string;
  /** Token ID to mint. */
  tokenId: string;
  /** Token metadata. */
  metadata: NearNftMetadata;
  /** Gas for the mint. */
  gas?: string;
  /** Attached deposit for storage. */
  deposit: string;
}

/**
 * NEAR signed transaction result.
 */
export interface NearSignedTransaction {
  /** Transaction hash (base58). */
  transactionHash: string;
  /** Base64-encoded signed transaction. */
  encoded: string;
  /** Raw bytes. */
  rawBytes: Uint8Array;
}

/**
 * NEAR transaction response from RPC.
 */
export interface NearTransactionResponse {
  /** Transaction hash (base58). */
  transactionHash: string;
  /** Transaction status. */
  status: 'SuccessValue' | 'Failure' | 'Pending' | 'Unknown';
  /** Execution outcome. */
  outcome?: {
    gasBurnt: string;
    tokensBurnt: string;
    logs: string[];
    status: string;
  };
  /** Receipts. */
  receipts?: unknown[];
  /** Transaction object. */
  transaction?: {
    signerId: string;
    publicKey: string;
    nonce: number;
    receiverId: string;
    actions: unknown[];
    signature: string;
  };
}

/* ------------------------------------------------------------------ */
/*  NEAR wallet provider interface (Wallet Selector / NEP-413)         */
/* ------------------------------------------------------------------ */

/**
 * NEAR Wallet Selector wallet interface.
 * Compatible with the @near-wallet-selector standard.
 */
export interface NearWalletProvider {
  /** Wallet metadata. */
  metadata?: {
    name: string;
    description: string;
    iconUrl: string;
    deprecated?: boolean;
    available?: boolean;
  };

  /** Sign in to the wallet. */
  signIn(): Promise<{ accountId: string; publicKey?: string }[]>;

  /** Sign out / disconnect. */
  signOut(): Promise<void>;

  /** Get the signed-in accounts. */
  getAccounts(): Promise<{ accountId: string; publicKey?: string }[]>;

  /** Check if the wallet is signed in. */
  isSignedIn(): boolean | Promise<boolean>;

  /**
   * Sign a transaction and send it.
   * Compatible with NEP-413 / Wallet Selector.
   */
  signAndSendTransaction(params: {
    signerId?: string;
    receiverId: string;
    actions: {
      type: string;
      params: Record<string, unknown>;
    }[];
  }): Promise<{
    transaction: { hash: string };
    transactionHash: string;
  }>;

  /**
   * Sign multiple transactions (batch).
   */
  signAndSendTransactions?(params: {
    transactions: {
      signerId?: string;
      receiverId: string;
      actions: { type: string; params: Record<string, unknown> }[];
    }[];
  }): Promise<unknown[]>;

  /**
   * Sign a message (NEP-413 standard).
   */
  signMessage?(params: {
    message: string;
    recipient: string;
    nonce: Uint8Array;
    callbackUrl?: string;
    state?: string;
  }): Promise<{
    accountId: string;
    publicKey: string;
    signature: string;
    message: string;
  }>;

  /**
   * Sign a raw transaction (for custom flows).
   */
  signTransaction?(params: {
    receiverId: string;
    actions: unknown[];
    signerId?: string;
  }): Promise<{
    transaction: unknown;
    signature: string;
    publicKey: string;
  }>;

  /** EIP-1193 style request. */
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;

  /** Listen to account changes. */
  on?(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * NEAR Wallet Selector (multi-wallet manager).
 * Used by MyNearWallet, Meteor, Here Wallet, etc.
 */
export interface NearWalletSelector {
  /** Get all registered wallets. */
  getWallets(): { id: string; metadata: { name: string } }[];

  /** Select and return a wallet by ID. */
  selectWallet(walletId: string): NearWalletProvider | null;

  /** Get the currently selected wallet. */
  wallet(): NearWalletProvider | null;

  /** Sign in via the selected wallet. */
  signIn(): Promise<unknown>;

  /** Sign out. */
  signOut(): Promise<void>;

  /** Check if signed in. */
  isSignedIn(): boolean;
}

/** Window type with NEAR wallets. */
interface NearWindow extends Window {
  near?: NearWalletSelector;
  nearWallet?: NearWalletProvider;
  // Sender Wallet
  nearSender?: NearWalletProvider;
  // Meteor Wallet
  meteorWallet?: NearWalletProvider;
  // Here Wallet
  hereWallet?: NearWalletProvider;
  // MyNearWallet (usually accessed via wallet selector)
  myNearWallet?: NearWalletProvider;
}

/* ------------------------------------------------------------------ */
/*  Supported NEAR wallets                                             */
/* ------------------------------------------------------------------ */

export interface NearWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  downloadUrl: string;
  type: 'browser-extension' | 'web-wallet' | 'mobile' | 'hardware';
}

export const NEAR_WALLETS: NearWalletInfo[] = [
  {
    id: 'mynearwallet',
    name: 'MyNearWallet',
    rdns: 'app.mynearwallet',
    icon: 'https://mynearwallet.com/favicon.ico',
    downloadUrl: 'https://mynearwallet.com',
    type: 'web-wallet',
  },
  {
    id: 'meteor',
    name: 'Meteor Wallet',
    rdns: 'app.meteorwallet',
    icon: 'https://wallet.meteorfinance.io/favicon.ico',
    downloadUrl: 'https://wallet.meteorfinance.io',
    type: 'browser-extension',
  },
  {
    id: 'here-wallet',
    name: 'Here Wallet',
    rdns: 'app.herewallet',
    icon: 'https://www.herewallet.app/favicon.ico',
    downloadUrl: 'https://www.herewallet.app',
    type: 'mobile',
  },
  {
    id: 'sender',
    name: 'Sender Wallet',
    rdns: 'app.senderwallet',
    icon: 'https://senderwallet.io/favicon.ico',
    downloadUrl: 'https://senderwallet.io',
    type: 'browser-extension',
  },
  {
    id: 'wallet-selector',
    name: 'Wallet Selector',
    rdns: 'org.near.walletselector',
    icon: 'https://wallet.near.org/favicon.ico',
    downloadUrl: 'https://wallet.near.org',
    type: 'web-wallet',
  },
];

/** Well-known NEAR chain presets. */
export const NEAR_CHAINS: Chain[] = [
  {
    id: 'near:mainnet',
    name: 'NEAR Mainnet',
    rpcUrl: 'https://rpc.mainnet.near.org',
    nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 },
    explorerUrl: 'https://nearscan.org',
    iconUrl: 'https://cryptologos.cc/logos/near-protocol-near-logo.svg',
  },
  {
    id: 'near:testnet',
    name: 'NEAR Testnet',
    rpcUrl: 'https://rpc.testnet.near.org',
    nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 },
    explorerUrl: 'https://testnet.nearscan.org',
    iconUrl: 'https://cryptologos.cc/logos/near-protocol-near-logo.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  NEAR JSON-RPC client                                               */
/* ------------------------------------------------------------------ */

/** NEAR RPC response envelope. */
interface NearRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

/** NEAR account info from view_account. */
export interface NearAccountInfo {
  account_id: string;
  amount: string;
  locked: string;
  code_hash: string;
  storage_usage: number;
  storage_paid_at: number;
  block_height: number;
  block_hash: string;
}

/** NEAR access key info. */
export interface NearAccessKeyInfo {
  nonce: number;
  permission:
    | 'FullAccess'
    | { FunctionCall: { allowance?: string; receiver_id: string; method_names: string[] } };
}

/** NEAR block info. */
export interface NearBlockInfo {
  header: {
    height: number;
    hash: string;
    prev_hash: string;
    timestamp: number;
    epoch_id: string;
  };
}

/** NEAR transaction status from tx. */
export interface NearTxStatusResult {
  transaction: {
    hash: string;
    signer_id: string;
    public_key: string;
    nonce: number;
    receiver_id: string;
    actions: unknown[];
    signature: string;
  };
  status: unknown;
  receipts: unknown[];
  receipts_outcome: unknown[];
}

/** NEAR view state result. */
export interface NearViewStateResult {
  block_height: number;
  block_hash: string;
  value: string; // base64-encoded
  proof: unknown[];
}

/** NEAR function call result. */
export interface NearCallResult {
  block_height: number;
  block_hash: string;
  result: unknown;
  logs: string[];
}

/** NEAR RPC client for HTTP JSON-RPC calls. */
class NearRpcClient {
  private rpcUrl: string;
  private idCounter: number = 0;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  /** Make a JSON-RPC call. */
  private async call<T>(method: string, params: unknown[] | Record<string, unknown>): Promise<T> {
    const id = ++this.idCounter;
    const resp = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const data = (await resp.json()) as NearRpcResponse<T>;
    if (data.error) {
      throw new Error(`NEAR RPC error ${data.error.code}: ${data.error.message}`);
    }

    return data.result!;
  }

  /** Get account info (view_account). */
  async viewAccount(accountId: string, finality: string = 'final'): Promise<NearAccountInfo> {
    return this.call('query', [{
      request_type: 'view_account',
      account_id: accountId,
      finality,
    }]);
  }

  /** Get access key for an account (needed for nonce). */
  async viewAccessKey(accountId: string, publicKey: string, finality: string = 'final'): Promise<NearAccessKeyInfo> {
    return this.call('query', [{
      request_type: 'view_access_key',
      account_id: accountId,
      public_key: publicKey,
      finality,
    }]);
  }

  /** Get all access keys for an account. */
  async viewAccessKeys(accountId: string, finality: string = 'final'): Promise<{
    keys: { public_key: string; access_key: NearAccessKeyInfo }[];
    block_height: number;
    block_hash: string;
  }> {
    return this.call('query', [{
      request_type: 'view_access_key_list',
      account_id: accountId,
      finality,
    }]);
  }

  /** Get account balance (convenience wrapper). */
  async getBalance(accountId: string): Promise<string> {
    const account = await this.viewAccount(accountId);
    return account.amount;
  }

  /** Get the latest block hash (needed for transaction signing). */
  async getLatestBlockHash(): Promise<{ height: number; hash: string }> {
    const block = await this.call<NearBlockInfo>('block', { finality: 'final' });
    return {
      height: block.header.height,
      hash: block.header.hash,
    };
  }

  /** Broadcast a signed transaction. */
  async broadcastTx(signedTxBase64: string): Promise<NearTxStatusResult> {
    return this.call('broadcast_tx_commit', [signedTxBase64]);
  }

  /** Broadcast a transaction without waiting for execution. */
  async broadcastTxAsync(signedTxBase64: string): Promise<string> {
    return this.call('broadcast_tx_async', [signedTxBase64]);
  }

  /** Get transaction status by hash. */
  async getTransactionStatus(txHash: string, accountId: string): Promise<NearTxStatusResult> {
    const hashBytes = base58Decode(txHash);
    if (!hashBytes) throw new Error(`Invalid transaction hash: ${txHash}`);
    return this.call('tx', [Array.from(hashBytes), accountId]);
  }

  /** Call a contract view method (read-only). */
  async viewCall(
    contractId: string,
    methodName: string,
    args: Record<string, unknown> = {},
  ): Promise<NearCallResult> {
    const argsBase64 = btoa(JSON.stringify(args));
    return this.call('query', [{
      request_type: 'call_function',
      account_id: contractId,
      method_name: methodName,
      args_base64: argsBase64,
      finality: 'final',
    }]);
  }

  /** View contract state (raw storage). */
  async viewState(contractId: string, prefix: string = ''): Promise<NearViewStateResult> {
    const prefixBase64 = btoa(prefix);
    return this.call('query', [{
      request_type: 'view_state',
      account_id: contractId,
      prefix_base64: prefixBase64,
      finality: 'final',
    }]);
  }

  /** Get network status / version. */
  async getStatus(): Promise<{
    chain_id: string;
    latest_block_hash: string;
    latest_block_height: number;
  }> {
    return this.call('status', []);
  }

  /** Get gas price. */
  async getGasPrice(blockHash?: string): Promise<{ gas_price: string }> {
    return this.call('gas_price', [blockHash ?? null]);
  }

  /** Get chain ID. */
  async getChainId(): Promise<string> {
    const status = await this.getStatus();
    return status.chain_id;
  }
}

/* ------------------------------------------------------------------ */
/*  NEAR transaction builder                                           */
/* ------------------------------------------------------------------ */

/** Default gas limit for NEAR function calls (30 Tgas). */
export const DEFAULT_NEAR_GAS = '30000000000000';

/** Default gas limit for NEP-141 FT transfers (100 Tgas). */
export const DEFAULT_FT_GAS = '100000000000000';

/** Default gas limit for NEP-171 NFT operations (100 Tgas). */
export const DEFAULT_NFT_GAS = '100000000000000';

/** Minimum deposit for FT/NFT transfers (1 yoctoNEAR for security). */
export const MIN_TRANSFER_DEPOSIT = '1';

/**
 * Build a NEAR function call transaction body for wallet submission.
 */
export function buildNearFunctionCall(
  contractId: string,
  methodName: string,
  args: Record<string, unknown> = {},
  gas: string = DEFAULT_NEAR_GAS,
  deposit: string = '0',
): { type: string; params: Record<string, unknown> } {
  return {
    type: 'FunctionCall',
    params: {
      methodName,
      args,
      gas: BigInt(gas).toString(),
      deposit: BigInt(deposit).toString(),
    },
  };
}

/**
 * Build a NEAR transfer action for wallet submission.
 */
export function buildNearTransfer(
  amount: string | bigint,
): { type: string; params: Record<string, unknown> } {
  return {
    type: 'Transfer',
    params: {
      deposit: BigInt(amount).toString(),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  NEP-141 FT helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Build an FT transfer function call action.
 */
export function buildFtTransferCall(params: NearFtTransfer): NearAction {
  const args: Record<string, unknown> = {
    receiver_id: params.receiverId,
    amount: params.amount,
  };
  if (params.memo) args.memo = params.memo;

  return {
    kind: ActionKind.FunctionCall,
    params: {
      methodName: 'ft_transfer',
      args: JSON.stringify(args),
      gas: params.gas ?? DEFAULT_FT_GAS,
      deposit: params.deposit ?? MIN_TRANSFER_DEPOSIT,
    },
  };
}

/**
 * Build an FT transfer call with callback (for advanced flows).
 */
export function buildFtTransferCallWithCallback(params: NearFtTransfer & {
  memo?: string;
  callbackContract?: string;
}): NearAction {
  const args: Record<string, unknown> = {
    receiver_id: params.receiverId,
    amount: params.amount,
  };
  if (params.memo) args.memo = params.memo;
  if (params.callbackContract) {
    args.msg = JSON.stringify({ callback: true, contract: params.callbackContract });
  }

  return {
    kind: ActionKind.FunctionCall,
    params: {
      methodName: 'ft_transfer_call',
      args: JSON.stringify(args),
      gas: params.gas ?? DEFAULT_FT_GAS,
      deposit: params.deposit ?? MIN_TRANSFER_DEPOSIT,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  NEP-171 NFT helpers                                                */
/* ------------------------------------------------------------------ */

/**
 * Build an NFT transfer function call action.
 */
export function buildNftTransferCall(params: NearNftTransfer): NearAction {
  const args: Record<string, unknown> = {
    receiver_id: params.receiverId,
    token_id: params.tokenId,
  };
  if (params.memo) args.memo = params.memo;

  return {
    kind: ActionKind.FunctionCall,
    params: {
      methodName: 'nft_transfer',
      args: JSON.stringify(args),
      gas: params.gas ?? DEFAULT_NFT_GAS,
      deposit: params.deposit ?? MIN_TRANSFER_DEPOSIT,
    },
  };
}

/**
 * Build an NFT mint function call action.
 */
export function buildNftMintCall(params: NearNftMint): NearAction {
  const args: Record<string, unknown> = {
    token_id: params.tokenId,
    metadata: params.metadata,
  };
  if (params.receiverId) {
    args.receiver_id = params.receiverId;
  }

  return {
    kind: ActionKind.FunctionCall,
    params: {
      methodName: 'nft_mint',
      args: JSON.stringify(args),
      gas: params.gas ?? DEFAULT_NFT_GAS,
      deposit: params.deposit,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  NearChainAdapter                                                    */
/* ------------------------------------------------------------------ */

/**
 * NEAR chain adapter implementing chain-specific operations.
 *
 * Wraps NEAR wallet providers with NEAR Protocol operations:
 * - Native NEAR balance queries (yoctoNEAR)
 * - NEAR transfers between accounts
 * - Smart contract function calls
 * - NEP-141 fungible token operations
 * - NEP-171 NFT operations
 * - NEP-413 message signing
 * - Account model queries
 */
export class NearChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'near-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'NEAR Chain Adapter';

  private provider: NearWalletProvider | null = null;
  private chains: Chain[] = [];
  private currentChain: Chain = NEAR_CHAINS[0];
  private rpcUrl: string = NEAR_CHAINS[0].rpcUrl;
  private _accounts: string[] = [];
  private _rpcClient: NearRpcClient | null = null;
  private _connector: Connector | null = null;

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. */
  setConnector(connector: Connector): void {
    this._connector = connector;
  }

  /** Register supported NEAR chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains.length > 0 ? chains : [...NEAR_CHAINS];
    this.currentChain = this.chains[0];
    this.rpcUrl = this.currentChain.rpcUrl;
    this._rpcClient = null;
  }

  /** Find a chain by numeric ID (returns first chain for compatibility). */
  findChain(_chainId: number): Chain | undefined {
    return this.chains.length > 0 ? this.chains[0] : NEAR_CHAINS[0];
  }

  /** Set the active wallet provider. */
  setProvider(provider: NearWalletProvider): void {
    this.provider = provider;
  }

  /** Get the current provider. */
  getProvider(): NearWalletProvider | null {
    return this.provider;
  }

  /** Get the RPC client (lazy-init). */
  private _getRpcClient(): NearRpcClient {
    if (!this._rpcClient) {
      this._rpcClient = new NearRpcClient(this.rpcUrl);
    }
    return this._rpcClient;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a NEAR wallet.
   * Tries NEAR Wallet Selector → MyNearWallet → Meteor → Here → Sender.
   * @param walletId - Optional wallet ID to prefer.
   * @returns Array of connected account IDs.
   */
  async connect(walletId?: string): Promise<string[]> {
    const target = this._resolveWallet(walletId);
    if (!target) {
      throw new Error(
        'No NEAR wallet found. Install MyNearWallet, Meteor Wallet, Here Wallet, or Sender.',
      );
    }

    this.provider = target;

    const accounts = await this.provider.signIn();
    this._accounts = accounts.map((a) => normalizeNearAccount(a.accountId));

    return this._accounts;
  }

  /** Disconnect from the wallet. */
  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.signOut();
      } catch {
        // Some wallets may not implement signOut
      }
    }
    this.provider = null;
    this._accounts = [];
  }

  /** Get the connected account ID. */
  getAddress(): string | null {
    return this._accounts[0] ?? null;
  }

  /** Get connected account addresses. Required by ChainAdapter interface. */
  async getAccounts(): Promise<string[]> {
    if (!this.provider) throw new Error('Not connected');

    // Refresh accounts from provider
    try {
      const accounts = await this.provider.getAccounts();
      this._accounts = accounts.map((a) => normalizeNearAccount(a.accountId));
    } catch {
      // Use cached accounts
    }

    return [...this._accounts];
  }

  /** Check if the wallet is signed in. */
  async isSignedIn(): Promise<boolean> {
    if (!this.provider) return false;
    const result = this.provider.isSignedIn();
    return typeof result === 'boolean' ? result : await result;
  }

  /* ---- Chain ID ---- */

  /**
   * Get the current chain ID as a string.
   * @returns Chain ID string (e.g., 'near:mainnet').
   */
  async getChainId(): Promise<string> {
    return this.currentChain.id;
  }

  /** Get numeric chain ID (hash of string ID for compatibility). */
  getChainIdNumeric(): number {
    let hash = 0;
    for (let i = 0; i < this.currentChain.id.length; i++) {
      hash = ((hash << 5) - hash) + this.currentChain.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /** Get the on-chain chain ID from RPC. */
  async getOnChainChainId(): Promise<string> {
    return this._getRpcClient().getChainId();
  }

  /* ---- Balance ---- */

  /**
   * Get NEAR balance for an account.
   * @param accountId - NEAR account ID.
   * @returns Balance in yoctoNEAR (smallest unit, as string).
   */
  async getBalance(accountId: string): Promise<string> {
    const normalized = normalizeNearAccount(accountId);
    if (!isValidNearAccount(normalized)) {
      throw new Error(`Invalid NEAR account: ${accountId}`);
    }

    try {
      return await this._getRpcClient().getBalance(normalized);
    } catch {
      return '0';
    }
  }

  /**
   * Get formatted NEAR balance (decimal string).
   * @param accountId - NEAR account ID.
   * @returns Balance in NEAR (e.g., "12.345678901234567890123456").
   */
  async getBalanceFormatted(accountId: string): Promise<string> {
    const raw = await this.getBalance(accountId);
    return formatNearBalance(raw);
  }

  /**
   * Get full account info including balance, storage, code hash.
   * @param accountId - NEAR account ID.
   * @returns NearAccountInfo or null.
   */
  async getAccountInfo(accountId: string): Promise<NearAccountInfo | null> {
    const normalized = normalizeNearAccount(accountId);
    if (!isValidNearAccount(normalized)) {
      throw new Error(`Invalid NEAR account: ${accountId}`);
    }

    try {
      return await this._getRpcClient().viewAccount(normalized);
    } catch {
      return null;
    }
  }

  /**
   * Get access keys for an account.
   * @param accountId - NEAR account ID.
   * @returns Array of access key info.
   */
  async getAccessKeys(accountId: string): Promise<
    { publicKey: string; nonce: number; permission: string }[]
  > {
    const normalized = normalizeNearAccount(accountId);
    try {
      const result = await this._getRpcClient().viewAccessKeys(normalized);
      return result.keys.map((k) => ({
        publicKey: k.public_key,
        nonce: k.access_key.nonce,
        permission: typeof k.access_key.permission === 'string'
          ? k.access_key.permission
          : JSON.stringify(k.access_key.permission),
      }));
    } catch {
      return [];
    }
  }

  /* ---- Transactions ---- */

  /**
   * Send a transaction via the connected wallet.
   * @param tx - NearTransactionRequest or raw transaction data.
   * @returns Transaction hash (base58).
   */
  async sendTransaction(tx: NearTransactionRequest | string | Uint8Array): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    // If it's a pre-encoded transaction, try to send it
    if (typeof tx === 'string' || tx instanceof Uint8Array) {
      const encoded = typeof tx === 'string' ? tx : btoa(String.fromCharCode(...tx));
      try {
        const result = await this._getRpcClient().broadcastTx(encoded);
        return result.transaction.hash;
      } catch {
        // Fall through to wallet-based sending
      }
    }

    const nearTx = tx as NearTransactionRequest;
    if (!nearTx.receiverId || !nearTx.actions) {
      throw new Error('Invalid transaction: receiverId and actions required');
    }

    // Normalize receiver
    nearTx.receiverId = normalizeNearAccount(nearTx.receiverId);

    // Build actions for wallet
    const actions = nearTx.actions.map((action) => {
      switch (action.kind) {
        case ActionKind.Transfer:
          return {
            type: 'Transfer',
            params: {
              deposit: (action.params.deposit as string) ?? '0',
            },
          };
        case ActionKind.FunctionCall:
          return {
            type: 'FunctionCall',
            params: {
              methodName: action.params.methodName as string,
              args: typeof action.params.args === 'string'
                ? JSON.parse(action.params.args as string)
                : (action.params.args as Record<string, unknown>),
              gas: BigInt(action.params.gas as string).toString(),
              deposit: BigInt(action.params.deposit as string).toString(),
            },
          };
        case ActionKind.CreateAccount:
          return { type: 'CreateAccount', params: {} };
        case ActionKind.AddKey:
          return { type: 'AddKey', params: action.params };
        case ActionKind.DeleteKey:
          return { type: 'DeleteKey', params: action.params };
        default:
          return { type: 'Unknown', params: action.params };
      }
    });

    const result = await this.provider.signAndSendTransaction({
      signerId: this.getAddress() ?? undefined,
      receiverId: nearTx.receiverId,
      actions,
    });

    return result.transactionHash ?? result.transaction.hash;
  }

  /**
   * Send NEAR tokens to another account.
   * @param to - Recipient account ID.
   * @param amount - Amount in yoctoNEAR.
   * @returns Transaction hash.
   */
  async transferNear(to: string, amount: string | bigint): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const normalizedTo = normalizeNearAccount(to);
    if (!isValidNearAccount(normalizedTo)) {
      throw new Error(`Invalid recipient account: ${to}`);
    }

    return this.sendTransaction({
      receiverId: normalizedTo,
      actions: [createTransferAction(amount)],
    });
  }

  /**
   * Call a function on a NEAR smart contract.
   * @param params - Function call parameters.
   * @returns Transaction hash.
   */
  async callContract(params: NearFunctionCall): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const contractId = normalizeNearAccount(params.contractId);
    if (!isValidNearAccount(contractId)) {
      throw new Error(`Invalid contract account: ${params.contractId}`);
    }

    return this.sendTransaction({
      receiverId: contractId,
      actions: [createFunctionCallAction(
        params.methodName,
        params.args ?? {},
        params.gas ?? DEFAULT_NEAR_GAS,
        params.deposit ?? '0',
      )],
    });
  }

  /**
   * Call a contract view method (read-only, no transaction).
   * @param contractId - Contract account ID.
   * @param methodName - Method name.
   * @param args - Method arguments.
   * @returns Decoded result.
   */
  async viewContract(
    contractId: string,
    methodName: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    const normalized = normalizeNearAccount(contractId);
    if (!isValidNearAccount(normalized)) {
      throw new Error(`Invalid contract account: ${contractId}`);
    }

    const result = await this._getRpcClient().viewCall(normalized, methodName, args);
    // Decode base64 result
    try {
      const decoded = atob((result as any).result ?? '');
      return JSON.parse(decoded);
    } catch {
      return (result as any).result ?? null;
    }
  }

  /* ---- NEP-141 Fungible Token Operations ---- */

  /**
   * Transfer fungible tokens (NEP-141).
   * @param params - FT transfer parameters.
   * @returns Transaction hash.
   */
  async ftTransfer(params: NearFtTransfer): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const contractId = normalizeNearAccount(params.contractId);
    const receiverId = normalizeNearAccount(params.receiverId);

    if (!isValidNearAccount(contractId)) {
      throw new Error(`Invalid FT contract: ${params.contractId}`);
    }
    if (!isValidNearAccount(receiverId)) {
      throw new Error(`Invalid recipient: ${params.receiverId}`);
    }

    return this.sendTransaction({
      receiverId: contractId,
      actions: [buildFtTransferCall({ ...params, receiverId })],
    });
  }

  /**
   * Get FT balance for an account (NEP-141).
   * @param contractId - FT contract account ID.
   * @param accountId - Account to query.
   * @returns Balance as string in token's smallest unit.
   */
  async ftBalanceOf(contractId: string, accountId: string): Promise<string> {
    const normalizedContract = normalizeNearAccount(contractId);
    const normalizedAccount = normalizeNearAccount(accountId);

    const result = await this.viewContract(normalizedContract, 'ft_balance_of', {
      account_id: normalizedAccount,
    });
    return String(result ?? '0');
  }

  /**
   * Get FT metadata (NEP-141).
   * @param contractId - FT contract account ID.
   * @returns FT metadata.
   */
  async ftMetadata(contractId: string): Promise<NearFtMetadata> {
    const normalized = normalizeNearAccount(contractId);

    const result = await this.viewContract(normalized, 'ft_metadata', {});
    return result as NearFtMetadata;
  }

  /**
   * Get FT supply (NEP-141).
   * @param contractId - FT contract account ID.
   * @returns Total supply as string.
   */
  async ftTotalSupply(contractId: string): Promise<string> {
    const normalized = normalizeNearAccount(contractId);

    const result = await this.viewContract(normalized, 'ft_total_supply', {});
    return String(result ?? '0');
  }

  /* ---- NEP-171 NFT Operations ---- */

  /**
   * Transfer an NFT (NEP-171).
   * @param params - NFT transfer parameters.
   * @returns Transaction hash.
   */
  async nftTransfer(params: NearNftTransfer): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const contractId = normalizeNearAccount(params.contractId);
    const receiverId = normalizeNearAccount(params.receiverId);

    if (!isValidNearAccount(contractId)) {
      throw new Error(`Invalid NFT contract: ${params.contractId}`);
    }
    if (!isValidNearAccount(receiverId)) {
      throw new Error(`Invalid recipient: ${params.receiverId}`);
    }

    return this.sendTransaction({
      receiverId: contractId,
      actions: [buildNftTransferCall({ ...params, receiverId })],
    });
  }

  /**
   * Mint an NFT (NEP-171).
   * @param params - NFT mint parameters.
   * @returns Transaction hash.
   */
  async nftMint(params: NearNftMint): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const contractId = normalizeNearAccount(params.contractId);
    if (!isValidNearAccount(contractId)) {
      throw new Error(`Invalid NFT contract: ${params.contractId}`);
    }

    return this.sendTransaction({
      receiverId: contractId,
      actions: [buildNftMintCall(params)],
    });
  }

  /**
   * Get NFT token info (NEP-171).
   * @param contractId - NFT contract account ID.
   * @param tokenId - Token ID.
   * @returns NFT token info.
   */
  async nftToken(contractId: string, tokenId: string): Promise<NearNftToken> {
    const normalized = normalizeNearAccount(contractId);

    const result = await this.viewContract(normalized, 'nft_token', {
      token_id: tokenId,
    });
    return result as NearNftToken;
  }

  /**
   * Get NFT metadata for the contract (NEP-171).
   * @param contractId - NFT contract account ID.
   * @returns NFT contract metadata.
   */
  async nftMetadata(contractId: string): Promise<Record<string, unknown>> {
    const normalized = normalizeNearAccount(contractId);

    const result = await this.viewContract(normalized, 'nft_metadata', {});
    return result as Record<string, unknown>;
  }

  /**
   * Get NFT tokens owned by an account (NEP-171).
   * @param contractId - NFT contract account ID.
   * @param accountId - Owner account ID.
   * @param limit - Max tokens to return.
   * @returns Array of token IDs.
   */
  async nftTokensForOwner(
    contractId: string,
    accountId: string,
    limit: number = 50,
  ): Promise<string[]> {
    const normalizedContract = normalizeNearAccount(contractId);
    const normalizedAccount = normalizeNearAccount(accountId);

    const result = await this.viewContract(normalizedContract, 'nft_tokens_for_owner_set', {
      account_id: normalizedAccount,
    });

    // Some contracts use nft_tokens_for_owner instead
    if (Array.isArray(result)) {
      return result.map((t) => String((t as any).token_id ?? t)).slice(0, limit);
    }

    // Fallback: try nft_tokens_for_owner with pagination
    try {
      const tokens = await this.viewContract(normalizedContract, 'nft_tokens_for_owner', {
        account_id: normalizedAccount,
        limit,
      });
      if (Array.isArray(tokens)) {
        return tokens.map((t) => String((t as any).token_id ?? t));
      }
    } catch {
      // Ignore
    }

    return [];
  }

  /**
   * Get number of NFTs owned by an account.
   * @param contractId - NFT contract account ID.
   * @param accountId - Owner account ID.
   * @returns Number of tokens.
   */
  async nftBalance(contractId: string, accountId: string): Promise<number> {
    const normalizedContract = normalizeNearAccount(contractId);
    const normalizedAccount = normalizeNearAccount(accountId);

    try {
      const result = await this.viewContract(normalizedContract, 'nft_balance_of', {
        account_id: normalizedAccount,
      });
      return parseInt(String(result), 10) || 0;
    } catch {
      return 0;
    }
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a message using NEP-413 (NEAR standard for off-chain signing).
   * @param message - Message to sign.
   * @param recipient - Optional recipient (for signed messages).
   * @returns Signature object with signature and public key.
   */
  async signMessage(
    message: string,
    recipient?: string,
  ): Promise<{
    signature: string;
    publicKey: string;
    accountId: string;
  }> {
    if (!this.provider) throw new Error('No provider connected');

    const from = this.getAddress();
    if (!from) throw new Error('No connected account');

    if (!this.provider.signMessage) {
      throw new Error('Connected wallet does not support message signing');
    }

    // Generate a random nonce (32 bytes)
    const nonce = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(nonce);
    } else {
      for (let i = 0; i < 32; i++) nonce[i] = Math.floor(Math.random() * 256);
    }

    const result = await this.provider.signMessage({
      message,
      recipient: recipient ?? from,
      nonce,
    });

    return {
      signature: result.signature,
      publicKey: result.publicKey,
      accountId: result.accountId,
    };
  }

  /**
   * Sign a transaction (returns signed data without broadcasting).
   * @param tx - NearTransactionRequest.
   * @returns Signed transaction data.
   */
  async signTransaction(tx: NearTransactionRequest): Promise<NearSignedTransaction> {
    if (!this.provider) throw new Error('No provider connected');
    if (!this.provider.signTransaction) {
      throw new Error('Connected wallet does not support raw transaction signing');
    }

    const normalizedR = normalizeNearAccount(tx.receiverId);
    const actions = tx.actions.map((action) => {
      switch (action.kind) {
        case ActionKind.Transfer:
          return { type: 'Transfer', params: { deposit: (action.params.deposit as string) ?? '0' } };
        case ActionKind.FunctionCall:
          return {
            type: 'FunctionCall',
            params: {
              methodName: action.params.methodName as string,
              args: typeof action.params.args === 'string'
                ? JSON.parse(action.params.args as string)
                : (action.params.args as Record<string, unknown>),
              gas: BigInt(action.params.gas as string).toString(),
              deposit: BigInt(action.params.deposit as string).toString(),
            },
          };
        default:
          return { type: 'Unknown', params: action.params };
      }
    });

    const result = await this.provider.signTransaction({
      signerId: this.getAddress() ?? undefined,
      receiverId: normalizedR,
      actions,
    });

    // Compute transaction hash from signature + data
    const rawTx = new TextEncoder().encode(JSON.stringify({
      signerId: this.getAddress(),
      receiverId: normalizedR,
      actions,
      signature: result.signature,
      publicKey: result.publicKey,
    }));

    const hash = await sha256(rawTx);

    return {
      transactionHash: base58Encode(hash),
      encoded: btoa(String.fromCharCode(...rawTx)),
      rawBytes: rawTx,
    };
  }

  /* ---- Block and Network Info ---- */

  /**
   * Get the latest block info.
   * @returns Block height and hash.
   */
  async getLatestBlock(): Promise<{ height: number; hash: string }> {
    return this._getRpcClient().getLatestBlockHash();
  }

  /**
   * Get the current gas price.
   * @returns Gas price in yoctoNEAR.
   */
  async getGasPrice(): Promise<string> {
    const result = await this._getRpcClient().getGasPrice();
    return result.gas_price;
  }

  /**
   * Get network status.
   */
  async getNetworkStatus(): Promise<{
    chainId: string;
    latestBlockHash: string;
    latestBlockHeight: number;
  }> {
    const status = await this._getRpcClient().getStatus();
    return {
      chainId: status.chain_id,
      latestBlockHash: status.latest_block_hash,
      latestBlockHeight: status.latest_block_height,
    };
  }

  /**
   * Get transaction status by hash.
   * @param txHash - Transaction hash (base58).
   * @param accountId - Account that submitted the tx.
   * @returns Transaction status info.
   */
  async getTransactionStatus(
    txHash: string,
    accountId: string,
  ): Promise<NearTransactionResponse | null> {
    try {
      const result = await this._getRpcClient().getTransactionStatus(
        txHash,
        normalizeNearAccount(accountId),
      );

      // Parse status
      let status: NearTransactionResponse['status'] = 'Unknown';
      if (result.status) {
        const s = result.status as Record<string, unknown>;
        if (s.SuccessValue !== undefined) status = 'SuccessValue';
        else if (s.Failure !== undefined) status = 'Failure';
        else if (s.pending !== undefined) status = 'Pending';
      }

      return {
        transactionHash: result.transaction.hash,
        status,
        transaction: {
          signerId: result.transaction.signer_id,
          publicKey: result.transaction.public_key,
          nonce: result.transaction.nonce,
          receiverId: result.transaction.receiver_id,
          actions: result.transaction.actions,
          signature: result.transaction.signature,
        },
        receipts: result.receipts,
      };
    } catch {
      return null;
    }
  }

  /* ---- Chain Switch ---- */

  /**
   * Switch the active chain.
   * @param chainId - Numeric chain ID (for compatibility).
   */
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
   * EIP-1193 compatible request method for NEAR.
   */
  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    switch (args.method) {
      case 'near_getBalance': {
        const accountId = (args.params?.[0] ?? '') as string;
        return this.getBalance(accountId);
      }
      case 'near_sendTransaction': {
        const tx = args.params?.[0] as NearTransactionRequest;
        return this.sendTransaction(tx);
      }
      case 'near_signMessage': {
        const msg = (args.params?.[0] ?? '') as string;
        const recipient = (args.params?.[1] as string) ?? undefined;
        return this.signMessage(msg, recipient);
      }
      case 'near_getChainId': {
        return this.getChainId();
      }
      case 'near_call': {
        const contractId = (args.params?.[0] ?? '') as string;
        const methodName = (args.params?.[1] ?? '') as string;
        const callArgs = (args.params?.[2] ?? {}) as Record<string, unknown>;
        return this.viewContract(contractId, methodName, callArgs);
      }
      case 'near_ft_balance_of': {
        const contractId = (args.params?.[0] ?? '') as string;
        const accountId = (args.params?.[1] ?? '') as string;
        return this.ftBalanceOf(contractId, accountId);
      }
      case 'near_ft_metadata': {
        const contractId = (args.params?.[0] ?? '') as string;
        return this.ftMetadata(contractId);
      }
      case 'near_ft_transfer': {
        const params = args.params?.[0] as NearFtTransfer;
        return this.ftTransfer(params);
      }
      case 'near_nft_token': {
        const contractId = (args.params?.[0] ?? '') as string;
        const tokenId = (args.params?.[1] ?? '') as string;
        return this.nftToken(contractId, tokenId);
      }
      case 'near_nft_transfer': {
        const params = args.params?.[0] as NearNftTransfer;
        return this.nftTransfer(params);
      }
      case 'near_getBlock': {
        return this.getLatestBlock();
      }
      case 'near_getGasPrice': {
        return this.getGasPrice();
      }
      default:
        throw new Error(`Unsupported NEAR method: ${args.method}`);
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

  /**
   * Get formatted FT balance (with decimals).
   */
  formatFtBalance(amount: string | bigint, decimals: number): string {
    const n = BigInt(amount);
    const divisor = 10n ** BigInt(decimals);
    const intPart = n / divisor;
    const fracPart = n % divisor;
    const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
    return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
  }

  /* ---- Private: Wallet resolution ---- */

  private _resolveWallet(walletId?: string): NearWalletProvider | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as NearWindow;

    if (walletId) {
      switch (walletId) {
        case 'mynearwallet':
          return win.myNearWallet ?? win.nearWallet ?? null;
        case 'meteor':
          return win.meteorWallet ?? null;
        case 'here-wallet':
          return win.hereWallet ?? null;
        case 'sender':
          return win.nearSender ?? null;
        case 'wallet-selector':
          return win.near?.wallet() ?? null;
        default:
          // Try wallet selector first
          if (win.near?.wallet()) return win.near.wallet();
          return win.nearWallet ?? win.meteorWallet ?? win.hereWallet ?? win.nearSender ?? null;
      }
    }

    // Auto-detect: Wallet Selector → MyNearWallet → Meteor → Here → Sender
    if (win.near?.wallet()) return win.near.wallet();
    if (win.nearWallet) return win.nearWallet;
    if (win.meteorWallet) return win.meteorWallet;
    if (win.hereWallet) return win.hereWallet;
    if (win.nearSender) return win.nearSender;

    return null;
  }
}
