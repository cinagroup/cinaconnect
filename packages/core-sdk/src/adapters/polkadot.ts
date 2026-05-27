/**
 * Polkadot Chain Adapter — provides Polkadot-specific operations.
 *
 * Uses polkadot.js for wallet interactions and supports Polkadot.js Extension,
 * Talisman, and SubWallet. Implements JSON-RPC over WebSocket for balance
 * queries and transaction broadcasting. Supports DOT transfers and asset transfers.
 */

import { blake2b } from '@noble/hashes/blake2.js';
import type { Connector } from '../connector.js';
import type { Chain, TransactionRequest } from '../types.js';

/* ------------------------------------------------------------------ */
/*  Polkadot Address handling                                          */
/* ------------------------------------------------------------------ */

/**
 * Polkadot transfer descriptor.
 */
export interface PolkadotTransaction {
  /** Recipient address (SS58 format). */
  to: string;
  /** Amount in Plancks (string to avoid precision loss). */
  value: string;
  /** Optional memo (for chains that support it). */
  memo?: string;
}

/**
 * Asset transfer descriptor for multi-asset chains.
 */
export interface PolkadotAssetTransfer {
  /** Asset ID on the chain. */
  assetId: string | number;
  /** Recipient address (SS58 format). */
  to: string;
  /** Amount in smallest unit (string). */
  amount: string;
}

/**
 * Decoded SS58 address info.
 */
export interface SS58AddressInfo {
  /** Network prefix. */
  prefix: number;
  /** Public key as hex. */
  publicKey: string;
  /** Checksum. */
  checksum: Uint8Array;
}

/* ------------------------------------------------------------------ */
/*  Polkadot Wallet Provider                                           */
/* ------------------------------------------------------------------ */

/** Injected account from Polkadot.js Extension. */
interface InjectedAccount {
  address: string;
  name?: string;
  genesisHash?: string | null;
}

/** Injected Polkadot signer. */
interface InjectedPolkadotSigner {
  signPayload(payload: unknown): Promise<{ signature: string }>;
  signRaw?(payload: {
    address: string;
    data: string;
    type: 'bytes';
  }): Promise<{ signature: string }>;
}

/** Polkadot.js Extension injected web3. */
interface PolkadotInjectedWeb3 {
  listAccounts(): Promise<InjectedAccount[]>;
  getAccounts(): Promise<InjectedAccount[]>;
  sign(address: string, payload: unknown): Promise<{ signature: string }>;
  subscribeAccounts(
    cb: (accounts: InjectedAccount[]) => void,
  ): () => void;
}

/** Minimal Polkadot provider interface. */
interface PolkadotProvider {
  /** Connected accounts. */
  accounts: InjectedAccount[];
  /** Signer interface. */
  signer: InjectedPolkadotSigner;
  /** Subscribe to account changes. */
  subscribe(cb: (accounts: InjectedAccount[]) => void): () => void;
  /** Disconnect. */
  disconnect(): Promise<void>;
}

/** Polkadot API (minimal interface for JSON-RPC). */
interface PolkadotApi {
  /** Query balance. */
  query: {
    system: {
      account(address: string): Promise<{
        data: { free: string | number | bigint; reserved: string | number | bigint };
        nonce: number;
      }>;
    };
    balances?: {
      account(address: string): Promise<{
        data: { free: string | number | bigint };
      }>;
    };
    assets?: {
      account(assetId: string | number, address: string): Promise<{
        balance: string | number | bigint;
      }>;
    };
  };
  /** Get chain properties. */
  rpc: {
    system: {
      chain(): Promise<string>;
      name(): Promise<string>;
      version(): Promise<string>;
    };
  };
  /** Transaction builder. */
  tx: {
    balances: {
      transfer(dest: string, value: string | bigint | number): {
        signAndSend(
          from: string,
          options?: unknown,
          statusCb?: (result: unknown) => void,
        ): Promise<unknown>;
      };
      transferAll(dest: string, keepAlive?: boolean): {
        signAndSend(
          from: string,
          options?: unknown,
          statusCb?: (result: unknown) => void,
        ): Promise<unknown>;
      };
    };
    assets: {
      transfer(assetId: string | number, dest: string, value: string | bigint | number): {
        signAndSend(
          from: string,
          options?: unknown,
          statusCb?: (result: unknown) => void,
        ): Promise<unknown>;
      };
    };
  };
  /** Runtime info. */
  runtimeVersion: unknown;
  /** Genesis hash. */
  genesisHash: string;
  /** Disconnect. */
  disconnect(): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  SS58 Address validation                                            */
/* ------------------------------------------------------------------ */

const SS58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode an SS58 encoded address.
 *
 * SS58 format:
 *  - 1 byte prefix (or 2 bytes for extended prefix)
 *  - 32 bytes public key
 *  - 2 bytes Blake2b checksum
 *
 * Returns null if the address is invalid.
 */
export function decodeSS58(address: string): SS58AddressInfo | null {
  if (typeof address !== 'string') return null;
  if (address.length < 47 || address.length > 48) return null;

  // Decode base58
  let num = 0n;
  let leadingZeros = 0;
  for (let i = 0; i < address.length; i++) {
    const idx = SS58_ALPHABET.indexOf(address[i]);
    if (idx === -1) return null;
    if (num === 0n && idx === 0) {
      leadingZeros++;
    }
    num = num * 58n + BigInt(idx);
  }

  // Convert to bytes
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }

