/**
 * XRPL (XRP Ledger) Chain Adapter — provides XRPL-specific operations.
 *
 * Uses XRPL JSON-RPC (rippled) for on-chain queries and supports
 * multiple wallet standards (Xaman, Ledger, Xpring, etc.) for signing.
 *
 * Features:
 * - Native XRP balance queries and transfers
 * - Issued currencies (IOU tokens) with trust lines
 * - DEX offers (create, cancel, fill)
 * - NFT support (XLS-20: mint, transfer, burn)
 * - Account info and transaction history
 * - XRPL binary serialization helpers
 * - Classic address and X-address support
 */

import type { Connector } from '../connector.js';
import type { Chain } from '../types.js';

/* ------------------------------------------------------------------ */
/*  XRPL Address Encoding                                               */
/* ------------------------------------------------------------------ */

/** XRPL classic address prefix (base58). */
const XRPL_CLASSIC_PREFIX = 'r';

/** Base58 alphabet (XRPL uses standard Bitcoin alphabet). */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Validate an XRPL classic address.
 * Must start with 'r', be 25-35 chars, base58.
 */
export function isValidXrplAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (!address.startsWith('r')) return false;
  if (address.length < 25 || address.length > 35) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * Validate an XRPL X-address.
 * X-addresses start with 'X' (mainnet) or 'T' (testnet).
 */
export function isValidXAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (address.length < 44 || address.length > 52) return false;
  if (!address.startsWith('X') && !address.startsWith('T')) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * Normalize an XRPL address to uppercase (XRPL addresses are case-insensitive
 * but canonical form is uppercase).
 */
export function normalizeXrplAddress(address: string): string {
  return address.toUpperCase();
}

/**
 * Validate any XRPL address format (classic or X-address).
 */
export function isValidAnyXrplAddress(address: string): boolean {
  return isValidXrplAddress(address) || isValidXAddress(address);
}

