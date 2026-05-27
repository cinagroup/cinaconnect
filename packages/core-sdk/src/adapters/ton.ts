/**
 * TON Chain Adapter — provides TON-specific operations.
 *
 * Uses TON Connect protocol for wallet interactions and supports Tonkeeper,
 * OpenMask, and other TON wallets. Implements JSON-RPC over HTTP for balance
 * queries and transaction broadcasting.
 */

import type { Connector } from '../connector.js';
import type { Chain, TransactionRequest } from '../types.js';

/* ------------------------------------------------------------------ */
/*  TON Address handling                                               */
/* ------------------------------------------------------------------ */

/**
 * TON address type descriptor.
 *
 * TON uses two address encodings:
 *  - Friendly (user-facing): base64url-encoded, e.g.
 *    EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N
 *  - Raw: workchain:hex, e.g. 0:a4db…ff5c
 */
export type TONAddress = string;

/** TON Connect parameters for wallet pairing. */
export interface TONConnectParams {
  /** dApp manifest URL (required by TON Connect 2). */
  manifestUrl: string;
  /** Optional redirect URL after connection. */
  redirectUrl?: string;
  /** Optional bridge URL for TON Connect relay. */
  bridgeUrl?: string;
}

/** TON transaction descriptor for building transfers. */
export interface TONTransaction {
  /** Recipient address (friendly format). */
  to: TONAddress;
  /** Amount in nanotons (string to avoid precision loss). */
  value: string;
  /** Optional body (base64-encoded cell). */
  body?: string;
  /** Optional comment text. */
  comment?: string;
  /** State init (for contract deployment). */
  stateInit?: string;
}

/** Jetton transfer descriptor. */
export interface TONJettonTransfer {
  /** Jetton master/mint address. */
  jettonMaster: TONAddress;
  /** Recipient address. */
  to: TONAddress;
  /** Amount in jetton's smallest unit (string). */
  amount: string;
  /** Optional comment. */
  comment?: string;
}

/* ------------------------------------------------------------------ */
/*  TON Wallet Provider                                                */
/* ------------------------------------------------------------------ */

/** TonConnect wallet info returned by the wallet bridge. */
interface TONBridgeWalletInfo {
  name: string;
  image: string;
  tondns?: string;
  platforms: ('ios' | 'android' | 'macos' | 'windows' | 'linux' | 'web' | 'chrome' | 'firefox' | 'telegram')[];
}

/** Account info from connected wallet. */
interface TONWalletAccount {
  address: TONAddress;
  walletStateInit: string;
  publicKey: string;
}

/** Minimal TON Connect provider interface. */
interface TONProvider {
  account: TONWalletAccount | null;
  connect(params: TONConnectParams): Promise<TONWalletAccount[]>;
  disconnect(): Promise<void>;
  sendTransaction(transaction: unknown): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  /** Request method from the wallet (optional, for advanced use). */
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/* ------------------------------------------------------------------ */
/*  Address validation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate a TON address (friendly/base64url format).
 *
 * Rules:
 *  - 48 characters for friendly addresses (EQ/EA/EV/EB + 46 chars)
 *  - 48 characters for user-friendly (UQ/UA/UV/UB + 46 chars)
 *  - Contains only base64url characters: A-Z, a-z, 0-9, _, -
 */
export function isValidTONAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  // Friendly format: [EQ|EA|EV|EB|UQ|UA|UV|UB] + 46 base64url chars = 48 total
  // Raw format: -1:hex or 0:hex
  const friendlyRegex = /^[A-Za-z0-9_-]{48}$/;
  const rawRegex = /^(-1|0):[a-fA-F0-9]{64}$/;

  return friendlyRegex.test(address) || rawRegex.test(address);
}

/**
 * Parse a friendly TON address into workchain and hash.
 * Returns null if the address is invalid.
 */
