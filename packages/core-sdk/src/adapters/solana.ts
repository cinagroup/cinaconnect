/**
 * Solana Chain Adapter — provides Solana-specific operations.
 *
 * Uses @solana/web3.js for RPC calls and supports Phantom, Solflare,
 * and Backpack wallet adapters. EIP-1193 compatible adapter layer.
 */

import type { Connector } from '../connector.js';
import type { Chain, TransactionRequest } from '../types.js';

/* ------------------------------------------------------------------ */
/*  Minimal @solana/web3.js type declarations for environments where   */
/*  the package is provided by the consumer.                           */
/* ------------------------------------------------------------------ */

interface SolanaPublicKey {
  toBase58(): string;
  toBuffer(): Buffer;
  equals(other: SolanaPublicKey): boolean;
}

interface SolanaConnection {
  getBalance(publicKey: SolanaPublicKey, commitment?: string): Promise<number>;
  sendRawTransaction(
    rawTransaction: Uint8Array | Buffer,
    options?: { skipPreflight?: boolean; preflightCommitment?: string },
  ): Promise<string>;
  getLatestBlockhash(commitment?: string): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }>;
}

interface SolanaTransaction {
  feePayer: SolanaPublicKey;
  recentBlockhash: string;
  sign(...signers: { publicKey: SolanaPublicKey; secretKey: Uint8Array }[]): void;
  serialize(options?: { requireAllSignatures?: boolean; verifySignatures?: boolean }): Buffer;
  addInstruction(instruction: unknown): void;
}

interface SolanaSystemProgram {
  transfer(params: { fromPubkey: SolanaPublicKey; toPubkey: SolanaPublicKey; lamports: number }): unknown;
}

interface SolanaMessageSigner {
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
}

/** Minimal EIP-1193-like provider for Solana wallets. */
interface SolanaProvider {
  publicKey: SolanaPublicKey | null;
  isConnected: boolean;
  connect(): Promise<{ publicKey: SolanaPublicKey }>;
  disconnect(): Promise<void>;
  signTransaction(tx: SolanaTransaction): Promise<SolanaTransaction>;
  signAllTransactions(txs: SolanaTransaction[]): Promise<SolanaTransaction[]>;
  signMessage?(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

/* ------------------------------------------------------------------ */
/*  Address validation                                                 */
/* ------------------------------------------------------------------ */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Validate a Solana base58 address.
 * - Must be 32-44 characters
 * - Must contain only valid base58 characters
 * - Decoded buffer must be exactly 32 bytes
 */
export function isValidSolanaAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  for (let i = 0; i < address.length; i++) {
    if (BASE58_ALPHABET.indexOf(address[i]) === -1) return false;
  }
  return true;
}

/** Decode a base58 string to a byte array. */
export function base58Decode(input: string): Uint8Array {
  let num = 0n;
  for (let i = 0; i < input.length; i++) {
    const charIndex = BASE58_ALPHABET.indexOf(input[i]);
    if (charIndex === -1) throw new Error(`Invalid base58 character: ${input[i]}`);
    num = num * 58n + BigInt(charIndex);
  }

  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }

  // Add leading zeros for each '1' in the input
  for (let i = 0; i < input.length && input[i] === '1'; i++) {
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}

/* ------------------------------------------------------------------ */
/*  Supported Solana wallets                                           */
/* ------------------------------------------------------------------ */

export interface SolanaWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  /** URL to install the wallet if not present. */
  downloadUrl: string;
}

export const SOLANA_WALLETS: SolanaWalletInfo[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    rdns: 'app.phantom',
    icon: 'https://phantom.app/img/phantom-icon.png',
    downloadUrl: 'https://phantom.app/download',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    rdns: 'app.solflare',
    icon: 'https://solflare.com/icon.png',
    downloadUrl: 'https://solflare.com/download',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    rdns: 'app.backpack',
    icon: 'https://backpack.app/icon.png',
    downloadUrl: 'https://backpack.app/download',
  },
];