/** Encode bytes to base58. */
export function bytesToBase58(bytes: Uint8Array): string {
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

/* ------------------------------------------------------------------ */
/*  XRPL Binary Serialization                                           */
/* ------------------------------------------------------------------ */

/** XRPL field type codes. */
export enum XrplFieldType {
  UInt16 = 1,
  UInt32 = 2,
  UInt64 = 3,
  Hash128 = 4,
  Hash160 = 5,
  Hash256 = 6,
  Amount = 6,
  Blob = 7,
  AccountID = 8,
  STObject = 14,
  STArray = 15,
  UInt8 = 16,
  Hash160Vec = 17,
  Vector256 = 19,
  UInt96 = 20,
  UInt192 = 21,
  UInt384 = 22,
  UInt512 = 23,
}

/** XRPL binary writer for transaction serialization. */
export class XrplBinaryWriter {
  private data: number[] = [];
  /** Current write offset. */
  offset: number = 0;

  constructor(options?: { size?: number }) {
    if (options?.size) this.data = new Array(options.size);
  }

  /** Write a single byte (UInt8). */
  write8(value: number): this {
    this.data[this.offset++] = value & 0xff;
    return this;
  }

  /** Write a 16-bit unsigned integer (big-endian — XRPL uses big-endian). */
  write16(value: number): this {
    this.data[this.offset++] = (value >> 8) & 0xff;
    this.data[this.offset++] = value & 0xff;
    return this;
  }

  /** Write a 32-bit unsigned integer (big-endian). */
  write32(value: number): this {
    this.data[this.offset++] = (value >> 24) & 0xff;
    this.data[this.offset++] = (value >> 16) & 0xff;
    this.data[this.offset++] = (value >> 8) & 0xff;
    this.data[this.offset++] = value & 0xff;
    return this;
  }

  /** Write a 64-bit unsigned integer (big-endian, as two u32s). */
  write64(value: bigint | string): this {
    const n = BigInt(value);
    const hi = Number((n >> 32n) & 0xffffffffn);
    const lo = Number(n & 0xffffffffn);
    this.write32(hi);
    this.write32(lo);
    return this;
  }

  /** Write a variable-length-encoded integer (XRPL style). */
  writeVarUInt(value: number): this {
    if (value <= 0xef) {
      this.write8(value);
    } else if (value <= 0xffff) {
      this.write8(0xf0 | ((value >> 8) & 0x0f));
      this.write8(value & 0xff);
    } else {
      this.write8(0xf1);
      this.write8((value >> 8) & 0xff);
      this.write8(value & 0xff);
    }
    return this;
  }

  /** Write a raw byte array. */
  writeBytes(data: Uint8Array | number[]): this {
    for (let i = 0; i < data.length; i++) {
      this.data[this.offset++] = data[i];
    }
    return this;
  }

  /** Write a hex string as bytes. */
  writeHex(hex: string): this {
    const cleaned = hex.replace(/^0x/, '');
    for (let i = 0; i < cleaned.length; i += 2) {
      this.data[this.offset++] = parseInt(cleaned.slice(i, i + 2), 16);
    }
    return this;
  }

  /** Write an AccountID (20 bytes, base58-decoded — simplified: hex). */
  writeAccountId(hex: string): this {
    const cleaned = hex.replace(/^0x/, '').padStart(40, '0');
    for (let i = 0; i < 20; i++) {
      this.data[this.offset++] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    }
    return this;
  }

  /** Write a 256-bit hash. */
  writeHash256(hex: string): this {
    const cleaned = hex.replace(/^0x/, '').padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      this.data[this.offset++] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    }
    return this;
  }

  /** Get the serialized bytes as a Uint8Array. */
  toBytes(): Uint8Array {
    return new Uint8Array(this.data);
  }

  /** Get the serialized bytes as a hex string. */
  toHex(): string {
    return Array.from(this.toBytes())
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/** Encode an XRP amount in drops. */
export function encodeDrops(amount: string | number | bigint): string {
  return BigInt(amount).toString();
}

/** Decode drops to XRP (6 decimal places). */
export function decodeDrops(drops: string | number): string {
  const n = BigInt(drops);
  const divisor = 1_000_000n;
  const intPart = n / divisor;
  const fracPart = n % divisor;
  const fracStr = fracPart.toString().padStart(6, '0').replace(/0+$/, '');
  return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
}

/** Parse XRP amount to drops. */
export function parseXrpAmount(xrp: string): bigint {
  const parts = xrp.split('.');
  const intPart = BigInt(parts[0] || '0');
  let fracPart = 0n;
  if (parts.length > 1) {
    const frac = parts[1].padEnd(6, '0').slice(0, 6);
    fracPart = BigInt(frac);
  }
  return intPart * 1_000_000n + fracPart;
}

/* ------------------------------------------------------------------ */
/*  XRPL Transaction Types                                              */
/* ------------------------------------------------------------------ */

/** XRPL transaction type codes. */
export enum XrplTxType {
  Payment = 'Payment',
  OfferCreate = 'OfferCreate',
  OfferCancel = 'OfferCancel',
  TrustSet = 'TrustSet',
  AccountSet = 'AccountSet',
  SetRegularKey = 'SetRegularKey',
  SignerListSet = 'SignerListSet',
  EscrowCreate = 'EscrowCreate',
  EscrowFinish = 'EscrowFinish',
  EscrowCancel = 'EscrowCancel',
  PaymentChannelCreate = 'PaymentChannelCreate',
  PaymentChannelFund = 'PaymentChannelFund',
  PaymentChannelClaim = 'PaymentChannelClaim',
  CheckCreate = 'CheckCreate',
  CheckCash = 'CheckCash',
  CheckCancel = 'CheckCancel',
  NFTokenMint = 'NFTokenMint',
  NFTokenBurn = 'NFTokenBurn',
  NFTokenCreateOffer = 'NFTokenCreateOffer',
  NFTokenCancelOffer = 'NFTokenCancelOffer',
  NFTokenAcceptOffer = 'NFTokenAcceptOffer',
  DepositPreauth = 'DepositPreauth',
  Clawback = 'Clawback',
}

/* ------------------------------------------------------------------ */
/*  XRPL Data Types                                                     */
/* ------------------------------------------------------------------ */

/** XRPL account balance (native XRP). */
export interface XrplAccountBalance {
  /** Balance in drops (string for large numbers). */
  balance: string;
  /** Account address. */
  address: string;
  /** Ledger index where balance was queried. */
  ledgerIndex: number;
  /** Owner count (number of objects owned). */
  ownerCount: number;
  /** Account reserve requirement in drops. */
  reserve: string;
  /** Whether account exists on ledger. */
  exists: boolean;
}

/** XRPL account info response. */
export interface XrplAccountInfo {
  /** Account address. */
  address: string;
  /** XRP balance in drops. */
  balance: string;
  /** Current sequence number. */
  sequence: number;
  /** Owner count. */
  ownerCount: number;
  /** Ledger index of this account info. */
  ledgerIndex: number;
  /** Previous sequence. */
  previousAffectingTransactionID?: string;
  /** Regular key (if set). */
  regularKey?: string;
  /** Account flags. */
  flags: number;
  /** Signer list (if set). */
  signerList?: unknown;
}

/** XRPL trust line (issued currency). */
export interface XrplTrustLine {
  /** Account balance of the issued currency. */
  balance: string;
  /** Currency code (e.g., 'USD', 'EUR', or 40-char hex). */
  currency: string;
  /** Limit set by the account. */
  limit: string;
  /** Limit set by the counterparty. */
  limitPeer: string;
  /** Quality in. */
  qualityIn: number;
  /** Quality out. */
  qualityOut: number;
  /** Trust line is authorized. */
  authorized: boolean;
  /** Trust line is frozen. */
  frozen: boolean;
}

/** XRPL issued currency amount. */
export interface XrplIssuedAmount {
  /** Currency code. */
  currency: string;
  /** Issuer address. */
  issuer: string;
  /** Value as string (can be scientific notation). */
  value: string;
}

/** XRPL DEX offer. */
export interface XrplOffer {
  /** Offer sequence number. */
  seq: number;
  /** Taker gets amount. */
  takerGets: string | XrplIssuedAmount;
  /** Taker pays amount. */
  takerPays: string | XrplIssuedAmount;
  /** Quality (price ratio). */
  quality: string;
  /** Expiration (ledger close time, optional). */
  expiration?: number;
}

/** XRPL NFT (XLS-20). */
export interface XrplNft {
  /** NFT ID (64-char hex). */
  nftId: string;
  /** NFT taxon (0-255). */
  nftTaxon: number;
  /** NFT transfer fee (0-50000). */
  nftTransferFee?: number;
  /** URI (hex-encoded). */
  nftUri?: string;
  /** Owner (if known). */
  owner?: string;
  /** Minted ledger index. */
  ledgerIndex?: number;
}

/** XRPL NFT offer (XLS-20). */
export interface XrplNftOffer {
  /** Offer index. */
  index: string;
  /** Owner. */
  owner: string;
  /** NFT ID. */
  nftId: string;
  /** Amount (XRP drops or issued amount). */
  amount: string | XrplIssuedAmount;
  /** Destination (if sell offer). */
  destination?: string;
  /** Expiration. */
  expiration?: number;
  /** Whether this is a buy offer. */
  isBuyOffer: boolean;
}

/** XRPL transaction response. */
export interface XrplTransactionResponse {
  /** Transaction hash. */
  hash: string;
  /** Transaction type. */
  txType?: string;
  /** Status: tesSUCCESS or error code. */
  status: string;
  /** Ledger index. */
  ledgerIndex?: number;
  /** Fee paid in drops. */
  fee?: string;
  /** Transaction metadata. */
  meta?: unknown;
  /** Date (ripple epoch seconds). */
  date?: number;
}

/** XRPL fee estimate. */
export interface XrplFeeEstimate {
  /** Open ledger fee in drops. */
  openLedgerFee: string;
  /** Minimum fee in drops. */
  minimumFee: string;
  /** Median fee in drops. */
  medianFee: string;
  /** Fee levels. */
  levels: {
    minimum: number;
    openLedger: number;
  };
}

/** XRPL transaction request for sendTransaction. */
export interface XrplTransactionRequest {
  /** Transaction type. */
  TransactionType: string;
  /** Source account. */
  Account: string;
  /** Fee in drops. */
  Fee: string;
  /** Sequence number. */
  Sequence: number;
  /** Destination (for Payment). */
  Destination?: string;
  /** Amount (for Payment). */
  Amount?: string | XrplIssuedAmount;
  /** Flags. */
  Flags?: number;
  /** LastLedgerSequence (to prevent stranded transactions). */
  LastLedgerSequence?: number;
  /** Memos. */
  Memos?: Array<{ Memo: { MemoData?: string; MemoType?: string; MemoFormat?: string } }>;
  /** Additional fields. */
  [key: string]: unknown;
}

/** XRPL wallet provider (Xaman/wallet-style interface). */
export interface XrplWalletProvider {
  /** Wallet name. */
  name?: string;

  /** Get connected accounts. */
  getAccounts(): Promise<{ address: string }[]>;

  /** Connect the wallet. */
  connect(params?: Record<string, unknown>): Promise<{ accounts: { address: string }[] }>;

  /** Disconnect. */
  disconnect(): Promise<void>;

  /** Sign a transaction (returns blob and signature). */
  signTransaction?(tx: Record<string, unknown>): Promise<{
    tx_blob: string;
    hash: string;
  }>;

  /** Sign a message. */
  signMessage?(message: string): Promise<{
    signature: string;
    message: string;
  }>;

  /** Sign and submit a transaction. */
  signAndSubmit?(tx: Record<string, unknown>): Promise<{
    hash: string;
    result?: Record<string, unknown>;
  }>;

  /** EIP-1193 style request. */
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;

  /** Account change listener. */
  on?(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
}

/* ------------------------------------------------------------------ */
/*  Supported XRPL wallets                                              */
/* ------------------------------------------------------------------ */

export interface XrplWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  downloadUrl: string;
}

export const XRPL_WALLETS: XrplWalletInfo[] = [
  {
    id: 'xaman',
    name: 'Xaman (formerly XUMM)',
    rdns: 'app.xaman.xrpl',
    icon: 'https://xaman.app/favicon.ico',
    downloadUrl: 'https://xaman.app',
  },
  {
    id: 'ledger',
    name: 'Ledger',
    rdns: 'com.ledger.xrpl',
    icon: 'https://www.ledger.com/favicon.ico',
    downloadUrl: 'https://www.ledger.com/ledger-live',
  },
  {
    id: 'xpring',
    name: 'Xpring Wallet',
    rdns: 'io.xpring.xrpl',
    icon: 'https://xpring.io/favicon.ico',
    downloadUrl: 'https://xpring.io',
  },
  {
    id: 'toast',
    name: 'Toast Wallet',
    rdns: 'com.toast.xrpl',
    icon: 'https://toastwallet.com/favicon.ico',
    downloadUrl: 'https://toastwallet.com',
  },
  {
    id: 'gemwallet',
    name: 'GemWallet',
    rdns: 'io.gemwallet.xrpl',
    icon: 'https://gemwallet.app/favicon.ico',
    downloadUrl: 'https://gemwallet.app',
  },
];

/** Well-known XRPL chain presets. */
export const XRPL_CHAINS: Chain[] = [
  {
    id: 'xrpl:mainnet',
    name: 'XRP Ledger Mainnet',
    rpcUrl: 'https://s1.ripple.com:51234',
    nativeCurrency: { name: 'XRP', symbol: 'XRP', decimals: 6 },
    explorerUrl: 'https://livenet.xrpl.org',
    iconUrl: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg',
  },
  {
    id: 'xrpl:testnet',
    name: 'XRP Ledger Testnet',
    rpcUrl: 'https://s.altnet.rippletest.net:51234',
    nativeCurrency: { name: 'Testnet XRP', symbol: 'TST', decimals: 6 },
    explorerUrl: 'https://testnet.xrpl.org',
    iconUrl: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg',
  },
  {
    id: 'xrpl:devnet',
    name: 'XRP Ledger Devnet',
    rpcUrl: 'https://s.devnet.rippletest.net:51234',
    nativeCurrency: { name: 'Devnet XRP', symbol: 'DEV', decimals: 6 },
    explorerUrl: 'https://devnet.xrpl.org',
    iconUrl: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  XRPL JSON-RPC Client                                                */
/* ------------------------------------------------------------------ */

/** XRPL RPC response envelope. */
interface XrplRpcResponse<T> {
  result: {
    status?: string;
    error?: string;
    error_message?: string;
  } & T;
  id?: number | string;
  jsonrpc?: '2.0';
}

/** XRPL RPC client for HTTP JSON-RPC calls. */
class XrplRpcClient {
  private rpcUrl: string;
  private idCounter: number = 0;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  /** Make a JSON-RPC call to the XRPL server. */
  private async call<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const id = ++this.idCounter;
    const body = {
      method,
      params: [params],
      id,
      jsonrpc: '2.0',
    };

    const resp = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`XRPL HTTP ${resp.status}: ${resp.statusText}`);
    }

    const data = (await resp.json()) as XrplRpcResponse<T>;
    if (data.result?.status === 'error') {
      throw new Error(
        `XRPL error ${data.result.error}: ${data.result.error_message ?? 'unknown'}`,
      );
    }

    return data.result as T;
  }

  /** Get account info. */
  async getAccountInfo(account: string, ledger?: string): Promise<{
    account_data: {
      Account: string;
      Balance: string;
      Sequence: number;
      OwnerCount: number;
      Flags: number;
      RegularKey?: string;
      [key: string]: unknown;
    };
    ledger_current_index?: number;
    ledger_index?: number;
    validated?: boolean;
  }> {
    return this.call('account_info', {
      account,
      ledger: ledger ?? 'validated',
      strict: true,
    });
  }

  /** Get account balance (shortcut for account_info). */
  async getBalance(account: string): Promise<string> {
    const result = await this.getAccountInfo(account);
    return result.account_data.Balance;
  }

  /** Get account transactions. */
  async getAccountTransactions(
    account: string,
    options?: {
      ledger_index_min?: number;
      ledger_index_max?: number;
      limit?: number;
      forward?: boolean;
      binary?: boolean;
    },
  ): Promise<{
    transactions: Array<{
      tx: Record<string, unknown>;
      meta: unknown;
      hash?: string;
      ledger_index?: number;
      date?: number;
    }>;
    ledger_index_min?: number;
    ledger_index_max?: number;
    limit?: number;
  }> {
    return this.call('account_tx', {
      account,
      ledger_index_min: options?.ledger_index_min ?? -1,
      ledger_index_max: options?.ledger_index_max ?? -1,
      limit: options?.limit ?? 20,
      forward: options?.forward ?? false,
      binary: options?.binary ?? false,
    });
  }

  /** Get account offers (DEX). */
  async getAccountOffers(account: string, ledger?: string): Promise<{
    offers: Array<{
      seq: number;
      TakerGets: string | XrplIssuedAmount;
      TakerPays: string | XrplIssuedAmount;
      Flags: number;
      quality: string;
      Expiration?: number;
    }>;
    ledger_index?: number;
  }> {
    return this.call('account_offers', {
      account,
      ledger: ledger ?? 'validated',
    });
  }

  /** Get account NFTs (XLS-20). */
  async getAccountNfts(account: string, limit?: number): Promise<{
    account_nfts: Array<{
      NFTokenID: string;
      NFTokenTaxon: number;
      TransferFee?: number;
      URI?: string;
      Issuer: string;
      nft_serial?: number;
    }>;
    ledger_index?: number;
    marker?: unknown;
  }> {
    return this.call('account_nfts', {
      account,
      limit: limit ?? 50,
    });
  }

  /** Get account lines (trust lines / issued currencies). */
  async getAccountLines(account: string, peer?: string): Promise<{
    lines: Array<{
      account: string;
      balance: string;
      currency: string;
      limit: string;
      limit_peer: string;
      quality_in: number;
      quality_out: number;
      authorized?: boolean;
      peer_authorized?: boolean;
      no_ripple?: boolean;
      no_ripple_peer?: boolean;
      frozen?: boolean;
    }>;
    ledger_index?: number;
  }> {
    const params: Record<string, unknown> = { account };
    if (peer) params.peer = peer;
    return this.call('account_lines', params);
  }

  /** Get current server fee estimate. */
  async getFee(): Promise<{
    drops: {
      base_fee: string;
      median_fee: string;
      minimum_fee: string;
      open_ledger_fee: string;
    };
    levels: {
      median_level: number;
      minimum_level: number;
      open_ledger_level: number;
      reference_level: number;
    };
    current_ledger_size: string;
    current_queue_size: string;
  }> {
    return this.call('fee', {});
  }

  /** Get current ledger index. */
  async getLedger(options?: { ledger_index?: string; transactions?: boolean }): Promise<{
    ledger: {
      ledger_index: number;
      total_coins: string;
      parent_close_time: number;
      parent_hash: string;
      transactions?: unknown[];
      [key: string]: unknown;
    };
    ledger_hash: string;
    ledger_index: number;
    validated: boolean;
  }> {
    return this.call('ledger', {
      ledger_index: options?.ledger_index ?? 'validated',
      transactions: options?.transactions ?? false,
    });
  }

  /** Submit a signed transaction blob. */
  async submit(tx_blob: string): Promise<{
    engine_result: string;
    engine_result_code: number;
    engine_result_message: string;
    tx_blob: string;
    tx_json: Record<string, unknown>;
  }> {
    return this.call('submit', { tx_blob });
  }

  /** Get a transaction by hash. */
  async getTransaction(hash: string): Promise<{
    AccountTxnID?: string;
    hash: string;
    LedgerIndex?: number;
    meta: unknown;
    tx_json: Record<string, unknown>;
    validated?: boolean;
    date?: number;
  }> {
    return this.call('tx', {
      transaction: hash,
      binary: false,
    });
  }

  /** Get server info. */
  async getServerInfo(): Promise<{
    info: {
      validated_ledger: {
        age: number;
        base_fee_xrp: number;
        hash: string;
        seq: number;
      };
      server_state: string;
      [key: string]: unknown;
    };
  }> {
    return this.call('server_info', {});
  }

  /** Get a random number seed (for transaction signing). */
  async generateTxBlob(tx: Record<string, unknown>): Promise<{
    tx_blob: string;
  }> {
    return this.call('submit_multisigned', {
      tx_json: tx,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  XRPL Transaction Builder                                            */
/* ------------------------------------------------------------------ */

/** Build a Payment transaction. */
export function buildPayment(params: {
  account: string;
  destination: string;
  amount: string;
  fee?: string;
  sequence: number;
  memos?: Array<{ data?: string; type?: string; format?: string }>;
  flags?: number;
}): XrplTransactionRequest {
  const tx: XrplTransactionRequest = {
    TransactionType: XrplTxType.Payment,
    Account: normalizeXrplAddress(params.account),
    Destination: normalizeXrplAddress(params.destination),
    Amount: params.amount,
    Fee: params.fee ?? '12',
    Sequence: params.sequence,
    Flags: params.flags ?? 0,
  };

  if (params.memos && params.memos.length > 0) {
    tx.Memos = params.memos.map((m) => ({
      Memo: {
        ...(m.data ? { MemoData: m.data.toUpperCase() } : {}),
        ...(m.type ? { MemoType: m.type.toUpperCase() } : {}),
        ...(m.format ? { MemoFormat: m.format.toUpperCase() } : {}),
      },
    }));
  }

  return tx;
}

/** Build an OfferCreate transaction. */
export function buildOfferCreate(params: {
  account: string;
  takerPays: string | XrplIssuedAmount;
  takerGets: string | XrplIssuedAmount;
  fee?: string;
  sequence: number;
  expiration?: number;
  flags?: number;
}): XrplTransactionRequest {
  const tx: XrplTransactionRequest = {
    TransactionType: XrplTxType.OfferCreate,
    Account: normalizeXrplAddress(params.account),
    TakerPays: params.takerPays,
    TakerGets: params.takerGets,
    Fee: params.fee ?? '12',
    Sequence: params.sequence,
    Flags: params.flags ?? 0,
  };

  if (params.expiration) {
    tx.Expiration = params.expiration;
  }

  return tx;
}

/** Build an OfferCancel transaction. */
export function buildOfferCancel(params: {
  account: string;
  offerSequence: number;
  fee?: string;
  sequence: number;
}): XrplTransactionRequest {
  return {
    TransactionType: XrplTxType.OfferCancel,
    Account: normalizeXrplAddress(params.account),
    OfferSequence: params.offerSequence,
    Fee: params.fee ?? '12',
    Sequence: params.sequence,
  };
}

/** Build a TrustSet transaction. */
export function buildTrustSet(params: {
  account: string;
  limitAmount: XrplIssuedAmount;
  fee?: string;
  sequence: number;
  flags?: number;
}): XrplTransactionRequest {
  const tx: XrplTransactionRequest = {
    TransactionType: XrplTxType.TrustSet,
    Account: normalizeXrplAddress(params.account),
    LimitAmount: params.limitAmount,
    Fee: params.fee ?? '12',
    Sequence: params.sequence,
    Flags: params.flags ?? 0,
  };

  return tx;
}

/** Build an NFTokenMint transaction (XLS-20). */
export function buildNftMint(params: {
  account: string;
  nftTaxon: number;
  uri?: string;
  transferFee?: number;
  fee?: string;
  sequence: number;
  flags?: number;
}): XrplTransactionRequest {
  const tx: XrplTransactionRequest = {
    TransactionType: XrplTxType.NFTokenMint,
    Account: normalizeXrplAddress(params.account),
    NFTokenTaxon: params.nftTaxon,
    Fee: params.fee ?? '12',
    Sequence: params.sequence,
    Flags: params.flags ?? 0,
  };

  if (params.uri) {
    tx.URI = params.uri;
  }
  if (params.transferFee !== undefined) {
    tx.TransferFee = params.transferFee;
  }

  return tx;
}

/** Build an NFTokenBurn transaction (XLS-20). */
export function buildNftBurn(params: {
  account: string;
  nftId: string;
  fee?: string;
  sequence: number;
}): XrplTransactionRequest {
  return {
    TransactionType: XrplTxType.NFTokenBurn,
    Account: normalizeXrplAddress(params.account),
    NFTokenID: params.nftId,
    Fee: params.fee ?? '12',
    Sequence: params.sequence,
  };
}

/** Build an NFTokenCreateOffer transaction (XLS-20). */
export function buildNftCreateOffer(params: {
  account: string;
  nftId: string;
  amount: string | XrplIssuedAmount;
  destination?: string;
  fee?: string;
  sequence: number;
  flags?: number;
  expiration?: number;
}): XrplTransactionRequest {
  const tx: XrplTransactionRequest = {
    TransactionType: XrplTxType.NFTokenCreateOffer,
    Account: normalizeXrplAddress(params.account),
    NFTokenID: params.nftId,
    Amount: params.amount,
    Fee: params.fee ?? '12',
    Sequence: params.sequence,
    Flags: params.flags ?? 0,
  };

  if (params.destination) {
    tx.Destination = normalizeXrplAddress(params.destination);
  }
  if (params.expiration) {
    tx.Expiration = params.expiration;
  }

  return tx;
}

/* ------------------------------------------------------------------ */
/*  XRPLChainAdapter                                                    */
/* ------------------------------------------------------------------ */

/**
 * XRPL chain adapter implementing chain-specific operations.
 *
 * Wraps an XRPL wallet provider (Xaman, Ledger, Xpring style) with
 * XRPL JSON-RPC calls for queries and transaction submission.
 *
 * Features:
 * - Native XRP balance queries
 * - XRP payments (transfers)
 * - Issued currencies (IOU tokens) via trust lines
 * - DEX offers (create, cancel, list)
 * - NFT support (XLS-20: mint, transfer, burn, offers)
 * - Transaction building and signing
 * - Account info and history
 */
export class XrplChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'xrpl-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'XRPL Chain Adapter';

  private provider: XrplWalletProvider | null = null;
  private chains: Chain[] = [...XRPL_CHAINS];
  private currentChain: Chain = XRPL_CHAINS[0];
  private rpcUrl: string = XRPL_CHAINS[0].rpcUrl;
  private _accounts: string[] = [];
  private _rpcClient: XrplRpcClient | null = null;
  private _connector: Connector | null = null;

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. */
  setConnector(connector: Connector): void {
    this._connector = connector;
  }

  /** Register supported XRPL chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains.length > 0 ? chains : [...XRPL_CHAINS];
    this.currentChain = this.chains[0];
    this.rpcUrl = this.currentChain.rpcUrl;
    this._rpcClient = null;
  }

  /** Find a chain by numeric ID (returns first chain for compatibility). */
  findChain(_chainId: number): Chain | undefined {
    return this.chains[0];
  }

  /** Set the active wallet provider. */
  setProvider(provider: XrplWalletProvider): void {
    this.provider = provider;
  }

  /** Get the current provider. */
  getProvider(): XrplWalletProvider | null {
    return this.provider;
  }

  /** Get the RPC client (lazy-init). */
  private _getRpcClient(): XrplRpcClient {
    if (!this._rpcClient) {
      this._rpcClient = new XrplRpcClient(this.rpcUrl);
    }
    return this._rpcClient;
  }

  /* ---- Connection ---- */

  /**
   * Connect to an XRPL wallet.
   * Tries Xaman → GemWallet → Toast → Xpring in order.
   * @param walletId - Optional wallet ID to prefer.
   * @returns Array of connected addresses.
   */
  async connect(walletId?: string): Promise<string[]> {
    const target = this._resolveWallet(walletId);
    if (!target) {
      throw new Error(
        'No XRPL wallet found. Install Xaman, GemWallet, Toast, or Xpring.',
      );
    }

    this.provider = target;

    try {
      const result = await this.provider.connect();
      this._accounts = result.accounts.map((a) => normalizeXrplAddress(a.address));
    } catch {
      // Fallback: try getAccounts directly
      const accounts = await this.provider.getAccounts();
      this._accounts = accounts.map((a) => normalizeXrplAddress(a.address));
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

  /** Get the connected address. */
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
   * Get the current chain ID as a string.
   * @returns Chain ID string (e.g., 'xrpl:mainnet').
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

  /* ---- Balance ---- */

  /**
   * Get XRP balance for an address.
   * @param address - XRPL classic address (r...) or X-address.
   * @returns Balance in drops (smallest unit, as string).
   */
  async getBalance(address: string): Promise<string> {
    if (!isValidAnyXrplAddress(address)) {
      throw new Error(`Invalid XRPL address: ${address}`);
    }

    try {
      return await this._getRpcClient().getBalance(
        normalizeXrplAddress(address),
      );
    } catch {
      return '0';
    }
  }

  /**
   * Get formatted XRP balance (decimal string with 6 decimals).
   * @param address - XRPL address.
   * @returns Balance in XRP (e.g., "12.345678").
   */
  async getBalanceFormatted(address: string): Promise<string> {
    const raw = await this.getBalance(address);
    return decodeDrops(raw);
  }

  /**
   * Get full account info including balance, sequence, owner count, etc.
   * @param address - XRPL address.
   * @returns XrplAccountInfo or null.
   */
  async getAccountInfo(address: string): Promise<XrplAccountInfo | null> {
    if (!isValidAnyXrplAddress(address)) {
      throw new Error(`Invalid XRPL address: ${address}`);
    }

    try {
      const result = await this._getRpcClient().getAccountInfo(
        normalizeXrplAddress(address),
      );

      return {
        address: result.account_data.Account,
        balance: result.account_data.Balance,
        sequence: result.account_data.Sequence,
        ownerCount: result.account_data.OwnerCount,
        flags: result.account_data.Flags,
        regularKey: result.account_data.RegularKey,
        ledgerIndex: Number(result.ledger_index ?? result.ledger_current_index ?? 0),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all trust lines (issued currencies) for an account.
   * @param address - XRPL address.
   * @param peer - Optional peer address to filter.
   * @returns Array of trust lines.
   */
  async getTrustLines(address: string, peer?: string): Promise<XrplTrustLine[]> {
    if (!isValidAnyXrplAddress(address)) {
      throw new Error(`Invalid XRPL address: ${address}`);
    }

    try {
      const result = await this._getRpcClient().getAccountLines(
        normalizeXrplAddress(address),
        peer,
      );

      return result.lines.map((line) => ({
        balance: line.balance,
        currency: line.currency,
        limit: line.limit,
        limitPeer: line.limit_peer,
        qualityIn: line.quality_in,
        qualityOut: line.quality_out,
        authorized: line.authorized ?? false,
        frozen: line.frozen ?? false,
      }));
    } catch {
      return [];
    }
  }

  /* ---- Token Balance (Issued Currencies) ---- */

  /**
   * Get balance of an issued currency (IOU token) for an address.
   * @param address - XRPL address.
   * @param currency - Currency code (e.g., 'USD', 'EUR').
   * @param issuer - Issuer address.
   * @returns Balance as string.
   */
  async getTokenBalance(
    address: string,
    currency: string,
    issuer: string,
  ): Promise<string> {
    const lines = await this.getTrustLines(
      normalizeXrplAddress(address),
      normalizeXrplAddress(issuer),
    );

    for (const line of lines) {
      if (line.currency.toUpperCase() === currency.toUpperCase()) {
        return line.balance;
      }
    }

    return '0';
  }

  /* ---- Transactions ---- */

  /**
   * Send a transaction.
   * @param tx - Transaction object, hex blob, or XrplTransactionRequest.
   * @returns Transaction hash.
   */
  async sendTransaction(tx: string | XrplTransactionRequest | Record<string, unknown>): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    // If it's a hex blob string (already signed), submit directly
    if (typeof tx === 'string' && /^[0-9A-Fa-f]+$/.test(tx)) {
      const result = await this._getRpcClient().submit(tx);
      return result.tx_json.hash as string ?? result.tx_blob;
    }

    // Otherwise, sign and submit through the wallet
    const txObj = tx as Record<string, unknown>;

    // Try signAndSubmit first (single call)
    if (this.provider.signAndSubmit) {
      try {
        const result = await this.provider.signAndSubmit(txObj);
        return result.hash;
      } catch {
        // Fall through to manual sign + submit
      }
    }

    // Manual sign + submit
    if (this.provider.signTransaction) {
      const signed = await this.provider.signTransaction(txObj);

      const result = await this._getRpcClient().submit(signed.tx_blob);
      return result.tx_json.hash as string ?? signed.hash;
    }

    // Fallback: use request method
    if (this.provider.request) {
      const result = await this.provider.request({
        method: 'xrpl_signAndSubmit',
        params: [txObj],
      });
      return (result as any)?.hash ?? (result as any)?.tx_json?.hash ?? '';
    }

    throw new Error('Connected wallet does not support transaction signing');
  }

  /**
   * Send XRP to an address.
   * @param to - Recipient address.
   * @param amount - Amount in drops (string) or XRP (string with decimals).
   * @param memo - Optional memo data.
   * @returns Transaction hash.
   */
  async sendXrp(
    to: string,
    amount: string,
    memo?: string,
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');
    if (!isValidAnyXrplAddress(to)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }

    // Resolve the amount — if it contains a decimal point, parse as XRP
    const amountInDrops = amount.includes('.')
      ? parseXrpAmount(amount).toString()
      : amount;

    const account = this.getAddress();
    if (!account) throw new Error('No connected account');

    const accountInfo = await this.getAccountInfo(account);
    if (!accountInfo) throw new Error('Could not get account info');

    const feeResult = await this._getRpcClient().getFee();
    const fee = feeResult.drops.open_ledger_fee;

    const ledgerResult = await this._getRpcClient().getLedger();
    const lastLedgerSeq = ledgerResult.ledger.ledger_index + 20;

    const tx = buildPayment({
      account,
      destination: normalizeXrplAddress(to),
      amount: amountInDrops,
      fee,
      sequence: accountInfo.sequence,
      flags: 0x80000000, // tfFullyCanonicalSig
      memos: memo ? [{ data: memo, type: 'text/plain', format: 'text/plain' }] : undefined,
    });

    tx.LastLedgerSequence = lastLedgerSeq;

    return this.sendTransaction(tx);
  }

  /**
   * Get current fee estimate.
   * @returns Fee estimates in drops.
   */
  async getFeeEstimate(): Promise<XrplFeeEstimate> {
    const feeResult = await this._getRpcClient().getFee();
    return {
      openLedgerFee: feeResult.drops.open_ledger_fee,
      minimumFee: feeResult.drops.minimum_fee,
      medianFee: feeResult.drops.median_fee,
      levels: {
        minimum: feeResult.levels.minimum_level,
        openLedger: feeResult.levels.open_ledger_level,
      },
    };
  }

  /* ---- DEX Offers ---- */

  /**
   * Get all offers for an account.
   * @param address - XRPL address.
   * @returns Array of offers.
   */
  async getOffers(address: string): Promise<XrplOffer[]> {
    if (!isValidAnyXrplAddress(address)) {
      throw new Error(`Invalid XRPL address: ${address}`);
    }

    try {
      const result = await this._getRpcClient().getAccountOffers(
        normalizeXrplAddress(address),
      );

      return result.offers.map((offer) => ({
        seq: offer.seq,
        takerGets: offer.TakerGets,
        takerPays: offer.TakerPays,
        quality: offer.quality,
        expiration: offer.Expiration,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Create a DEX offer.
   * @param takerPays - What the taker pays (you receive this).
   * @param takerGets - What the taker gets (you give this).
   * @param expiration - Optional expiration (Ripple epoch).
   * @returns Transaction hash.
   */
  async createOffer(
    takerPays: string | XrplIssuedAmount,
    takerGets: string | XrplIssuedAmount,
    expiration?: number,
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const account = this.getAddress();
    if (!account) throw new Error('No connected account');

    const accountInfo = await this.getAccountInfo(account);
    if (!accountInfo) throw new Error('Could not get account info');

    const feeResult = await this._getRpcClient().getFee();
    const ledgerResult = await this._getRpcClient().getLedger();
    const lastLedgerSeq = ledgerResult.ledger.ledger_index + 20;

    const tx = buildOfferCreate({
      account,
      takerPays,
      takerGets,
      fee: feeResult.drops.open_ledger_fee,
      sequence: accountInfo.sequence,
      flags: 0x80000000,
      expiration,
    });

    tx.LastLedgerSequence = lastLedgerSeq;

    return this.sendTransaction(tx);
  }

  /**
   * Cancel an offer by its sequence number.
   * @param offerSequence - Sequence number of the offer to cancel.
   * @returns Transaction hash.
   */
  async cancelOffer(offerSequence: number): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const account = this.getAddress();
    if (!account) throw new Error('No connected account');

    const accountInfo = await this.getAccountInfo(account);
    if (!accountInfo) throw new Error('Could not get account info');

    const feeResult = await this._getRpcClient().getFee();

    const tx = buildOfferCancel({
      account,
      offerSequence,
      fee: feeResult.drops.open_ledger_fee,
      sequence: accountInfo.sequence,
    });

    return this.sendTransaction(tx);
  }

  /**
   * Set up a trust line for an issued currency.
   * @param currency - Currency code (e.g., 'USD').
   * @param issuer - Issuer address.
   * @param limit - Maximum amount to trust.
   * @returns Transaction hash.
   */
  async createTrustLine(
    currency: string,
    issuer: string,
    limit: string,
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const account = this.getAddress();
    if (!account) throw new Error('No connected account');

    const accountInfo = await this.getAccountInfo(account);
    if (!accountInfo) throw new Error('Could not get account info');

    const feeResult = await this._getRpcClient().getFee();

    const tx = buildTrustSet({
      account,
      limitAmount: {
        currency,
        issuer: normalizeXrplAddress(issuer),
        value: limit,
      },
      fee: feeResult.drops.open_ledger_fee,
      sequence: accountInfo.sequence,
      flags: 0x80000000,
    });

    return this.sendTransaction(tx);
  }

  /* ---- NFT Support (XLS-20) ---- */

  /**
   * Get NFTs owned by an account.
   * @param address - XRPL address.
   * @param limit - Max NFTs to return.
   * @returns Array of NFTs.
   */
  async getNfts(address: string, limit: number = 50): Promise<XrplNft[]> {
    if (!isValidAnyXrplAddress(address)) {
      throw new Error(`Invalid XRPL address: ${address}`);
    }

    try {
      const result = await this._getRpcClient().getAccountNfts(
        normalizeXrplAddress(address),
        limit,
      );

      return result.account_nfts.map((nft) => ({
        nftId: nft.NFTokenID,
        nftTaxon: nft.NFTokenTaxon,
        nftTransferFee: nft.TransferFee,
        nftUri: nft.URI,
        owner: address,
        ledgerIndex: result.ledger_index,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Mint an NFT (XLS-20).
   * @param nftTaxon - NFT taxon (0-255, groups similar NFTs).
   * @param uri - Optional URI (hex-encoded).
   * @param transferFee - Optional transfer fee (0-50000, in basis points).
   * @returns Transaction hash.
   */
  async mintNft(
    nftTaxon: number,
    uri?: string,
    transferFee?: number,
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const account = this.getAddress();
    if (!account) throw new Error('No connected account');

    const accountInfo = await this.getAccountInfo(account);
    if (!accountInfo) throw new Error('Could not get account info');

    const feeResult = await this._getRpcClient().getFee();

    const tx = buildNftMint({
      account,
      nftTaxon,
      uri,
      transferFee,
      fee: feeResult.drops.open_ledger_fee,
      sequence: accountInfo.sequence,
      flags: 0x80000000,
    });

    return this.sendTransaction(tx);
  }

  /**
   * Burn an NFT (XLS-20).
   * @param nftId - NFT ID to burn.
   * @returns Transaction hash.
   */
  async burnNft(nftId: string): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const account = this.getAddress();
    if (!account) throw new Error('No connected account');

    const accountInfo = await this.getAccountInfo(account);
    if (!accountInfo) throw new Error('Could not get account info');

    const feeResult = await this._getRpcClient().getFee();

    const tx = buildNftBurn({
      account,
      nftId,
      fee: feeResult.drops.open_ledger_fee,
      sequence: accountInfo.sequence,
    });

    return this.sendTransaction(tx);
  }

  /**
   * Create an NFT offer (XLS-20).
   * @param nftId - NFT ID.
   * @param amount - Offer amount (drops for XRP, or issued amount).
   * @param destination - Optional destination (for sell offers to a specific buyer).
   * @param flags - 1 for sell offer, 2 for buy offer.
   * @param expiration - Optional expiration.
   * @returns Transaction hash.
   */
  async createNftOffer(
    nftId: string,
    amount: string | XrplIssuedAmount,
    destination?: string,
    flags: number = 1,
    expiration?: number,
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const account = this.getAddress();
    if (!account) throw new Error('No connected account');

    const accountInfo = await this.getAccountInfo(account);
    if (!accountInfo) throw new Error('Could not get account info');

    const feeResult = await this._getRpcClient().getFee();

    const tx = buildNftCreateOffer({
      account,
      nftId,
      amount,
      destination,
      fee: feeResult.drops.open_ledger_fee,
      sequence: accountInfo.sequence,
      flags: flags | 0x80000000,
      expiration,
    });

    return this.sendTransaction(tx);
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a message.
   * @param message - Message to sign.
   * @returns Signature.
   */
  async signMessage(message: string): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    if (this.provider.signMessage) {
      const result = await this.provider.signMessage(message);
      return result.signature;
    }

    if (this.provider.request) {
      const result = await this.provider.request({
        method: 'xrpl_signMessage',
        params: [this.getAddress(), message],
      });
      return (result as any)?.signature ?? result as string;
    }

    throw new Error('Connected wallet does not support message signing');
  }

  /**
   * Sign a transaction (returns signature/blob without broadcasting).
   * @param tx - Transaction object.
   * @returns Object with tx_blob and hash.
   */
  async signTransaction(
    tx: XrplTransactionRequest | Record<string, unknown>,
  ): Promise<{ tx_blob: string; hash: string }> {
    if (!this.provider) throw new Error('No provider connected');

    if (this.provider.signTransaction) {
      return this.provider.signTransaction(tx);
    }

    if (this.provider.request) {
      const result = await this.provider.request({
        method: 'xrpl_signTransaction',
        params: [tx],
      });
      return {
        tx_blob: (result as any)?.tx_blob ?? '',
        hash: (result as any)?.hash ?? '',
      };
    }

    throw new Error('Connected wallet does not support transaction signing');
  }

  /* ---- Transaction History ---- */

  /**
   * Get transaction history for an account.
   * @param address - XRPL address.
   * @param limit - Max transactions to return.
   * @returns Array of transactions.
   */
  async getTransactions(
    address: string,
    limit: number = 20,
  ): Promise<XrplTransactionResponse[]> {
    if (!isValidAnyXrplAddress(address)) {
      throw new Error(`Invalid XRPL address: ${address}`);
    }

    try {
      const result = await this._getRpcClient().getAccountTransactions(
        normalizeXrplAddress(address),
        { limit },
      );

      return result.transactions.map((t) => ({
        hash: t.hash ?? '',
        txType: (t.tx.TransactionType as string) ?? '',
        status: (t.meta as any)?.TransactionResult ?? 'unknown',
        ledgerIndex: t.ledger_index,
        fee: (t.tx.Fee as string) ?? '0',
        meta: t.meta,
        date: t.date,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get a specific transaction by hash.
   * @param hash - Transaction hash.
   * @returns Transaction details or null.
   */
  async getTransaction(hash: string): Promise<XrplTransactionResponse | null> {
    try {
      const result = await this._getRpcClient().getTransaction(hash);
      return {
        hash: result.hash,
        txType: (result.tx_json.TransactionType as string) ?? '',
        status: (result.meta as any)?.TransactionResult ?? 'unknown',
        ledgerIndex: result.LedgerIndex,
        fee: (result.tx_json.Fee as string) ?? '0',
        meta: result.meta,
        date: result.date,
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
   * EIP-1193 compatible request method for XRPL.
   */
  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    switch (args.method) {
      case 'xrpl_getBalance': {
        const address = (args.params?.[0] ?? '') as string;
        return this.getBalance(address);
      }
      case 'xrpl_sendTransaction': {
        const tx = args.params?.[0] as Record<string, unknown>;
        return this.sendTransaction(tx);
      }
      case 'xrpl_signMessage': {
        const msg = args.params?.[0] as string;
        return this.signMessage(msg);
      }
      case 'xrpl_getChainId': {
        return this.getChainId();
      }
      case 'xrpl_getAccountInfo': {
        const address = (args.params?.[0] ?? '') as string;
        return this.getAccountInfo(address);
      }
      case 'xrpl_getNfts': {
        const address = (args.params?.[0] ?? this.getAddress() ?? '') as string;
        return this.getNfts(address);
      }
      case 'xrpl_getOffers': {
        const address = (args.params?.[0] ?? this.getAddress() ?? '') as string;
        return this.getOffers(address);
      }
      case 'xrpl_getTrustLines': {
        const address = (args.params?.[0] ?? this.getAddress() ?? '') as string;
        return this.getTrustLines(address);
      }
      default:
        throw new Error(`Unsupported XRPL method: ${args.method}`);
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

  private _resolveWallet(walletId?: string): XrplWalletProvider | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as Record<string, unknown>;

    if (walletId) {
      switch (walletId) {
        case 'xaman':
          return (win.xaman as XrplWalletProvider) ?? null;
        case 'ledger':
          return (win.ledger as XrplWalletProvider) ?? null;
        case 'xpring':
          return (win.xpring as XrplWalletProvider) ?? null;
        case 'toast':
          return (win.toast as XrplWalletProvider) ?? null;
        case 'gemwallet':
          return (win.gemwallet as XrplWalletProvider) ?? null;
        default:
          return (win.xaman ?? win.gemwallet ?? win.toast ?? win.xpring ?? win.ledger) as XrplWalletProvider ?? null;
      }
    }

    // Auto-detect: Xaman → GemWallet → Toast → Xpring → Ledger
    if (win.xaman) return win.xaman as XrplWalletProvider;
    if (win.gemwallet) return win.gemwallet as XrplWalletProvider;
    if (win.toast) return win.toast as XrplWalletProvider;
    if (win.xpring) return win.xpring as XrplWalletProvider;
    if (win.ledger) return win.ledger as XrplWalletProvider;

    return null;
  }
}