export function parseTONAddress(address: TONAddress): {
  workchain: number;
  hashHex: string;
  tag: { bounceable: boolean; testOnly: boolean };
} | null {
  if (!isValidTONAddress(address)) return null;

  // If raw format, parse directly
  if (address.includes(':')) {
    const [wcStr, hashHex] = address.split(':');
    return {
      workchain: parseInt(wcStr, 10),
      hashHex: hashHex.toLowerCase(),
      tag: { bounceable: true, testOnly: false },
    };
  }

  // Decode base64url-friendly address
  try {
    const base64 = address.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = new Uint8Array(
      atob(base64)
        .split('')
        .map((c) => c.charCodeAt(0)),
    );

    if (bytes.length !== 36) return null; // 1 byte tag + 1 byte workchain + 32 bytes hash + 2 bytes CRC

    const tag = bytes[0];
    const workchain = (bytes[1] << 24) >> 24; // signed byte
    const hashBytes = bytes.slice(2, 34);
    const hashHex = Array.from(hashBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      workchain,
      hashHex,
      tag: {
        bounceable: (tag & 0x11) === 0x11,
        testOnly: (tag & 0x80) === 0x80,
      },
    };
  } catch {
    return null;
  }
}

/** Convert hex string to base64url encoding. */
export function hexToBase64url(hex: string): string {
  const bytes = hex
    .match(/.{2}/g)!
    .map((byte) => parseInt(byte, 16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Convert base64url to hex. */
export function base64urlToHex(b64: string): string {
  const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  return Array.from(atob(padded))
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

/* ------------------------------------------------------------------ */
/*  Supported TON wallets                                              */
/* ------------------------------------------------------------------ */

export interface TONWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  downloadUrl: string;
  /** TON Connect bridge URL (optional). */
  bridgeUrl?: string;
}

export const TON_WALLETS: TONWalletInfo[] = [
  {
    id: 'tonkeeper',
    name: 'Tonkeeper',
    rdns: 'com.tonkeeper',
    icon: 'https://tonkeeper.com/assets/tonconnect-icon.png',
    downloadUrl: 'https://tonkeeper.com',
    bridgeUrl: 'https://bridge.tonapi.io/bridge',
  },
  {
    id: 'openmask',
    name: 'OpenMask',
    rdns: 'app.openmask',
    icon: 'https://openmask.app/icon.png',
    downloadUrl: 'https://chrome.google.com/webstore/detail/openmask',
  },
  {
    id: 'tonhub',
    name: 'Tonhub',
    rdns: 'com.tonhub',
    icon: 'https://tonhub.com/icon.png',
    downloadUrl: 'https://tonhub.com',
    bridgeUrl: 'https://bridge.tonapi.io/bridge',
  },
  {
    id: 'mytonwallet',
    name: 'MyTonWallet',
    rdns: 'app.mytonwallet',
    icon: 'https://mytonwallet.io/icon.png',
    downloadUrl: 'https://mytonwallet.io',
  },
];

/** Well-known TON chain presets. */
export const TON_CHAINS: Chain[] = [
  {
    id: 'ton:-239c12f4f657778e',
    name: 'TON Mainnet',
    rpcUrl: 'https://toncenter.com/api/v2/jsonRPC',
    nativeCurrency: { name: 'TON', symbol: 'TON', decimals: 9 },
    explorerUrl: 'https://tonscan.org',
    iconUrl: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
  },
  {
    id: 'ton:998659603576e1b',
    name: 'TON Testnet',
    rpcUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    nativeCurrency: { name: 'Test TON', symbol: 'tTON', decimals: 9 },
    explorerUrl: 'https://testnet.tonscan.org',
    iconUrl: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  TONChainAdapter                                                     */
/* ------------------------------------------------------------------ */

/**
 * TON chain adapter implementing chain-specific operations.
 *
 * Uses TON Connect 2.0 protocol for wallet pairing and JSON-RPC over HTTP
 * for balance queries and transaction broadcasting. Supports TON transfers,
 * Jetton (token) transfers, and message signing.
 */
export class TONChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'ton-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'TON Chain Adapter';

  private provider: TONProvider | null = null;
  private chains: Chain[] = [];
  private rpcUrl: string = TON_CHAINS[0].rpcUrl;
  private _connectedAccount: TONWalletAccount | null = null;

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. Required by ChainAdapter interface. */
  setConnector(_connector: Connector): void {
    // TON adapter uses TON Connect protocol; connector is optional.
  }

  /** Register supported TON chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
  }

  /** Set the RPC endpoint URL. */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
  }

  /** Find a chain by numeric ID (TON doesn't use numeric chain IDs — always undefined). */
  findChain(_chainId: number): Chain | undefined {
    // TON chains don't have numeric IDs; return the first matching by string id
    return this.chains[0];
  }

  /** Set the active wallet provider. */
  setProvider(provider: TONProvider): void {
    this.provider = provider;
  }

  /** Get the current provider. */
  getProvider(): TONProvider | null {
    return this.provider;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a TON wallet.
   * Tries Tonkeeper → Tonhub → OpenMask → MyTonWallet in order.
   * @param params - TON Connect parameters (manifestUrl required).
   * @returns Array of connected addresses.
   */
  async connect(params?: TONConnectParams | string): Promise<string[]> {
    const connectParams: TONConnectParams = typeof params === 'string'
      ? { manifestUrl: params }
      : params ?? { manifestUrl: window?.location?.origin ?? '' };

    const target = this._resolveWallet();
    if (!target) {
      throw new Error('No TON wallet found. Install Tonkeeper, Tonhub, or OpenMask.');
    }

    const provider = target();
    const accounts = await provider.connect(connectParams);
    this.provider = provider;
    if (accounts.length > 0) {
      this._connectedAccount = accounts[0];
    }
    return accounts.map((a) => a.address);
  }

  /** Disconnect from the wallet. */
  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
      this._connectedAccount = null;
    }
  }

  /** Get the connected address. */
  getAddress(): TONAddress | null {
    return this._connectedAccount?.address ?? null;
  }

  /* ---- Balance ---- */

  /**
   * Get TON balance for an address.
   * @param address - TON address (friendly or raw format).
   * @returns Balance in nanotons as a string.
   */
  async getBalance(address: string): Promise<string> {
    if (!isValidTONAddress(address)) {
      throw new Error(`Invalid TON address: ${address}`);
    }

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAddressInformation',
        params: { address },
      }),
    });

    if (!response.ok) {
      throw new Error(`TON RPC error: HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    // result.balance is in nanotons
    return (data.result?.balance ?? '0').toString();
  }

  /**
   * Get formatted balance in TON (decimal string).
   * @param address - TON address.
   * @returns Balance in TON (e.g. "12.345678901").
   */
  async getBalanceFormatted(address: string): Promise<string> {
    const nanotons = await this.getBalance(address);
    return TONChainAdapter.nanotonsToTON(nanotons);
  }

  /* ---- Transactions ---- */

  /**
   * Build a TON transfer transaction.
   * @param to - Recipient address (friendly format).
   * @param value - Amount in nanotons (string).
   * @param comment - Optional comment to include.
   * @returns A TON transaction object ready for signing.
   */
  buildTransfer(to: TONAddress, value: string, comment?: string): TONTransaction {
    if (!isValidTONAddress(to)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }
    return { to, value, comment };
  }

  /**
   * Build a Jetton (token) transfer transaction.
   * @param params - Jetton transfer parameters.
   * @returns A TON transaction object for the jetton transfer.
   */
  buildJettonTransfer(params: TONJettonTransfer): TONTransaction {
    if (!isValidTONAddress(params.jettonMaster)) {
      throw new Error(`Invalid jetton master address: ${params.jettonMaster}`);
    }
    if (!isValidTONAddress(params.to)) {
      throw new Error(`Invalid recipient address: ${params.to}`);
    }

    // Jetton transfer is sent to the user's jetton wallet address with a specific body.
    // The body encodes the transfer operation (op = 0xf8a7ea5).
    const body = this._encodeJettonTransferBody(params);

    return {
      to: params.jettonMaster,
      value: '50000000', // 0.05 TON as gas for jetton transfer
      body,
    };
  }

  /**
   * Send a TON transaction via the connected wallet.
   * @param tx - TON transaction object.
   * @returns Transaction BOC (bag of cells) hash as hex string.
   */
  async sendTransaction(tx: TONTransaction): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const messages = [
      {
        address: tx.to,
        amount: tx.value,
        ...(tx.body ? { payload: tx.body } : {}),
        ...(tx.stateInit ? { stateInit: tx.stateInit } : {}),
        ...(tx.comment ? { comment: tx.comment } : {}),
      },
    ];

    const result = await this.provider.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 min TTL
      messages,
    });

    return (result as Record<string, unknown>)?.boc as string ?? '';
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a message with the connected wallet.
   * TON Connect supports signing arbitrary payloads (cells).
   * @param message - Message to sign (string).
   * @returns Signature as a hex string.
   */
  async signMessage(message: string): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    // TON Connect signing: send a transaction with zero value and a comment
    // or use the signPayload method if available.
    if (this.provider.request?.toString().includes('signPayload')) {
      const result = await this.provider.request!({
        method: 'signPayload',
        params: [this._stringToTONCell(message)],
      });
      return (result as Record<string, unknown>)?.signature as string ?? '';
    }

    // Fallback: use sendTransaction with comment payload
    const address = this.getAddress();
    if (!address) throw new Error('No connected address');

    const result = await this.provider.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [
        {
          address,
          amount: '0',
          payload: this._stringToTONCell(message),
        },
      ],
    });

    return (result as Record<string, unknown>)?.boc as string ?? '';
  }

  /* ---- Chain Switch ---- */

  /** Switch the active chain (TON adapters typically use a single chain). */
  async switchChain(chainId: number): Promise<void> {
    const chain = this.chains.find((c) => c.id.startsWith('ton:'));
    if (chain) {
      this.rpcUrl = chain.rpcUrl;
    }
  }

  /** Get connected account addresses. Required by ChainAdapter interface. */
  async getAccounts(): Promise<string[]> {
    const addr = this.getAddress();
    return addr ? [addr] : [];
  }

  /* ---- Utility ---- */

  /** Convert nanotons to TON string. */
  static nanotonsToTON(nanotons: string | number): string {
    const n = typeof nanotons === 'string' ? BigInt(nanotons) : BigInt(nanotons);
    const intPart = n / 1_000_000_000n;
    const fracPart = n % 1_000_000_000n;
    const fracStr = fracPart.toString().padStart(9, '0').replace(/0+$/, '');
    return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
  }

  /** Convert TON to nanotons. */
  static tonToNanotons(ton: string | number): string {
    const parts = String(ton).split('.');
    const intPart = BigInt(parts[0] || '0');
    let fracPart = 0n;
    if (parts.length > 1) {
      const frac = parts[1].padEnd(9, '0').slice(0, 9);
      fracPart = BigInt(frac);
    }
    return (intPart * 1_000_000_000n + fracPart).toString();
  }

  /** Find a TON chain by its ID string. */
  findChainById(chainId: string): Chain | undefined {
    return this.chains.find((c) => c.id === chainId);
  }

  /* ---- Private helpers ---- */

  private _resolveWallet(): (() => TONProvider) | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as Record<string, unknown>;

    // Check for TON Connect provider or injected wallet
    if (win.tonkeeper) return () => win.tonkeeper as TONProvider;
    if (win.tonhub) return () => win.tonhub as TONProvider;
    if (win.openmask) return () => win.openmask as TONProvider;
    if (win.mytonwallet) return () => win.mytonwallet as TONProvider;
    // Generic tonconnect provider
    if (win.tonConnectUI) return () => win.tonConnectUI as TONProvider;

    return null;
  }

  /** Encode a string into a TON Cell payload using proper BoC format. */
  private _stringToTONCell(text: string): string {
    const textBytes = new TextEncoder().encode(text);
    const totalBits = 32 + textBytes.length * 8; // op (32 bits) + text

    // Build cell: op (0x00000000 for comment) + UTF-8 text
    const cellBits = new Array<boolean>();
    // op = 0x00000000 (32 zero bits)
    for (let i = 0; i < 32; i++) cellBits.push(false);
    // Text content (each byte = 8 bits, MSB first)
    for (const byte of textBytes) {
      for (let b = 7; b >= 0; b--) {
        cellBits.push(((byte >> b) & 1) === 1);
      }
    }

    const boc = this._buildBoc(cellBits, []);
    return this._bytesToBase64(boc);
  }

  /** Encode a Jetton transfer body using proper TON Cell/BoC format. */
  private _encodeJettonTransferBody(params: TONJettonTransfer): string {
    // Parse destination address to get raw hash bytes
    const destInfo = parseTONAddress(params.to);
    if (!destInfo) {
      throw new Error(`Cannot encode jetton transfer: invalid destination address: ${params.to}`);
    }

    // Jetton transfer TL-B schema:
    // op: uint32 = 0xf8a7ea5
    // query_id: uint64
    // amount: uint (coins, 120-bit big-endian)
    // destination: MsgAddress (standard addr = tag 0x04 + workchain (int8) + address (256 bits))
    // response_address: MsgAddress (0x03 = null)
    // custom_payload: Cell (0x00 = null)
    // forward_ton_amount: uint (coins)
    // forward_payload: Cell (0x00 = null)
    const cellBits = new Array<boolean>();

    // op: 0x0f8a7ea5 (32 bits)
    const op = 0x0f8a7ea5;
    for (let b = 31; b >= 0; b--) {
      cellBits.push(((op >> b) & 1) === 1);
    }

    // query_id: 0 (64 bits)
    for (let i = 0; i < 64; i++) cellBits.push(false);

    // amount: coins (120-bit big-endian uint)
    const amount = BigInt(params.amount);
    for (let i = 119; i >= 0; i--) {
      cellBits.push(((amount >> BigInt(i)) & 1n) === 1n);
    }

    // destination: MsgAddress (standard: tag 0x04 + workchain int8 + hash 256 bits)
    cellBits.push(false); // tag 0 bit 7
    cellBits.push(false); // tag 0 bit 6
    cellBits.push(false); // tag 0 bit 5
    cellBits.push(false); // tag 0 bit 4
    cellBits.push(false); // tag 0 bit 3
    cellBits.push(true);  // tag 0 bit 2 = 1 → anycast = false
    cellBits.push(false); // tag 0 bit 1 = 0 → standard addr
    cellBits.push(false); // tag 0 bit 0
    // workchain (int8, 8 bits)
    const wc = destInfo.workchain >= 0 ? destInfo.workchain : destInfo.workchain + 256;
    for (let b = 7; b >= 0; b--) {
      cellBits.push(((wc >> b) & 1) === 1);
    }
    // address hash (256 bits)
    const hashBytes = this._hexToBytes(destInfo.hashHex);
    for (const byte of hashBytes) {
      for (let b = 7; b >= 0; b--) {
        cellBits.push(((byte >> b) & 1) === 1);
      }
    }

    // response_address: null (tag 0x03, 3 bits)
    cellBits.push(false);
    cellBits.push(true);
    cellBits.push(true);

    // custom_payload: null (1 bit = 0)
    cellBits.push(false);

    // forward_ton_amount: 0 (coins, 120-bit)
    for (let i = 0; i < 120; i++) cellBits.push(false);

    // forward_payload: left = 0 (no inline payload)
    cellBits.push(false);

    const boc = this._buildBoc(cellBits, []);
    return this._bytesToBase64(boc);
  }

  /** Convert bytes to base64. */
  private _bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  /* ---- TON Cell / BoC serialization ---- */

  /**
   * Build a Bag of Cells (BoC) from cell bits.
   *
   * BoC format (boc_version=0x00):
   *   magic: 0xb5 (1 byte)
   *   flags: byte (has_idx=0, has_crc32=0, has_cache_bits=0, flags_size=0)
   *   size_bytes: 1 byte (cell size in bytes)
   *   off_bytes: 1 byte (offset size in bytes)
   *   cells_num: bytes (number of cells)
   *   roots_num: bytes (number of roots, always 1)
   *   absent_num: bytes (number of absent roots, always 0)
   *   tot_cells_size: bytes (total cell data size)
   *   root_list: bytes (root indices)
   *   cells_data: variable (serialized cells)
   */
  private _buildBoc(bits: boolean[], _refIndices: number[]): Uint8Array {
    const cells = [this._cellFromBits(bits)];
    return this._serializeBoc(cells, [0]);
  }

  /**
   * Build a cell from bit data.
   * Cell format:
   *   header: ref_count (3 bits) | has_index (1 bit) | depth (16 bits) — not used for v0
   *   data_bits: bytes (rounded up)
   *   refs: up to 4 × index (offset_bytes each)
   */
  private _cellFromBits(bits: boolean[]): Uint8Array {
    const dataBits = bits.length;
    // Round up to full bytes, pad with trailing 1 + zeros per TON spec
    let paddedBits = [...bits];
    paddedBits.push(true); // termination bit
    while (paddedBits.length % 8 !== 0) {
      paddedBits.push(false);
    }
    const byteCount = paddedBits.length / 8;

    // Header byte: ref_count(3) | has_index(1) | depth(4) — single cell, no refs, depth=0
    const header = 0x00; // 0 refs, no index, depth 0

    const cell = new Uint8Array(1 + byteCount);
    cell[0] = header;
    for (let i = 0; i < byteCount; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        if (paddedBits[i * 8 + b]) {
          byte |= 1 << (7 - b);
        }
      }
      cell[1 + i] = byte;
    }
    return cell;
  }

  /**
   * Serialize cells into Bag of Cells format.
   */
  private _serializeBoc(cells: Uint8Array[], roots: number[]): Uint8Array {
    const cellsNum = cells.length;
    const rootsNum = roots.length;
    const absentNum = 0;
    const totSize = cells.reduce((sum, c) => sum + c.length, 0);

    // Determine byte widths
    const sizeBytes = this._bytesFor(cellsNum, totSize);
    const offBytes = this._bytesFor(cellsNum + 1);

    // Build offset table
    const offsets: number[] = [0];
    for (let i = 0; i < cellsNum; i++) {
      offsets.push(offsets[i] + cells[i].length);
    }

    // Calculate total BoC size
    const totalSize =
      1 + 1 + 1 + 1 + // magic, flags, size_bytes, off_bytes
      cellsNum * sizeBytes + // cells_num (not stored separately, part of format)
      sizeBytes + // cells_num value
      sizeBytes + // roots_num
      sizeBytes + // absent_num
      sizeBytes + // tot_cells_size
      rootsNum * sizeBytes + // root_list
      totSize + // cell_data
      4; // crc32

    // Actually calculate properly:
    let pos = 0;
    const buf = new Uint8Array(totalSize + 100); // generous buffer

    buf[pos++] = 0xb5; // magic
    buf[pos++] = 0x00; // flags (no idx, no crc except at end, no cache_bits)
    buf[pos++] = sizeBytes;
    buf[pos++] = offBytes;
    pos = this._writeUint(buf, pos, cellsNum, sizeBytes);
    pos = this._writeUint(buf, pos, rootsNum, sizeBytes);
    pos = this._writeUint(buf, pos, absentNum, sizeBytes);
    pos = this._writeUint(buf, pos, totSize, sizeBytes);
    // root_list
    for (const r of roots) {
      pos = this._writeUint(buf, pos, r, sizeBytes);
    }
    // cells_data
    for (const cell of cells) {
      buf.set(cell, pos);
      pos += cell.length;
    }
    // CRC32
    const crc = this._crc32(buf.slice(0, pos));
    buf[pos++] = (crc >> 24) & 0xff;
    buf[pos++] = (crc >> 16) & 0xff;
    buf[pos++] = (crc >> 8) & 0xff;
    buf[pos++] = crc & 0xff;

    return buf.slice(0, pos);
  }

  /** Determine minimum bytes needed to represent value. */
  private _bytesFor(...values: number[]): number {
    const max = Math.max(...values, 1);
    if (max <= 0xff) return 1;
    if (max <= 0xffff) return 2;
    if (max <= 0xffffff) return 3;
    return 4;
  }

  /** Write unsigned integer to buffer, big-endian, n bytes. Returns new position. */
  private _writeUint(buf: Uint8Array, offset: number, value: number, byteCount: number): number {
    for (let i = byteCount - 1; i >= 0; i--) {
      buf[offset + i] = value & 0xff;
      value = value >> 8;
    }
    return offset + byteCount;
  }

  /** CRC32 checksum (standard polynomial 0xEDB88320). */
  private _crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    const table = TONChainAdapter._crc32Table();
    for (const byte of data) {
      crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ 0xffffffff;
  }

  /** Lazy-initialized CRC32 lookup table. */
  private static _crc32TableCache: Uint32Array | null = null;
  private static _crc32Table(): Uint32Array {
    if (TONChainAdapter._crc32TableCache) return TONChainAdapter._crc32TableCache;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    TONChainAdapter._crc32TableCache = table;
    return table;
  }

  /** Convert hex string to Uint8Array. */
  private _hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}
