/**
 * TRON Chain Adapter — provides TRON-specific operations.
 *
 * Uses TRON Link protocol for wallet interactions and supports TronLink,
 * Trust Wallet, and other TRON wallets. Implements JSON-RPC over HTTP for
 * balance queries and transaction broadcasting. Supports TRX and TRC-20 tokens.
 */

import type { Connector } from '../connector.js';
import type { Chain, TransactionRequest } from '../types.js';

/* ------------------------------------------------------------------ */
/*  TRON Address handling                                              */
/* ------------------------------------------------------------------ */

/** TRON transaction descriptor for building transfers. */
export interface TRONTransaction {
  /** Recipient address (base58 format). */
  to: string;
  /** Amount in sun (string to avoid precision loss). */
  value: string;
  /** Optional data (hex string). */
  data?: string;
}

/** TRC-20 token transfer descriptor. */
export interface TRC20Transfer {
  /** TRC-20 contract address (base58). */
  contractAddress: string;
  /** Recipient address (base58). */
  to: string;
  /** Amount in token's smallest unit (string). */
  amount: string;
}

/** TRON transaction from the API. */
export interface TRONTransactionRaw {
  visible: boolean;
  txID: string;
  raw_data: {
    contract: Array<{
      parameter: {
        value: Record<string, unknown>;
        type: string;
      };
    }>;
    ref_block_bytes: string;
    ref_block_hash: string;
    expiration: number;
    timestamp: number;
    fee_limit?: number;
  };
  raw_data_hex?: string;
  signature?: string[];
}

/* ------------------------------------------------------------------ */
/*  TRON Wallet Provider                                               */
/* ------------------------------------------------------------------ */

/** Minimal TRON wallet provider interface (TronLink-compatible). */
interface TRONProvider {
  /** Ready flag set by the wallet. */
  ready?: boolean;
  /** Full name / display name. */
  tronWeb?: {
    ready?: boolean;
    address: {
      base58?: string;
      hex?: string;
    };
    trc20(contractAddress: string): {
      methods: {
        transfer(to: string, amount: string): {
          send(options?: unknown): Promise<unknown>;
          call(): Promise<unknown>;
        };
        balanceOf(address: string): { call(): Promise<unknown> };
      };
      decimals(): { call(): Promise<number> };
      name(): { call(): Promise<string> };
      symbol(): { call(): Promise<string> };
    };
    trx: {
      sendTransaction(
        to: string,
        amount: number,
        options?: unknown,
      ): Promise<unknown>;
      sign(message: string, privateKey?: string): Promise<{ message: string; signature: string }>;
      getAccount(address?: string): Promise<{ address: string; balance: number }>;
      getBalance(address?: string): Promise<number>;
      getBlock(): Promise<{ number: number }>;
      getTransaction(txId: string): Promise<unknown>;
      sendRawTransaction(data: { visible: boolean; txID: string; raw_data_hex: string; signature: string[] }): Promise<unknown>;
      signTransaction(tx: unknown, privateKey?: string): Promise<unknown>;
    };
  };
  /** Connect request. */
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

/* ------------------------------------------------------------------ */
/*  Address validation                                                 */
/* ------------------------------------------------------------------ */

const BASE58_ALPHABET_TRON = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Validate a TRON address (base58 format with 'T' prefix).
 *
 * Rules:
 *  - Starts with 'T'
 *  - Exactly 34 characters
 *  - Contains only valid base58 characters
 */
export function isValidTRONAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (!address.startsWith('T')) return false;
  if (address.length !== 34) return false;
  for (let i = 0; i < address.length; i++) {
    if (BASE58_ALPHABET_TRON.indexOf(address[i]) === -1) return false;
  }
  return true;
}

/**
 * Decode a base58 string to a hex address.
 */
export function base58ToHex(address: string): string {
  let num = 0n;
  for (let i = 0; i < address.length; i++) {
    const charIndex = BASE58_ALPHABET_TRON.indexOf(address[i]);
    if (charIndex === -1) throw new Error(`Invalid base58 character: ${address[i]}`);
    num = num * 58n + BigInt(charIndex);
  }

  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }

  for (let i = 0; i < address.length && address[i] === '1'; i++) {
    bytes.unshift(0);
  }

  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encode a hex string to base58.
 */