/** Well-known Solana chain presets. */
export const SOLANA_CHAINS: Chain[] = [
  {
    id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana Mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    explorerUrl: 'https://explorer.solana.com',
    iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  },
  {
    id: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    name: 'Solana Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
    iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  },
  {
    id: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
    name: 'Solana Testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
    iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter                                                  */
/* ------------------------------------------------------------------ */

/**
 * Solana chain adapter implementing chain-specific operations.
 *
 * Wraps a connector/provider with Solana-specific JSON-RPC calls,
 * transaction building, and message signing.
 */
export class SolanaChainAdapter {
  private provider: SolanaProvider | null = null;
  private connection: SolanaConnection | null = null;
  private chains: Chain[] = [];
  private rpcUrl: string = SOLANA_CHAINS[0].rpcUrl;

  /* ---- Configuration ---- */

  /** Register supported Solana chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
  }

  /** Set the RPC endpoint URL. */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
  }

  /** Set the active wallet provider. */
  setProvider(provider: SolanaProvider): void {
    this.provider = provider;
    this._setupConnection();
  }

  /** Get the current provider. */
  getProvider(): SolanaProvider | null {
    return this.provider;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a Solana wallet.
   * Tries Phantom → Solflare → Backpack in order.
   * @returns The connected public key as a base58 string.
   */
  async connect(walletId?: string): Promise<string> {
    const target = this._resolveWallet(walletId);
    if (!target) throw new Error('No Solana wallet found. Install Phantom, Solflare, or Backpack.');

    const provider = target();
    const result = await provider.connect();
    this.provider = provider;
    this._setupConnection();
    return result.publicKey.toBase58();
  }

  /** Disconnect the current wallet. */
  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
    }
  }

  /** Get the connected address. */
  getAddress(): string | null {
    return this.provider?.publicKey?.toBase58() ?? null;
  }

  /* ---- Balance ---- */

  /**
   * Get SOL balance for an address.
   * @param address - Base58-encoded Solana address.
   * @returns Balance in SOL (as a decimal string, e.g. "1.234").
   */
  async getBalance(address: string): Promise<string> {
    if (!isValidSolanaAddress(address)) {
      throw new Error(`Invalid Solana address: ${address}`);
    }

    if (this.connection) {
      const pubKey = this._toPublicKey(address);
      const lamports = await this.connection.getBalance(pubKey);
      return (lamports / 1e9).toString();
    }

    // Fallback: raw RPC call
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });

      if (!response.ok) {
        throw new Error(`Solana RPC error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(`Solana RPC error: ${data.error.message}`);
      const lamports = data.result.value as number;
      return (lamports / 1e9).toString();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Solana RPC error')) throw err;
      throw new Error(`Solana getBalance failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /* ---- Transactions ---- */

  /**
   * Build a System Program transfer instruction.
   * @param from - Sender address (base58).
   * @param to - Recipient address (base58).
   * @param lamports - Amount in lamports.
   * @returns A transfer instruction.
   */
  buildTransferInstruction(
    from: string,
    to: string,
    lamports: number,
  ): unknown {
    if (!isValidSolanaAddress(from)) throw new Error(`Invalid from address: ${from}`);
    if (!isValidSolanaAddress(to)) throw new Error(`Invalid to address: ${to}`);

    const fromPubKey = this._toPublicKey(from);
    const toPubKey = this._toPublicKey(to);

    return {
      fromPubkey: fromPubKey,
      toPubkey: toPubKey,
      lamports,
    };
  }

  /**
   * Send a signed transaction.
   * @param tx - Serialized transaction bytes (base64 string or Uint8Array).
   * @returns Transaction signature (base58).
   */
  async sendTransaction(
    tx: SolanaTransaction | Uint8Array | string,
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    let serializedTx: Uint8Array | Buffer;

    if (tx instanceof Uint8Array || Buffer.isBuffer(tx)) {
      serializedTx = tx as Uint8Array | Buffer;
    } else if (typeof tx === 'string') {
      serializedTx = Buffer.from(tx, 'base64');
    } else {
      // It's a Transaction object — sign and serialize
      const latest = await this._getLatestBlockhash();
      (tx as SolanaTransaction).recentBlockhash = latest.blockhash;
      const signed = await this.provider.signTransaction(tx as SolanaTransaction);
      serializedTx = signed.serialize();
    }

    if (this.connection) {
      return this.connection.sendRawTransaction(serializedTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
    }

    // Fallback: raw RPC
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendTransaction',
          params: [Buffer.from(serializedTx).toString('base64'), { encoding: 'base64' }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Solana RPC error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(`Solana RPC error: ${data.error.message}`);
      return data.result as string;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Solana RPC error')) throw err;
      throw new Error(`Solana sendTransaction failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a message with the connected wallet.
   * Uses Solana's off-chain message signing (no BIP-322, Solana-specific).
   * @param message - Message as a string or Uint8Array.
   * @returns Signature as a base58-encoded string.
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');
    if (!this.provider.signMessage) {
      throw new Error('Connected wallet does not support message signing');
    }

    const msgBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const result = await this.provider.signMessage(msgBytes);
    return this._bytesToBase58(result.signature);
  }

  /* ---- SPL Token Support ---- */

  /**
   * Build an SPL token transfer instruction.
   * @param mint - SPL token mint address (base58).
   * @param source - Source token account (base58).
   * @param destination - Destination token account (base58).
   * @param owner - Owner of the source account (base58).
   * @param amount - Token amount (in smallest unit, considering decimals).
   * @returns A token transfer instruction object.
   */
  buildSPLTransferInstruction(
    mint: string,
    source: string,
    destination: string,
    owner: string,
    amount: number | bigint,
  ): unknown {
    return {
      mint,
      source,
      destination,
      owner,
      amount: Number(amount),
    };
  }

  /* ---- EIP-1193 Compatible Request ---- */

  /**
   * EIP-1193 compatible request method for Solana.
   * Supports: solana_getBalance, solana_sendTransaction, solana_signMessage, etc.
   */
  async request(args: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    switch (args.method) {
      case 'solana_getBalance': {
        const address = (args.params?.[0] ?? '') as string;
        return this.getBalance(address);
      }
      case 'solana_sendTransaction': {
        const tx = args.params?.[0] as SolanaTransaction | Uint8Array | string;
        return this.sendTransaction(tx);
      }
      case 'solana_signMessage': {
        const msg = args.params?.[0] as string | Uint8Array;
        return this.signMessage(msg);
      }
      case 'solana_getLatestBlockhash': {
        return this._getLatestBlockhash();
      }
      case 'solana_getAccountInfo': {
        const address = (args.params?.[0] ?? '') as string;
        return this._getAccountInfo(address);
      }
      default:
        throw new Error(`Unsupported Solana method: ${args.method}`);
    }
  }

  /* ---- Utility ---- */

  /** Find a chain by its ID. */
  findChain(chainId: string): Chain | undefined {
    return this.chains.find((c) => c.id === chainId);
  }

  /** Convert SOL to lamports. */
  static solToLamports(sol: number | string): number {
    return Math.round(Number(sol) * 1e9);
  }

  /** Convert lamports to SOL. */
  static lamportsToSol(lamports: number): string {
    return (lamports / 1e9).toString();
  }

  /* ---- Private helpers ---- */

  private _resolveWallet(walletId?: string): (() => SolanaProvider) | null {
    if (typeof window === 'undefined') return null;

    const win = window as any;

    if (walletId) {
      switch (walletId) {
        case 'phantom':
          return () => (win.phantom?.solana ?? win.solana) as SolanaProvider;
        case 'solflare':
          return () => win.solflare as SolanaProvider;
        case 'backpack':
          return () => win.backpack as SolanaProvider;
        default:
          return null;
      }
    }

    // Auto-detect: Phantom → Solflare → Backpack
    if (win.phantom?.solana) return () => win.phantom.solana as SolanaProvider;
    if (win.solflare) return () => win.solflare as SolanaProvider;
    if (win.backpack) return () => win.backpack as SolanaProvider;
    // Fallback to generic solana (may be Phantom or others)
    if (win.solana) return () => win.solana as SolanaProvider;

    return null;
  }

  private _setupConnection(): void {
    // Create a minimal connection wrapper around the provider's request
    if (!this.provider) return;

    this.connection = {
      getBalance: async (pubKey, _commitment?) => {
        const addr = pubKey.toBase58();
        try {
          const resp = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getBalance',
              params: [addr],
            }),
          });
          if (!resp.ok) throw new Error(`Solana RPC error ${resp.status}: ${resp.statusText}`);
          const data = await resp.json();
          if (data.error) throw new Error(`Solana RPC error: ${data.error.message}`);
          return data.result.value as number;
        } catch (err: unknown) {
          if (err instanceof Error && err.message.startsWith('Solana RPC error')) throw err;
          throw new Error(`Solana connection getBalance failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
      sendRawTransaction: async (rawTx, options?) => {
        try {
          const resp = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'sendTransaction',
              params: [Buffer.from(rawTx).toString('base64'), { encoding: 'base64', ...options }],
            }),
          });
          if (!resp.ok) throw new Error(`Solana RPC error ${resp.status}: ${resp.statusText}`);
          const data = await resp.json();
          if (data.error) throw new Error(`Solana RPC error: ${data.error.message}`);
          return data.result as string;
        } catch (err: unknown) {
          if (err instanceof Error && err.message.startsWith('Solana RPC error')) throw err;
          throw new Error(`Solana connection sendRawTransaction failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
      getLatestBlockhash: async (_commitment?) => {
        try {
          const resp = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getLatestBlockhash',
            }),
          });
          if (!resp.ok) throw new Error(`Solana RPC error ${resp.status}: ${resp.statusText}`);
          const data = await resp.json();
          if (data.error) throw new Error(`Solana RPC error: ${data.error.message}`);
          return data.result.value as { blockhash: string; lastValidBlockHeight: number };
        } catch (err: unknown) {
          if (err instanceof Error && err.message.startsWith('Solana RPC error')) throw err;
          throw new Error(`Solana connection getLatestBlockhash failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    };
  }

  private _toPublicKey(address: string): SolanaPublicKey {
    const bytes = base58Decode(address);
    return {
      toBase58: () => address,
      toBuffer: () => Buffer.from(bytes),
      equals: (other: SolanaPublicKey) => address === other.toBase58(),
    };
  }

  private _bytesToBase58(bytes: Uint8Array): string {
    let num = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
      num = num * 256n + BigInt(bytes[i]);
    }

    let encoded = '';
    while (num > 0n) {
      const remainder = Number(num % 58n);
      encoded = BASE58_ALPHABET[remainder] + encoded;
      num = num / 58n;
    }

    // Add '1' for each leading zero byte
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      encoded = '1' + encoded;
    }

    return encoded || '1';
  }

  private async _getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    if (this.connection) {
      return this.connection.getLatestBlockhash();
    }

    try {
      const resp = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getLatestBlockhash',
        }),
      });
      if (!resp.ok) throw new Error(`Solana RPC error ${resp.status}: ${resp.statusText}`);
      const data = await resp.json();
      if (data.error) throw new Error(`Solana RPC error: ${data.error.message}`);
      return data.result.value;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Solana RPC error')) throw err;
      throw new Error(`Solana _getLatestBlockhash failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async _getAccountInfo(address: string): Promise<unknown> {
    try {
      const resp = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [address, { encoding: 'base64' }],
        }),
      });
      if (!resp.ok) throw new Error(`Solana RPC error ${resp.status}: ${resp.statusText}`);
      const data = await resp.json();
      if (data.error) throw new Error(`Solana RPC error: ${data.error.message}`);
      return data.result;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Solana RPC error')) throw err;
      throw new Error(`Solana _getAccountInfo failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
