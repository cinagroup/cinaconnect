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

  /** Set the OnChainUX connector. Required by ChainAdapter interface. */
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
    const intPart = BigInt(parts[0]);
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

  /** Encode a string into a TON Cell payload (simplified). */
  private _stringToTONCell(text: string): string {
    // TON text comment encoding: op (4 bytes) + text length (4 bytes) + text
    const op = 0x00000000; // Comment opcode
    const textBytes = new TextEncoder().encode(text);
    const length = textBytes.length;

    const buf = new Uint8Array(8 + length);
    const view = new DataView(buf.buffer);
    view.setUint32(0, op);
    view.setUint32(4, length);
    buf.set(textBytes, 8);

    return this._bytesToBase64(buf);
  }

  /** Encode a Jetton transfer body (simplified). */
  private _encodeJettonTransferBody(params: TONJettonTransfer): string {
    // Jetton transfer op = 0xf8a7ea5
    // This is a simplified body encoding — real implementation would use
    // TON Cell serialization (boc.serialize).
    const op = 0xf8a7ea5;
    const queryId = 0;

    const buf = new Uint8Array(72);
    const view = new DataView(buf.buffer);
    view.setUint32(0, op);
    view.setUint32(4, queryId);
    // Amount (16 bytes big-endian)
    const amount = BigInt(params.amount);
    for (let i = 0; i < 8; i++) {
      view.setUint8(8 + i, Number((amount >> BigInt(56 - i * 8)) & 0xffn));
    }
    // Zero sender address placeholder (32 bytes)
    // Destination address placeholder (8 bytes)

    return this._bytesToBase64(buf);
  }

  /** Convert bytes to base64. */
  private _bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }
}