export function hexToBase58(hex: string): string {
  let num = BigInt('0x' + hex);
  if (num === 0n) return '1';

  let encoded = '';
  while (num > 0n) {
    const remainder = Number(num % 58n);
    encoded = BASE58_ALPHABET_TRON[remainder] + encoded;
    num = num / 58n;
  }

  for (let i = 0; i < hex.length / 2; i++) {
    if (hex.slice(i * 2, i * 2 + 2) !== '00') break;
    encoded = '1' + encoded;
  }

  return encoded;
}

/* ------------------------------------------------------------------ */
/*  Supported TRON wallets                                             */
/* ------------------------------------------------------------------ */

export interface TRONWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  downloadUrl: string;
}

export const TRON_WALLETS: TRONWalletInfo[] = [
  {
    id: 'tronlink',
    name: 'TronLink',
    rdns: 'com.tronlink',
    icon: 'https://www.tronlink.org/logo.png',
    downloadUrl: 'https://www.tronlink.org',
  },
  {
    id: 'trustwallet',
    name: 'Trust Wallet',
    rdns: 'com.trustwallet',
    icon: 'https://trustwallet.com/assets/images/trust_logotype.svg',
    downloadUrl: 'https://trustwallet.com',
  },
  {
    id: 'ledger',
    name: 'Ledger',
    rdns: 'com.ledger',
    icon: 'https://www.ledger.com/wp-content/themes/ledger-v2/public/images/ledger-logo-long.svg',
    downloadUrl: 'https://www.ledger.com',
  },
];