  // Add leading zeros
  for (let i = 0; i < leadingZeros; i++) {
    bytes.unshift(0);
  }

  if (bytes.length < 35) return null; // 1 prefix + 32 pubkey + 2 checksum

  // Determine prefix (simple: 1 byte, extended: 2 bytes)
  let prefix: number;
  let pubkeyStart: number;
  if (bytes[0] < 64) {
    prefix = bytes[0];
    pubkeyStart = 1;
  } else if (bytes[0] < 128) {
    prefix = bytes[0] | ((bytes[1] & 0x0f) << 8);
    pubkeyStart = 2;
  } else {
    return null; // Invalid prefix
  }

  const publicKey = bytes.slice(pubkeyStart, pubkeyStart + 32);
  const checksum = bytes.slice(pubkeyStart + 32, pubkeyStart + 34);

  return {
    prefix,
    publicKey: publicKey.map((b) => b.toString(16).padStart(2, '0')).join(''),
    checksum: new Uint8Array(checksum),
  };
}

/**
 * Validate a Polkadot SS58 address.
 * Returns true if the address is a valid SS58 encoded address.
 */
export function isValidSS58Address(address: string): boolean {
  return decodeSS58(address) !== null;
}

/* ------------------------------------------------------------------ */
/*  Supported Polkadot wallets                                         */
/* ------------------------------------------------------------------ */

export interface PolkadotWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  downloadUrl: string;
}

export const POLKADOT_WALLETS: PolkadotWalletInfo[] = [
  {
    id: 'polkadotjs',
    name: 'Polkadot.js',
    rdns: 'com.polkadotjs',
    icon: 'https://polkadot.js.org/icon.png',
    downloadUrl: 'https://polkadot.js.org/extension',
  },
  {
    id: 'talisman',
    name: 'Talisman',
    rdns: 'xyz.talisman',
    icon: 'https://app.talisman.xyz/icons/icon-192.png',
    downloadUrl: 'https://talisman.xyz',
  },
  {
    id: 'subwallet',
    name: 'SubWallet',
    rdns: 'com.subwallet',
    icon: 'https://subwallet.app/logo.png',
    downloadUrl: 'https://subwallet.app',
  },
];