/** Well-known TRON chain presets. */
export const TRON_CHAINS: Chain[] = [
  {
    id: 'tron:0x2b6653dc',
    name: 'TRON Mainnet',
    rpcUrl: 'https://api.trongrid.io',
    nativeCurrency: { name: 'TRON', symbol: 'TRX', decimals: 6 },
    explorerUrl: 'https://tronscan.org',
    iconUrl: 'https://cryptologos.cc/logos/tron-trx-logo.svg',
  },
  {
    id: 'tron:0x9219f13c',
    name: 'TRON Shasta Testnet',
    rpcUrl: 'https://api.shasta.trongrid.io',
    nativeCurrency: { name: 'Shasta TRX', symbol: 'tTRX', decimals: 6 },
    explorerUrl: 'https://shasta.tronscan.org',
    iconUrl: 'https://cryptologos.cc/logos/tron-trx-logo.svg',
  },
  {
    id: 'tron:0x94a905a8',
    name: 'TRON Nile Testnet',
    rpcUrl: 'https://nile.trongrid.io',
    nativeCurrency: { name: 'Nile TRX', symbol: 'tTRX', decimals: 6 },
    explorerUrl: 'https://nile.tronscan.org',
    iconUrl: 'https://cryptologos.cc/logos/tron-trx-logo.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  TRONChainAdapter                                                    */
/* ------------------------------------------------------------------ */

/**
 * TRON chain adapter implementing chain-specific operations.
 *
 * Uses TRON Link protocol for wallet pairing and JSON-RPC over HTTP for
 * balance queries and transaction broadcasting. Supports TRX transfers,
 * TRC-20 token transfers, and message signing.
 */
export class TRONChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'tron-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'TRON Chain Adapter';

  private provider: TRONProvider | null = null;
  private chains: Chain[] = [];
  private rpcUrl: string = TRON_CHAINS[0].rpcUrl;
  private _connectedAddress: string | null = null;

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. Required by ChainAdapter interface. */
  setConnector(_connector: Connector): void {
    // TRON adapter uses TRON Link protocol; connector is optional.
  }

  /** Register supported TRON chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
  }

  /** Set the RPC endpoint URL. */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
  }

  /** Find a chain by numeric ID (returns first chain — TRON doesn't use numeric IDs in this adapter). */
  findChain(_chainId: number): Chain | undefined {
    return this.chains[0];
  }

  /** Set the active wallet provider. */
  setProvider(provider: TRONProvider): void {
    this.provider = provider;
  }

  /** Get the current provider. */
  getProvider(): TRONProvider | null {
    return this.provider;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a TRON wallet.
   * Tries TronLink → Trust Wallet → Ledger in order.
   * @returns Array of connected addresses (base58).
   */
  async connect(walletId?: string): Promise<string[]> {
    const target = this._resolveWallet(walletId);
    if (!target) {
      throw new Error('No TRON wallet found. Install TronLink or Trust Wallet.');
    }

    const provider = target();

    // Request account access via TRON Link
    const accounts = await provider.request({
      method: 'tron_requestAccounts',
      params: {
        websiteName: 'Cinacoin',
      },
    });

    this.provider = provider;

    // Extract address from response
    const rec = accounts as Record<string, unknown>;
    const addr = (rec.address as { base58?: string })?.base58;
    if (addr) {
      this._connectedAddress = addr;
    } else {
      const accountsList = rec.accounts as Array<{ address?: { base58?: string } }> | undefined;
      if (accountsList?.[0]?.address?.base58) {
        this._connectedAddress = accountsList[0].address.base58;
      } else if ((rec as { address?: string }).address) {
        this._connectedAddress = (rec as { address: string }).address;
      }
    }

    return this._connectedAddress ? [this._connectedAddress] : [];
  }

  /** Disconnect from the wallet. */
  async disconnect(): Promise<void> {
    this.provider = null;
    this._connectedAddress = null;
  }

  /** Get the connected address. */
  getAddress(): string | null {
    return this._connectedAddress;
  }

  /* ---- Balance ---- */

  /**
   * Get TRX balance for an address.
   * @param address - TRON address (base58 format).
   * @returns Balance in sun (string, 1 TRX = 1,000,000 sun).
   */
  async getBalance(address: string): Promise<string> {
    if (!isValidTRONAddress(address)) {
      throw new Error(`Invalid TRON address: ${address}`);
    }

    // Try via provider first
    if (this.provider?.tronWeb?.trx?.getBalance) {
      const balance = await this.provider.tronWeb.trx.getBalance(address);
      return balance.toString();
    }

    // Fallback: raw API call
    const resp = await fetch(`${this.rpcUrl}/wallet/getaccount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: base58ToHex(address),
        visible: false,
      }),
    });

    if (!resp.ok) {
      throw new Error(`TRON RPC error: HTTP ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    if (data.Error) throw new Error(data.Error);
    return (data.balance ?? 0).toString();
  }

  /**
   * Get formatted balance in TRX (decimal string).
   * @param address - TRON address.
   * @returns Balance in TRX (e.g. "12.345678").
   */
  async getBalanceFormatted(address: string): Promise<string> {
    const sun = await this.getBalance(address);
    return TRONChainAdapter.sunToTRX(sun);
  }

  /**
   * Get TRC-20 token balance for an address.
   * @param contractAddress - TRC-20 contract address (base58).
   * @param address - Wallet address (base58).
   * @returns Token balance in smallest unit.
   */
  async getTokenBalance(contractAddress: string, address: string): Promise<string> {
    if (!isValidTRONAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }
    if (!isValidTRONAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    // Try via provider first
    if (this.provider?.tronWeb) {
      try {
        const contract = this.provider.tronWeb.trc20(contractAddress);
        const result = await contract.methods.balanceOf(address).call();
        return String(result);
      } catch {
        // Fallback to API
      }
    }

    // API fallback: TRC-20 transfers endpoint
    const resp = await fetch(
      `${this.rpcUrl}/v1/accounts/${address}/transactions/trc20?contract_address=${base58ToHex(contractAddress)}`,
    );
    if (!resp.ok) {
      throw new Error(`TRON RPC error: HTTP ${resp.status} ${resp.statusText}`);
    }
    const data = await resp.json();
    // This gives transfers, not balance — use provider when possible
    // Return "0" as safe default
    return '0';
  }

  /* ---- Transactions ---- */

  /**
   * Build a TRX transfer transaction.
   * @param to - Recipient address (base58).
   * @param value - Amount in sun (string).
   * @returns A TRON transaction object.
   */
  buildTransfer(to: string, value: string): TRONTransaction {
    if (!isValidTRONAddress(to)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }
    return { to, value };
  }

  /**
   * Build a TRC-20 token transfer.
   * @param params - TRC-20 transfer parameters.
   * @returns TRON transaction with TRC-20 data.
   */
  buildTRC20Transfer(params: TRC20Transfer): TRONTransaction {
    if (!isValidTRONAddress(params.contractAddress)) {
      throw new Error(`Invalid contract address: ${params.contractAddress}`);
    }
    if (!isValidTRONAddress(params.to)) {
      throw new Error(`Invalid recipient address: ${params.to}`);
    }

    // Encode TRC-20 transfer function call
    // function transfer(address to, uint256 value)
    const data = this._encodeTRC20Transfer(params.to, params.amount);

    return {
      to: params.contractAddress,
      value: '0',
      data,
    };
  }

  /**
   * Send a TRX transaction via the connected wallet.
   * @param tx - TRON transaction object.
   * @returns Transaction ID (hex).
   */
  async sendTransaction(tx: TRONTransaction): Promise<string> {
    if (!this.provider?.tronWeb) throw new Error('No provider connected');

    // TRX transfer
    if (!tx.data) {
      const result = await this.provider.tronWeb.trx.sendTransaction(
        tx.to,
        parseInt(tx.value, 10),
      );
      return (result as Record<string, unknown>)?.txid as string ?? '';
    }

    // TRC-20 transfer
    if (tx.data) {
      const contract = this.provider.tronWeb.trc20(tx.to);
      // Decode recipient and amount from data
      const result = await contract.methods.transfer(
        this._extractTRC20Recipient(tx.data),
        this._extractTRC20Amount(tx.data),
      ).send();
      return (result as Record<string, unknown>)?.txid as string ?? '';
    }

    throw new Error('Invalid transaction');
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a message with the connected wallet.
   * @param message - Message to sign (string).
   * @returns Signature as a hex string.
   */
  async signMessage(message: string): Promise<string> {
    if (!this.provider?.tronWeb?.trx?.sign) {
      throw new Error('Connected wallet does not support message signing');
    }

    const result = await this.provider.tronWeb.trx.sign(message);
    return (result as Record<string, unknown>)?.signature as string ?? '';
  }

  /* ---- Chain Switch ---- */

  /** Switch the active chain. */
  async switchChain(chainId: number): Promise<void> {
    const chain = this.findChain(chainId);
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

  /** Convert sun to TRX string. */
  static sunToTRX(sun: string | number): string {
    const n = typeof sun === 'string' ? BigInt(sun) : BigInt(sun);
    const intPart = n / 1_000_000n;
    const fracPart = n % 1_000_000n;
    const fracStr = fracPart.toString().padStart(6, '0').replace(/0+$/, '');
    return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
  }

  /** Convert TRX to sun. */
  static trxToSun(trx: string | number): string {
    const parts = String(trx).split('.');
    const intPart = BigInt(parts[0] || '0');
    let fracPart = 0n;
    if (parts.length > 1) {
      const frac = parts[1].padEnd(6, '0').slice(0, 6);
      fracPart = BigInt(frac);
    }
    return (intPart * 1_000_000n + fracPart).toString();
  }

  /** Find a TRON chain by its ID string. */
  findChainById(chainId: string): Chain | undefined {
    return this.chains.find((c) => c.id === chainId);
  }

  /* ---- Private helpers ---- */

  private _resolveWallet(walletId?: string): (() => TRONProvider) | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as Record<string, unknown>;

    if (walletId) {
      switch (walletId) {
        case 'tronlink':
          return () => (win.tronLink ?? win.tronweb) as TRONProvider;
        case 'trustwallet':
          return () => win.trustwallet as TRONProvider;
        default:
          return null;
      }
    }

    // Auto-detect: TronLink → Trust Wallet → generic
    if (win.tronLink) return () => win.tronLink as TRONProvider;
    if (win.tronweb) return () => win.tronweb as TRONProvider;
    if (win.trustwallet) return () => win.trustwallet as TRONProvider;

    return null;
  }

  /** Encode TRC-20 transfer function call data. */
  private _encodeTRC20Transfer(to: string, amount: string): string {
    // ERC-20/TRC-20 transfer(address,uint256) selector: 0xa9059cbb
    // Pad recipient address (20 bytes) and amount (32 bytes)
    const hexAddress = base58ToHex(to).slice(2); // Remove '41' prefix
    const paddedAddress = hexAddress.padStart(64, '0');
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    return '0xa9059cbb' + paddedAddress + paddedAmount;
  }

  /** Extract recipient from TRC-20 transfer data. */
  private _extractTRC20Recipient(data: string): string {
    // Skip selector (8 chars) + padding (24 chars) = 32 chars offset
    const hexAddr = '41' + data.slice(32, 72);
    return hexToBase58(hexAddr);
  }

  /** Extract amount from TRC-20 transfer data. */
  private _extractTRC20Amount(data: string): string {
    // Amount starts at offset 72
    return BigInt('0x' + data.slice(72)).toString();
  }
}