/** Well-known Polkadot chain presets. */
export const POLKADOT_CHAINS: Chain[] = [
  {
    id: 'polkadot:91b171bb158e2d3848fa23a9f1c25182',
    name: 'Polkadot',
    rpcUrl: 'wss://rpc.polkadot.io',
    nativeCurrency: { name: 'Polkadot', symbol: 'DOT', decimals: 10 },
    explorerUrl: 'https://polkadot.subscan.io',
    iconUrl: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.svg',
  },
  {
    id: 'polkadot:b0a8d493285c2df73290dfb7e61f870f',
    name: 'Kusama',
    rpcUrl: 'wss://kusama-rpc.polkadot.io',
    nativeCurrency: { name: 'Kusama', symbol: 'KSM', decimals: 12 },
    explorerUrl: 'https://kusama.subscan.io',
    iconUrl: 'https://cryptologos.cc/logos/kusama-ksm-logo.svg',
  },
  {
    id: 'polkadot:e143f23803ac50e8f6f8e62695d1ce9e',
    name: 'Westend (Testnet)',
    rpcUrl: 'wss://westend-rpc.polkadot.io',
    nativeCurrency: { name: 'Westend', symbol: 'WND', decimals: 10 },
    explorerUrl: 'https://westend.subscan.io',
    iconUrl: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  PolkadotChainAdapter                                                */
/* ------------------------------------------------------------------ */

/**
 * Polkadot chain adapter implementing chain-specific operations.
 *
 * Uses polkadot.js for wallet interactions via the browser extension
 * injection API. Supports DOT transfers, asset transfers on multi-asset
 * chains, and message signing. Compatible with Polkadot.js Extension,
 * Talisman, and SubWallet.
 */
export class PolkadotChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'polkadot-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'Polkadot Chain Adapter';

  private provider: PolkadotProvider | null = null;
  private api: PolkadotApi | null = null;
  private chains: Chain[] = [];
  private rpcUrl: string = POLKADOT_CHAINS[0].rpcUrl;
  private _connectedAccounts: InjectedAccount[] = [];

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. Required by ChainAdapter interface. */
  setConnector(_connector: Connector): void {
    // Polkadot adapter uses polkadot.js injection; connector is optional.
  }

  /** Register supported Polkadot chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
  }

  /** Set the RPC endpoint URL (WebSocket URL). */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
  }

  /** Find a chain by numeric ID (returns first chain). */
  findChain(_chainId: number): Chain | undefined {
    return this.chains[0];
  }

  /** Set the active wallet provider and API. */
  setProvider(provider: PolkadotProvider, api?: PolkadotApi): void {
    this.provider = provider;
    if (api) {
      this.api = api;
    }
  }

  /** Get the current provider. */
  getProvider(): PolkadotProvider | null {
    return this.provider;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a Polkadot wallet via the injected extension.
   * Tries Polkadot.js Extension → Talisman → SubWallet in order.
   * @returns Array of connected addresses (SS58).
   */
  async connect(walletId?: string): Promise<string[]> {
    const injected = await this._resolveWallet(walletId);
    if (!injected) {
      throw new Error(
        'No Polkadot wallet found. Install Polkadot.js Extension, Talisman, or SubWallet.',
      );
    }

    const accounts = await injected.getAccounts();
    this._connectedAccounts = accounts;

    // Build a minimal provider from the injected extension
    this.provider = {
      accounts,
      signer: {
        signPayload: async (payload: unknown) => {
          const addr = accounts[0]?.address;
          if (!addr) throw new Error('No account to sign with');
          return injected.sign(addr, payload);
        },
      },
      subscribe: (cb: (accounts: InjectedAccount[]) => void) => {
        return injected.subscribeAccounts(cb);
      },
      disconnect: async () => {
        this._connectedAccounts = [];
        this.provider = null;
      },
    };

    return accounts.map((a) => a.address);
  }

  /** Disconnect from the wallet. */
  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
    }
    this._connectedAccounts = [];
  }

  /** Get the connected address (first account). */
  getAddress(): string | null {
    return this._connectedAccounts[0]?.address ?? null;
  }

  /* ---- Balance ---- */

  /**
   * Get DOT balance for an address.
   * @param address - Polkadot address (SS58 format).
   * @returns Balance in Plancks (string, 1 DOT = 10^10 Plancks).
   */
  async getBalance(address: string): Promise<string> {
    if (!isValidSS58Address(address)) {
      throw new Error(`Invalid Polkadot address: ${address}`);
    }

    // Try via API first
    if (this.api?.query?.system?.account) {
      const account = await this.api.query.system.account(address);
      const free = account.data.free;
      return (typeof free === 'bigint' ? free.toString() : String(free));
    }

    // Fallback: JSON-RPC via HTTP gateway
    return this._rpcQueryBalance(address);
  }

  /**
   * Get formatted balance in DOT (decimal string).
   * @param address - Polkadot address.
   * @returns Balance in DOT (e.g. "12.3456789012").
   */
  async getBalanceFormatted(address: string): Promise<string> {
    const plancks = await this.getBalance(address);
    return PolkadotChainAdapter.plancksToDOT(plancks);
  }

  /**
   * Get asset balance for an address on a multi-asset chain.
   * @param assetId - Asset ID.
   * @param address - Polkadot address.
   * @returns Asset balance in smallest unit.
   */
  async getAssetBalance(assetId: string | number, address: string): Promise<string> {
    if (!isValidSS58Address(address)) {
      throw new Error(`Invalid Polkadot address: ${address}`);
    }

    if (this.api?.query?.assets?.account) {
      const result = await this.api.query.assets.account(assetId, address);
      const balance = result.balance;
      return typeof balance === 'bigint' ? balance.toString() : String(balance);
    }

    return '0';
  }

  /* ---- Transactions ---- */

  /**
   * Build a DOT transfer.
   * @param to - Recipient address (SS58).
   * @param value - Amount in Plancks (string).
   * @returns A Polkadot transaction object.
   */
  buildTransfer(to: string, value: string): PolkadotTransaction {
    if (!isValidSS58Address(to)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }
    return { to, value };
  }

  /**
   * Build an asset transfer for multi-asset chains.
   * @param params - Asset transfer parameters.
   * @returns Transaction object for asset transfer.
   */
  buildAssetTransfer(params: PolkadotAssetTransfer): PolkadotTransaction {
    if (!isValidSS58Address(params.to)) {
      throw new Error(`Invalid recipient address: ${params.to}`);
    }
    return { to: params.to, value: params.amount, memo: `asset:${params.assetId}` };
  }

  /**
   * Send a DOT transfer via the connected wallet.
   * @param tx - Polkadot transaction object.
   * @returns Extrinsic hash (hex).
   */
  async sendTransaction(tx: PolkadotTransaction): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const from = this.getAddress();
    if (!from) throw new Error('No connected address');

    // Check if memo indicates asset transfer
    if (tx.memo?.startsWith('asset:')) {
      const assetId = tx.memo.slice(6);
      return this._sendAssetTransfer(assetId, from, tx.to, tx.value);
    }

    // Standard DOT transfer
    if (this.api?.tx?.balances?.transfer) {
      return new Promise<string>((resolve, reject) => {
        this.api!.tx.balances
          .transfer(tx.to, BigInt(tx.value))
          .signAndSend(
            from,
            { signer: this.provider!.signer },
            (result: unknown) => {
              const r = result as Record<string, unknown>;
              const status = r.status as Record<string, unknown> | undefined;
              if (status?.isFinalized || r.isFinalized) {
                resolve((r.txHash as string) ?? '');
              }
              if (status?.isInBlock) {
                // Wait for finalization
              }
              if (r.dispatchError) {
                reject(new Error(`Transaction failed: ${JSON.stringify(r.dispatchError)}`));
              }
            },
          )
          .catch(reject);
      });
    }

    // Fallback: construct and submit via RPC
    return this._rpcSendTransfer(from, tx.to, tx.value);
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a message with the connected wallet.
   * Uses polkadot.js signRaw for arbitrary message signing.
   * @param message - Message to sign (string).
   * @returns Signature as a hex string.
   */
  async signMessage(message: string): Promise<string> {
    if (!this.provider?.signer?.signRaw) {
      throw new Error('Connected wallet does not support message signing');
    }

    const address = this.getAddress();
    if (!address) throw new Error('No connected address');

    const data = this._hexEncode(message);
    const result = await this.provider.signer.signRaw({
      address,
      data,
      type: 'bytes',
    });

    return result.signature;
  }

  /* ---- Chain Switch ---- */

  /** Switch the active chain. */
  async switchChain(chainId: number): Promise<void> {
    const chain = this.findChain(chainId);
    if (chain) {
      this.rpcUrl = chain.rpcUrl;
      // Reconnect API with new RPC URL
      this.api = null;
    }
  }

  /** Get connected account addresses. Required by ChainAdapter interface. */
  async getAccounts(): Promise<string[]> {
    return this._connectedAccounts.map((a) => a.address);
  }

  /* ---- Utility ---- */

  /** Convert Plancks to DOT string. */
  static plancksToDOT(plancks: string | number): string {
    const n = typeof plancks === 'string' ? BigInt(plancks) : BigInt(plancks);
    const intPart = n / 10_000_000_000n;
    const fracPart = n % 10_000_000_000n;
    const fracStr = fracPart.toString().padStart(10, '0').replace(/0+$/, '');
    return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
  }

  /** Convert DOT to Plancks. */
  static dotToPlancks(dot: string | number): string {
    const parts = String(dot).split('.');
    const intPart = BigInt(parts[0] || '0');
    let fracPart = 0n;
    if (parts.length > 1) {
      const frac = parts[1].padEnd(10, '0').slice(0, 10);
      fracPart = BigInt(frac);
    }
    return (intPart * 10_000_000_000n + fracPart).toString();
  }

  /** Find a Polkadot chain by its ID string. */
  findChainById(chainId: string): Chain | undefined {
    return this.chains.find((c) => c.id === chainId);
  }

  /* ---- Private helpers ---- */

  private async _resolveWallet(walletId?: string): Promise<PolkadotInjectedWeb3 | null> {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as Record<string, unknown>;
    const injected = win.injectedWeb3 as Record<string, PolkadotInjectedWeb3> | undefined;

    if (!injected) return null;

    if (walletId) {
      const key = this._walletToInjectedKey(walletId);
      if (injected[key]) return injected[key];
      return null;
    }

    // Auto-detect: Talisman → SubWallet → Polkadot.js
    if (injected['talisman']) return injected['talisman'];
    if (injected['polkadot-js']) return injected['polkadot-js'];
    if (injected['subwallet-js']) return injected['subwallet-js'];

    // Return first available
    const keys = Object.keys(injected);
    if (keys.length > 0) return injected[keys[0]];

    return null;
  }

  private _walletToInjectedKey(walletId: string): string {
    switch (walletId) {
      case 'polkadotjs':
        return 'polkadot-js';
      case 'talisman':
        return 'talisman';
      case 'subwallet':
        return 'subwallet-js';
      default:
        return walletId;
    }
  }

  /** Encode a string to hex for signing. */
  private _hexEncode(text: string): string {
    const bytes = new TextEncoder().encode(text);
    return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /* ------------------------------------------------------------------ */
  /*  SCALE codec helpers (minimal, no external dependency)               */
  /* ------------------------------------------------------------------ */

  /**
   * Twox128 hash — first 16 bytes of Twox256.
   * Used for Polkadot storage map key construction.
   */
  private _twox128(input: Uint8Array): Uint8Array {
    const full = this._twox256(input);
    return full.slice(0, 16);
  }

  /**
   * Twox256 — four XXH64 hashes with seeds 0,1,2,3 concatenated.
   * Each XXH64 takes 8 bytes, giving 32 bytes total.
   */
  private _twox256(input: Uint8Array): Uint8Array {
    const out = new Uint8Array(32);
    for (let i = 0; i < 4; i++) {
      const h = this._xxh64(input, i);
      out.set(this._u64ToLittleEndianBytes(h), i * 8);
    }
    return out;
  }

  /* ---- XXH64 implementation (portable JS) ---- */

  private static readonly _XXH64_PRIME1 = 11400714785074694791n;
  private static readonly _XXH64_PRIME2 = 14029467366897019727n;
  private static readonly _XXH64_PRIME3 = 1609587929392839161n;
  private static readonly _XXH64_PRIME4 = 9650029242287828579n;
  private static readonly _XXH64_PRIME5 = 2870177450012600261n;
  private static readonly _MASK64 = 0xffffffffffffffffn;

  private _rotl64(v: bigint, n: number): bigint {
    return ((v << BigInt(n)) | (v >> BigInt(64 - n))) & PolkadotChainAdapter._MASK64;
  }

  private _xxh64Round(acc: bigint, input: bigint): bigint {
    acc = (acc + input * PolkadotChainAdapter._XXH64_PRIME2) & PolkadotChainAdapter._MASK64;
    acc = this._rotl64(acc, 31);
    acc = (acc * PolkadotChainAdapter._XXH64_PRIME1) & PolkadotChainAdapter._MASK64;
    return acc;
  }

  private _xxh64(buf: Uint8Array, seed: number): bigint {
    let h64: bigint = BigInt(seed);
    const len = buf.length;
    let i = 0;

    if (len >= 32) {
      // Process 32-byte stripes (4 × 8 bytes)
      let v1 = (h64 + PolkadotChainAdapter._XXH64_PRIME1 + PolkadotChainAdapter._XXH64_PRIME2) & PolkadotChainAdapter._MASK64;
      let v2 = (h64 + PolkadotChainAdapter._XXH64_PRIME2) & PolkadotChainAdapter._MASK64;
      let v3 = h64 & PolkadotChainAdapter._MASK64;
      let v4 = (h64 - PolkadotChainAdapter._XXH64_PRIME1) & PolkadotChainAdapter._MASK64;

      const limit = len - 31;
      while (i < limit) {
        v1 = this._xxh64Round(v1, this._readLE64(buf, i));
        v2 = this._xxh64Round(v2, this._readLE64(buf, i + 8));
        v3 = this._xxh64Round(v3, this._readLE64(buf, i + 16));
        v4 = this._xxh64Round(v4, this._readLE64(buf, i + 24));
        i += 32;
      }

      h64 = (this._rotl64(v1, 1) + this._rotl64(v2, 7) + this._rotl64(v3, 12) + this._rotl64(v4, 18)) & PolkadotChainAdapter._MASK64;
      // Merge stripe accumulators
      v1 = (v1 * PolkadotChainAdapter._XXH64_PRIME2) & PolkadotChainAdapter._MASK64;
      v1 = this._rotl64(v1, 31);
      v1 = (v1 * PolkadotChainAdapter._XXH64_PRIME1) & PolkadotChainAdapter._MASK64;
      h64 = ((h64 ^ v1) * PolkadotChainAdapter._XXH64_PRIME1 + PolkadotChainAdapter._XXH64_PRIME4) & PolkadotChainAdapter._MASK64;

      v2 = (v2 * PolkadotChainAdapter._XXH64_PRIME2) & PolkadotChainAdapter._MASK64;
      v2 = this._rotl64(v2, 31);
      v2 = (v2 * PolkadotChainAdapter._XXH64_PRIME1) & PolkadotChainAdapter._MASK64;
      h64 = ((h64 ^ v2) * PolkadotChainAdapter._XXH64_PRIME1 + PolkadotChainAdapter._XXH64_PRIME4) & PolkadotChainAdapter._MASK64;

      v3 = (v3 * PolkadotChainAdapter._XXH64_PRIME2) & PolkadotChainAdapter._MASK64;
      v3 = this._rotl64(v3, 31);
      v3 = (v3 * PolkadotChainAdapter._XXH64_PRIME1) & PolkadotChainAdapter._MASK64;
      h64 = ((h64 ^ v3) * PolkadotChainAdapter._XXH64_PRIME1 + PolkadotChainAdapter._XXH64_PRIME4) & PolkadotChainAdapter._MASK64;

      v4 = (v4 * PolkadotChainAdapter._XXH64_PRIME2) & PolkadotChainAdapter._MASK64;
      v4 = this._rotl64(v4, 31);
      v4 = (v4 * PolkadotChainAdapter._XXH64_PRIME1) & PolkadotChainAdapter._MASK64;
      h64 = ((h64 ^ v4) * PolkadotChainAdapter._XXH64_PRIME1 + PolkadotChainAdapter._XXH64_PRIME4) & PolkadotChainAdapter._MASK64;
    } else {
      h64 = (h64 + PolkadotChainAdapter._XXH64_PRIME5 + BigInt(len)) & PolkadotChainAdapter._MASK64;
    }

    // Process remaining bytes
    h64 = (h64 + BigInt(len)) & PolkadotChainAdapter._MASK64;
    while (i + 8 <= len) {
      const k1 = this._readLE64(buf, i);
      h64 = ((h64 ^ this._xxh64Round(0n, k1)) * PolkadotChainAdapter._XXH64_PRIME1 + PolkadotChainAdapter._XXH64_PRIME4) & PolkadotChainAdapter._MASK64;
      i += 8;
    }
    while (i + 4 <= len) {
      const k2 = this._readLE32(buf, i);
      h64 = ((h64 ^ BigInt(k2) * PolkadotChainAdapter._XXH64_PRIME1) * PolkadotChainAdapter._XXH64_PRIME2 + PolkadotChainAdapter._XXH64_PRIME3) & PolkadotChainAdapter._MASK64;
      i += 4;
    }
    while (i < len) {
      h64 = ((h64 ^ BigInt(buf[i]) * PolkadotChainAdapter._XXH64_PRIME5) * PolkadotChainAdapter._XXH64_PRIME1) & PolkadotChainAdapter._MASK64;
      i++;
    }

    // Finalization
    h64 = h64 ^ (h64 >> 33n);
    h64 = (h64 * PolkadotChainAdapter._XXH64_PRIME2) & PolkadotChainAdapter._MASK64;
    h64 = h64 ^ (h64 >> 29n);
    h64 = (h64 * PolkadotChainAdapter._XXH64_PRIME3) & PolkadotChainAdapter._MASK64;
    h64 = h64 ^ (h64 >> 32n);
    return h64;
  }

  private _readLE64(buf: Uint8Array, offset: number): bigint {
    return (BigInt(buf[offset]) |
      (BigInt(buf[offset + 1]) << 8n) |
      (BigInt(buf[offset + 2]) << 16n) |
      (BigInt(buf[offset + 3]) << 24n) |
      (BigInt(buf[offset + 4]) << 32n) |
      (BigInt(buf[offset + 5]) << 40n) |
      (BigInt(buf[offset + 6]) << 48n) |
      (BigInt(buf[offset + 7]) << 56n)) & PolkadotChainAdapter._MASK64;
  }

  private _readLE32(buf: Uint8Array, offset: number): number {
    return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
  }

  private _u64ToLittleEndianBytes(v: bigint): Uint8Array {
    const out = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      out[i] = Number(v & 0xffn);
      v = v >> 8n;
    }
    return out;
  }

  /**
   * Blake2b-128 hash (first 16 bytes of Blake2b-512 output).
   * Uses @noble/hashes/blake2b — already a dependency.
   */
  private _blake2b128(input: Uint8Array): Uint8Array {
    return blake2b(input, { dkLen: 16 });
  }

  /**
   * Blake2b-128 concat — Blake2b-128 hash of input concatenated with the input itself.
   */
  private _blake2b128Concat(input: Uint8Array): Uint8Array {
    const hash = this._blake2b128(input);
    const out = new Uint8Array(hash.length + input.length);
    out.set(hash);
    out.set(input, hash.length);
    return out;
  }

  /**
   * Twox64 concat — Twox64 hash of input concatenated with the input itself.
   */
  private _twox64Concat(input: Uint8Array): Uint8Array {
    const hash = this._twox256(input);
    const out = new Uint8Array(8 + input.length);
    out.set(hash.slice(0, 8));
    out.set(input, 8);
    return out;
  }

  /**
   * Generate the storage key for System.Account(address).
   *
   * Format:
   *   Twox128("System") ++ Twox128("Account") ++ Blake2b128Concat(SS58 raw bytes)
   *
   * Returns the hex-encoded storage key for use with state_getStorage RPC.
   */
  private _buildStorageKey(address: string): string {
    // Decode SS58 to get raw public key bytes
    const info = decodeSS58(address);
    if (!info) throw new Error(`Cannot build storage key: invalid SS58 address`);
    const pubKeyBytes = this._hexToBytes(info.publicKey);

    const systemHash = this._twox128(new TextEncoder().encode('System'));
    const accountHash = this._twox128(new TextEncoder().encode('Account'));
    const keyHash = this._blake2b128Concat(pubKeyBytes);

    const combined = new Uint8Array(systemHash.length + accountHash.length + keyHash.length);
    combined.set(systemHash, 0);
    combined.set(accountHash, systemHash.length);
    combined.set(keyHash, systemHash.length + accountHash.length);

    return '0x' + Array.from(combined).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Convert hex string (without 0x prefix) to Uint8Array. */
  private _hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  /**
   * SCALE-decode a u128 value (little-endian, 16 bytes).
   * Throws if insufficient bytes remain.
   */
  private _scaleDecodeU128(bytes: Uint8Array, offset: number = 0): bigint {
    if (offset + 16 > bytes.length) {
      throw new Error(
        `SCALE u128 decode: need 16 bytes at offset ${offset}, ` +
        `but only ${bytes.length - offset} bytes available (total ${bytes.length})`,
      );
    }
    let value = 0n;
    for (let i = 0; i < 16; i++) {
      value |= BigInt(bytes[offset + i]) << BigInt(i * 8);
    }
    return value;
  }

  /**
   * SCALE-decode a compact u32/VarInt (used for nonce and reference counters).
   * Throws if insufficient bytes remain for the encoding mode.
   */
  private _scaleDecodeCompact(bytes: Uint8Array, offset: number = 0): { value: bigint; bytesRead: number } {
    if (offset >= bytes.length) {
      throw new Error(`SCALE compact decode: offset ${offset} beyond ${bytes.length} bytes`);
    }
    const first = bytes[offset];
    const mode = first & 0b11;
    if (mode === 0b00) {
      // Single byte, value >> 2
      return { value: BigInt(first >> 2), bytesRead: 1 };
    } else if (mode === 0b01) {
      // 2-byte little-endian, value >> 2
      if (offset + 2 > bytes.length) throw new Error('SCALE compact: need 2 bytes for mode 01');
      const val = (bytes[offset] | (bytes[offset + 1] << 8)) >> 2;
      return { value: BigInt(val), bytesRead: 2 };
    } else if (mode === 0b10) {
      // 4-byte little-endian, value >> 2
      if (offset + 4 > bytes.length) throw new Error('SCALE compact: need 4 bytes for mode 10');
      const val = (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
      return { value: BigInt(Math.floor(val / 4)), bytesRead: 4 };
    } else {
      // mode == 0b11: big int prefix, next byte tells length
      const lenExp = (first >> 2) & 0b111111;
      const byteCount = 4 + lenExp;
      if (offset + 1 + byteCount > bytes.length) {
        throw new Error(`SCALE compact: need ${1 + byteCount} bytes for mode 11 (lenExp=${lenExp})`);
      }
      let value = 0n;
      for (let i = 0; i < byteCount; i++) {
        value |= BigInt(bytes[offset + 1 + i]) << BigInt(i * 8);
      }
      return { value, bytesRead: 1 + byteCount };
    }
  }

  /**
   * Decode SCALE-encoded AccountInfo storage value.
   *
   * AccountInfo structure (current Polkadot runtime):
   *   nonce: Compact<u32>
   *   consumers: Compact<u32>
   *   providers: Compact<u32>
   *   sufficients: Compact<u32>
   *   data: AccountData {
   *     free: u128
   *     reserved: u128
   *     frozen: u128  (or misc_frozen + fee_frozen in older runtimes)
   *   }
   *
   * After the 4 compact fields, the free balance is at byte offset of the
   * accumulated compact sizes (typically 4–8 bytes total for small values).
   */
  private _decodeAccountInfo(scaleBytes: Uint8Array): { free: string } {
    let offset = 0;
    // Skip nonce
    const nonce = this._scaleDecodeCompact(scaleBytes, offset);
    offset += Number(nonce.bytesRead);
    // Skip consumers
    const consumers = this._scaleDecodeCompact(scaleBytes, offset);
    offset += Number(consumers.bytesRead);
    // Skip providers
    const providers = this._scaleDecodeCompact(scaleBytes, offset);
    offset += Number(providers.bytesRead);
    // Skip sufficients
    const sufficients = this._scaleDecodeCompact(scaleBytes, offset);
    offset += Number(sufficients.bytesRead);

    // Now we're at AccountData.free (u128 = 16 bytes)
    const free = this._scaleDecodeU128(scaleBytes, offset);
    return { free: free.toString() };
  }

  /** Query balance via JSON-RPC over HTTP gateway. */
  private async _rpcQueryBalance(address: string): Promise<string> {
    // For non-browser environments, use fetch to an HTTP gateway
    const httpUrl = this.rpcUrl.replace('wss://', 'https://');
    try {
      const storageKey = this._buildStorageKey(address);
      const resp = await fetch(httpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'state_getStorage',
          params: [storageKey],
        }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} from ${httpUrl}`);
      }
      const data = await resp.json() as Record<string, unknown>;
      if (data.error) {
        const err = data.error as Record<string, unknown>;
        throw new Error(`RPC error: ${String(err.message ?? err.code ?? JSON.stringify(data.error))}`);
      }
      const result = data.result;
      // state_getStorage returns null if key not found
      if (result == null) {
        throw new Error(`No storage data returned for address ${address}`);
      }
      const hexStr = result as string;
      if (typeof hexStr !== 'string' || hexStr.length < 4 || !hexStr.startsWith('0x')) {
        throw new Error(`Unexpected storage result format: ${String(hexStr).slice(0, 60)}`);
      }
      // Decode the SCALE-encoded AccountInfo storage value
      const scaleBytes = this._hexToBytes(hexStr.slice(2)); // strip 0x
      if (scaleBytes.length < 20) {
        throw new Error(`SCALE data too short (${scaleBytes.length} bytes) for AccountInfo`);
      }
      const decoded = this._decodeAccountInfo(scaleBytes);
      return decoded.free;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Polkadot balance RPC query failed: ${msg}`);
    }
  }

  /** Generate storage key for balance query. */
  private async _storageKeyForBalance(address: string): Promise<string> {
    // System.Account storage key:
    //   Twox128("System") ++ Twox128("Account") ++ Blake2b128Concat(SS58 raw pubkey)
    return this._buildStorageKey(address);
  }

  /** Send asset transfer via API. */
  private async _sendAssetTransfer(
    assetId: string,
    from: string,
    to: string,
    value: string,
  ): Promise<string> {
    if (!this.api?.tx?.assets?.transfer) {
      throw new Error('Assets pallet not available on this chain');
    }

    return new Promise<string>((resolve, reject) => {
      this.api!.tx.assets
        .transfer(assetId, to, BigInt(value))
        .signAndSend(
          from,
          { signer: this.provider!.signer },
          (result: unknown) => {
            const r = result as Record<string, unknown>;
            const status = r.status as Record<string, unknown> | undefined;
            if (status?.isFinalized || r.isFinalized) {
              resolve((r.txHash as string) ?? '');
            }
            if (r.dispatchError) {
              reject(new Error(`Transaction failed: ${JSON.stringify(r.dispatchError)}`));
            }
          },
        )
        .catch(reject);
    });
  }

  /**
   * Send transfer via JSON-RPC (fallback).
   *
   * NOTE: Direct RPC submission requires building a fully SCALE-encoded
   * extrinsic (including nonce, era, tip, and signature). Without a signing
   * key this adapter cannot produce a valid extrinsic.
   *
   * In production, use the injected wallet API path (api.tx.balances.transfer)
   * which handles encoding and signing via the extension.
   */
  private async _rpcSendTransfer(
    from: string,
    to: string,
    value: string,
  ): Promise<string> {
    // Cannot send without a signer — require wallet connection.
    throw new Error(
      'Direct RPC transfer is not supported. Please connect a Polkadot wallet (Polkadot.js Extension, Talisman, or SubWallet) to send transactions.',
    );
  }
}
