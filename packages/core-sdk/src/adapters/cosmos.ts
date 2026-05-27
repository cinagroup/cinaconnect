/**
 * Cosmos Chain Adapter — provides Cosmos/CosmWasm-specific operations.
 *
 * Uses Keplr wallet for signing and broadcasting. Supports native chain
 * transfers, CosmWasm smart contract execution, and ADR-36 message signing.
 * Implements bech32 address encoding/decoding natively (no external deps).
 * Compatible with Cosmos Hub, Osmosis, Juno, Secret Network, and other
 * Cosmos SDK chains.
 */

import type { Connector } from '../connector.js';
import type { Chain } from '../types.js';

/* ------------------------------------------------------------------ */
/*  Bech32 address encoding / decoding (BIP-173 / BIP-350)            */
/* ------------------------------------------------------------------ */

const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const BECH32_FROM_CHAR = new Map<string, number>();
for (let i = 0; i < BECH32_ALPHABET.length; i++) {
  BECH32_FROM_CHAR.set(BECH32_ALPHABET[i], i);
}

/** Expand the HRP for checksum computation. */
function _hrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) >> 5);
  }
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) & 31);
  }
  return ret;
}

/** Polymod for bech32 checksum. */
function _polymod(values: number[]): number {
  let chk = 1;
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  for (let p = 0; p < values.length; p++) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        chk ^= GEN[i];
      }
    }
  }
  return chk;
}

/** Generate checksum (bech32, constant 1). */
function _createChecksum(hrp: string, data: number[]): number[] {
  const values = _hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = _polymod(values) ^ 1;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) {
    ret.push((mod >> (5 * (5 - i))) & 31);
  }
  return ret;
}

/** Verify checksum. */
function _verifyChecksum(hrp: string, data: number[]): number | null {
  const mod = _polymod(_hrpExpand(hrp).concat(data));
  if (mod !== 1) return null;
  return data.length >= 6 ? data[data.length - 6] : null;
}

/** Convert 5-bit groups to 8-bit bytes. */
function _convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] | null {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxV = (1 << toBits) - 1;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (value < 0 || (value >> fromBits) !== 0) return null;
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxV);
    }
  }
  if (pad) {
    if (bits > 0) ret.push((acc << (toBits - bits)) & maxV);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxV) !== 0) {
    return null;
  }
  return ret;
}

/** Encode data to bech32. */
export function bech32Encode(hrp: string, data: number[]): string {
  const combined = data.concat(_createChecksum(hrp, data));
  let result = hrp + '1';
  for (const d of combined) {
    result += BECH32_ALPHABET[d];
  }
  return result;
}

/** Decode a bech32 string. Returns { hrp, data } or null. */
export function bech32Decode(bech32String: string): { hrp: string; data: number[] } | null {
  if (bech32String.length < 8 || bech32String.length > 1000) return null;

  // Check all lowercase or all uppercase (no mixed case)
  let hasLower = false;
  let hasUpper = false;
  for (let i = 0; i < bech32String.length; i++) {
    const c = bech32String.charCodeAt(i);
    if (c >= 97 && c <= 122) hasLower = true;
    if (c >= 65 && c <= 90) hasUpper = true;
  }
  if (hasLower && hasUpper) return null;

  const lower = bech32String.toLowerCase();
  const sep = lower.lastIndexOf('1');
  if (sep === -1 || sep === 0 || sep === lower.length - 1) return null;

  const hrp = lower.slice(0, sep);
  if (hrp.length < 1 || hrp.length > 83) return null;

  // Validate HRP characters (33–126)
  for (let i = 0; i < hrp.length; i++) {
    const c = hrp.charCodeAt(i);
    if (c < 33 || c > 126) return null;
  }

  const data: number[] = [];
  for (let i = sep + 1; i < lower.length; i++) {
    const d = BECH32_FROM_CHAR.get(lower[i]);
    if (d === undefined) return null;
    data.push(d);
  }

  if (_verifyChecksum(hrp, data) === null) return null;

  return { hrp, data: data.slice(0, -6) };
}

/** Encode raw bytes to a bech32 address with the given prefix. */
export function bech32FromBytes(hrp: string, bytes: Uint8Array): string {
  const data = _convertBits(Array.from(bytes), 8, 5, true);
  if (!data) throw new Error('Failed to convert bytes to 5-bit groups');
  return bech32Encode(hrp, data);
}

/** Decode a bech32 address to raw bytes. */
export function bech32ToBytes(bech32String: string): Uint8Array | null {
  const decoded = bech32Decode(bech32String);
  if (!decoded) return null;
  const bytes = _convertBits(decoded.data, 5, 8, false);
  if (!bytes) return null;
  return new Uint8Array(bytes);
}

/* ------------------------------------------------------------------ */
/*  Address validation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate a bech32 Cosmos address.
 * - Must decode successfully
 * - Must have a valid prefix
 * - Must have at least 20 bytes of data
 */
export function isValidCosmosAddress(address: string, prefixes?: string[]): boolean {
  if (typeof address !== 'string') return false;
  const decoded = bech32Decode(address);
  if (!decoded) return false;
  const bytes = _convertBits(decoded.data, 5, 8, false);
  if (!bytes || bytes.length < 20) return false;
  if (prefixes && !prefixes.includes(decoded.hrp)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Cosmos transaction types                                           */
/* ------------------------------------------------------------------ */

/**
 * Cosmos SDK message (simplified).
 * Supports common message types: bank Send, CosmWasm Execute, etc.
 */
export interface CosmosMsg {
  /** Message type URI (e.g. '/cosmos.bank.v1beta1.MsgSend'). */
  typeUrl: string;
  /** Message value as JSON-compatible object. */
  value: Record<string, unknown>;
}

/**
 * Cosmos fee descriptor.
 */
export interface CosmosFee {
  /** Gas limit. */
  gas: string;
  /** Fee amount as array of coins. */
  amount: CosmosCoin[];
}

/**
 * Cosmos coin descriptor.
 */
export interface CosmosCoin {
  /** Denom (e.g. 'uatom', 'uosmo'). */
  denom: string;
  /** Amount in smallest unit (string). */
  amount: string;
}

/**
 * Full Cosmos transaction descriptor.
 */
export interface CosmosTransaction {
  /** Messages to include. */
  messages: CosmosMsg[];
  /** Fee (gas + amount). */
  fee: CosmosFee;
  /** Optional memo. */
  memo?: string;
  /** Optional timeout height. */
  timeoutHeight?: number;
}

/**
 * Native token transfer descriptor.
 */
export interface CosmosTransfer {
  /** Recipient bech32 address. */
  to: string;
  /** Coin to send. */
  coin: CosmosCoin;
}

/**
 * CosmWasm execute message descriptor.
 */
export interface CosmWasmExecute {
  /** Contract bech32 address. */
  contractAddress: string;
  /** Execute message (JSON-serializable). */
  msg: Record<string, unknown>;
  /** Coins to attach (optional). */
  funds?: CosmosCoin[];
}

/* ------------------------------------------------------------------ */
/*  Keplr wallet interface                                             */
/* ------------------------------------------------------------------ */

/** Keplr chain info for registration. */
interface KeplrChainInfo {
  chainId: string;
  chainName: string;
  rpc: string;
  rest: string;
  stakeCurrency: { coinDenom: string; coinMinimalDenom: string; coinDecimals: number };
  bip44: { coinType: number };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: { coinDenom: string; coinMinimalDenom: string; coinDecimals: number }[];
  feeCurrencies: { coinDenom: string; coinMinimalDenom: string; coinDecimals: number; gasPriceStep?: { low: number; average: number; high: number } }[];
  coinType?: number;
  gasPriceStep?: { low: number; average: number; high: number };
}

/** Keplr offline signer (for ADR-36 signing). */
interface KeplrOfflineSigner {
  getAccounts(): Promise<{ address: string; pubkey: Uint8Array }[]>;
  signDirect(signerAddress: string, signDoc: {
    bodyBytes: Uint8Array;
    authInfoBytes: Uint8Array;
    chainId: string;
    accountNumber: number;
  }): Promise<{
    signed: {
      bodyBytes: Uint8Array;
      authInfoBytes: Uint8Array;
      chainId: string;
      accountNumber: number;
    };
    signature: { pub_key: { type: string; value: string }; signature: string };
  }>;
  signAmino?(signerAddress: string, signDoc: {
    chain_id: string;
    account_number: string;
    sequence: string;
    fee: { amount: { denom: string; amount: string }[]; gas: string };
    msgs: unknown[];
    memo: string;
  }): Promise<{
    signed: unknown;
    signature: { pub_key: { type: string; value: string }; signature: string };
  }>;
}

/** Keplr wallet provider. */
interface KeplrProvider {
  /** Enable access to a chain. */
  enable(chainId: string): Promise<void>;
  /** Get the offline signer for a chain. */
  getOfflineSigner(chainId: string): KeplrOfflineSigner;
  /** Get offline signer for ADR-36 (signArbitrary). */
  signArbitrary?(chainId: string, signer: string, data: string | Uint8Array): Promise<{
    signature: string;
    pub_key: { type: string; value: string };
    signed: string;
  }>;
  /** Send a transaction (broadcast). */
  sendTx(chainId: string, tx: Uint8Array, mode: 'sync' | 'async'): Promise<Uint8Array>;
  /** Get key (address + pubkey). */
  getKey(chainId: string): Promise<{
    name: string;
    algo: string;
    pubKey: Uint8Array;
    address: Uint8Array;
    bech32Address: string;
    isNanoLedger: boolean;
  }>;
  /** Suggest a new chain. */
  experimentalSuggestChain(chainInfo: KeplrChainInfo): Promise<void>;
  /** Disconnect. */
  disconnect?(): Promise<void>;
  /** Event listeners. */
  on?(event: string, callback: (...args: unknown[]) => void): void;
  off?(event: string, callback: (...args: unknown[]) => void): void;
}

/** Window type with Keplr. */
interface KeplrWindow extends Window {
  keplr?: KeplrProvider;
}

/* ------------------------------------------------------------------ */
/*  Cosmos chain presets                                               */
/* ------------------------------------------------------------------ */

export interface CosmosWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  downloadUrl: string;
}

export const COSMOS_WALLETS: CosmosWalletInfo[] = [
  {
    id: 'keplr',
    name: 'Keplr',
    rdns: 'com.keplr',
    icon: 'https://keplr.app/icons/icon-192.png',
    downloadUrl: 'https://keplr.app/download',
  },
  {
    id: 'leap',
    name: 'Leap Cosmos Wallet',
    rdns: 'com.leapwallet',
    icon: 'https://www.leapwallet.io/assets/images/leap-logo.png',
    downloadUrl: 'https://www.leapwallet.io/download',
  },
  {
    id: 'cosmostation',
    name: 'Cosmostation',
    rdns: 'com.cosmostation',
    icon: 'https://www.cosmostation.io/favicon.ico',
    downloadUrl: 'https://www.cosmostation.io',
  },
];

/** Well-known Cosmos chain presets. */
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
    id: 'cosmos:juno-1',
    name: 'Juno',
    rpcUrl: 'https://rpc.juno.chaintools.tech',
    nativeCurrency: { name: 'Juno', symbol: 'JUNO', decimals: 6 },
    explorerUrl: 'https://www.mintscan.io/juno',
    iconUrl: 'https://cryptologos.cc/logos/juno-network-juno-logo.svg',
  },
  {
    id: 'cosmos:secret-4',
    name: 'Secret Network',
    rpcUrl: 'https://rpc.secret.network',
    nativeCurrency: { name: 'Secret', symbol: 'SCRT', decimals: 6 },
    explorerUrl: 'https://www.mintscan.io/secret',
    iconUrl: 'https://cryptologos.cc/logos/secret-scit-logo.svg',
  },
  {
    id: 'cosmos:theta-testnet-001',
    name: 'Cosmos Hub Testnet',
    rpcUrl: 'https://rpc.sentry-01.theta-testnet.polypore.xyz',
    nativeCurrency: { name: 'Cosmos', symbol: 'ATOM', decimals: 6 },
    explorerUrl: 'https://testnet.mintscan.io/cosmoshub-testnet',
    iconUrl: 'https://cryptologos.cc/logos/cosmos-atom-logo.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  Cosmos RPC client (lightweight, no @cosmjs dependency)            */
/* ------------------------------------------------------------------ */

/** Query response from Cosmos REST API. */
interface CosmosRestResponse<T> {
  balance?: { denom: string; amount: string };
  balances?: { denom: string; amount: string }[];
  account?: {
    '@type': string;
    address: string;
    pub_key?: unknown;
    account_number: string;
    sequence: string;
  };
  tx_response?: {
    txhash: string;
    code?: number;
    raw_log?: string;
    gas_used?: string;
    gas_wanted?: string;
  };
  result?: T;
}

/** Cosmos RPC client for HTTP queries. */
class CosmosRpcClient {
  private rpcUrl: string;
  private restUrl: string;

  constructor(rpcUrl: string, restUrl?: string) {
    this.rpcUrl = rpcUrl;
    this.restUrl = restUrl ?? rpcUrl.replace('rpc.', 'rest.').replace('/rpc', '/rest');
  }

  /** Query balance via REST API. */
  async getBalance(address: string, denom: string): Promise<string> {
    const url = `${this.restUrl}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${denom}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = (await resp.json()) as { balance?: { amount: string } };
    return data.balance?.amount ?? '0';
  }

  /** Query all balances. */
  async getAllBalances(address: string): Promise<{ denom: string; amount: string }[]> {
    const url = `${this.restUrl}/cosmos/bank/v1beta1/balances/${address}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = (await resp.json()) as { balances?: { denom: string; amount: string }[] };
    return data.balances ?? [];
  }

  /** Query account info. */
  async getAccount(address: string): Promise<{ accountNumber: string; sequence: string } | null> {
    const url = `${this.restUrl}/cosmos/auth/v1beta1/accounts/${address}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = (await resp.json()) as { account?: { account_number: string; sequence: string } };
    if (!data.account) return null;
    return {
      accountNumber: data.account.account_number,
      sequence: data.account.sequence,
    };
  }

  /** Broadcast a transaction. */
  async broadcastTx(txBytes: Uint8Array, mode: 'sync' | 'async' = 'sync'): Promise<string> {
    const url = `${this.rpcUrl}/cosmos/tx/v1beta1/txs`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_bytes: Buffer.from(txBytes).toString('base64'),
        mode: mode === 'sync' ? 'BROADCAST_MODE_SYNC' : 'BROADCAST_MODE_ASYNC',
      }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = (await resp.json()) as { tx_response?: { txhash: string; code?: number } };
    if (data.tx_response?.code && data.tx_response.code !== 0) {
      throw new Error(`Transaction failed: ${data.tx_response.txhash}`);
    }
    return data.tx_response?.txhash ?? '';
  }

  /** Query transaction by hash. */
  async getTx(hash: string): Promise<unknown> {
    const url = `${this.rpcUrl}/cosmos/tx/v1beta1/txs/${hash}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  }

  /** Query a CosmWasm smart contract. */
  async queryContract(contractAddress: string, query: Record<string, unknown>): Promise<unknown> {
    const queryBase64 = Buffer.from(JSON.stringify(query)).toString('base64');
    const url = `${this.restUrl}/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${queryBase64}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = (await resp.json()) as { data?: unknown };
    return data.data;
  }

  /** Query Cosmos module path (for LCD/REST). */
  async query(path: string): Promise<unknown> {
    const url = `${this.restUrl}${path}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  }
}

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter                                                  */
/* ------------------------------------------------------------------ */

/**
 * Cosmos chain adapter implementing chain-specific operations.
 *
 * Wraps Keplr/Leap wallet with Cosmos SDK operations:
 * - Native balance queries (REST API)
 * - Bank module transfers
 * - CosmWasm smart contract execution
 * - ADR-36 message signing
 * - bech32 address handling
 * - Chain registration with Keplr
 */
export class CosmosChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'cosmos-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'Cosmos Chain Adapter';

  private keplr: KeplrProvider | null = null;
  private chains: Chain[] = [];
  private chainId: string = COSMOS_CHAINS[0].id;
  private rpcUrl: string = COSMOS_CHAINS[0].rpcUrl;
  private _accounts: string[] = [];
  private _rpcClient: CosmosRpcClient | null = null;
  private _connector: Connector | null = null;

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. */
  setConnector(connector: Connector): void {
    this._connector = connector;
  }

  /** Register supported Cosmos chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
  }

  /** Set the RPC endpoint URL. */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
    this._rpcClient = null; // Reset cached client
  }

  /** Find a chain by numeric ID (maps to first matching chain). */
  findChain(_chainId: number): Chain | undefined {
    return this.chains[0];
  }

  /** Find a chain by its string ID. */
  findChainById(chainId: string): Chain | undefined {
    return this.chains.find((c) => c.id === chainId);
  }

  /** Set the active Keplr provider. */
  setKeplr(keplr: KeplrProvider): void {
    this.keplr = keplr;
  }

  /** Get the current Keplr provider. */
  getKeplr(): KeplrProvider | null {
    return this.keplr;
  }

  /** Get the RPC client (lazy-init). */
  private _getRpcClient(): CosmosRpcClient {
    if (!this._rpcClient) {
      this._rpcClient = new CosmosRpcClient(this.rpcUrl);
    }
    return this._rpcClient;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a Cosmos wallet via Keplr.
   * Tries Keplr → Leap → Cosmostation in order.
   * @param walletId - Optional wallet ID to prefer.
   * @param chainId - Chain ID to connect to (e.g. 'cosmoshub-4').
   * @returns Array of connected addresses (bech32).
   */
  async connect(walletId?: string, chainId?: string): Promise<string[]> {
    const target = this._resolveWallet(walletId);
    if (!target) {
      throw new Error(
        'No Cosmos wallet found. Install Keplr, Leap, or Cosmostation.',
      );
    }

    this.keplr = target;

    const cid = chainId ?? this._extractChainId(this.chainId);
    await this.keplr.enable(cid);

    const key = await this.keplr.getKey(cid);
    this._accounts = [key.bech32Address];

    return this._accounts;
  }

  /** Disconnect from the wallet. */
  async disconnect(): Promise<void> {
    this._accounts = [];
    if (this.keplr?.disconnect) {
      await this.keplr.disconnect();
    }
    this.keplr = null;
  }

  /** Get the connected address. */
  getAddress(): string | null {
    return this._accounts[0] ?? null;
  }

  /** Get connected account addresses. Required by ChainAdapter interface. */
  async getAccounts(): Promise<string[]> {
    if (!this.keplr) throw new Error('Not connected');
    const cid = this._extractChainId(this.chainId);
    const key = await this.keplr.getKey(cid);
    return [key.bech32Address];
  }

  /* ---- Chain ID ---- */

  /**
   * Get the current chain ID.
   * Returns the string chain ID parsed to number (0 if non-numeric).
   */
  async getChainId(): Promise<string> {
    return this.chainId;
  }

  /**
   * Get numeric chain ID (for ChainAdapter compatibility).
   * Cosmos chains use string IDs; this returns a hash for compatibility.
   */
  getChainIdNumeric(): number {
    // Simple hash of the chain ID string for numeric compatibility
    let hash = 0;
    for (let i = 0; i < this.chainId.length; i++) {
      hash = ((hash << 5) - hash) + this.chainId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /* ---- Balance ---- */

  /**
   * Get native token balance for an address.
   * @param address - Bech32 address.
   * @param denom - Optional denom (defaults to first chain's native denom).
   * @returns Balance in smallest unit (string).
   */
  async getBalance(address: string, denom?: string): Promise<string> {
    if (!isValidCosmosAddress(address)) {
      throw new Error(`Invalid Cosmos address: ${address}`);
    }

    const targetDenom = denom ?? this._getDefaultDenom();

    try {
      return await this._getRpcClient().getBalance(address, targetDenom);
    } catch {
      return '0';
    }
  }

  /**
   * Get formatted balance in native token (decimal string).
   * @param address - Bech32 address.
   * @param denom - Optional denom.
   * @returns Balance as decimal string (e.g. "12.345678").
   */
  async getBalanceFormatted(address: string, denom?: string): Promise<string> {
    const raw = await this.getBalance(address, denom);
    const decimals = this._getDefaultDecimals();
    return CosmosChainAdapter.formatBalance(raw, decimals);
  }

  /**
   * Get all balances for an address.
   * @param address - Bech32 address.
   * @returns Array of { denom, amount }.
   */
  async getAllBalances(address: string): Promise<{ denom: string; amount: string }[]> {
    if (!isValidCosmosAddress(address)) {
      throw new Error(`Invalid Cosmos address: ${address}`);
    }

    try {
      return await this._getRpcClient().getAllBalances(address);
    } catch {
      return [];
    }
  }

  /* ---- Transactions ---- */

  /**
   * Build a native token transfer message (bank module).
   * @param to - Recipient bech32 address.
   * @param coin - Coin to send.
   * @returns CosmosMsg for bank send.
   */
  buildTransferMsg(to: string, coin: CosmosCoin): CosmosMsg {
    if (!isValidCosmosAddress(to)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }

    const from = this.getAddress();
    if (!from) throw new Error('No connected address');

    return {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: from,
        toAddress: to,
        amount: [coin],
      },
    };
  }

  /**
   * Build a CosmWasm execute message.
   * @param params - Execute parameters.
   * @returns CosmosMsg for Wasm execute.
   */
  buildWasmExecuteMsg(params: CosmWasmExecute): CosmosMsg {
    if (!isValidCosmosAddress(params.contractAddress)) {
      throw new Error(`Invalid contract address: ${params.contractAddress}`);
    }

    const from = this.getAddress();
    if (!from) throw new Error('No connected address');

    return {
      typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
      value: {
        sender: from,
        contract: params.contractAddress,
        msg: params.msg,
        funds: params.funds ?? [],
      },
    };
  }

  /**
   * Build a complete Cosmos transaction.
   * @param params - Transaction parameters.
   * @returns CosmosTransaction ready for signing.
   */
  buildTransaction(params: {
    messages: CosmosMsg[];
    fee: CosmosFee;
    memo?: string;
  }): CosmosTransaction {
    return {
      messages: params.messages,
      fee: params.fee,
      memo: params.memo ?? '',
    };
  }

  /**
   * Send a transaction via the connected wallet.
   * @param tx - CosmosTransaction or CosmosMsg (single message).
   * @returns Transaction hash (hex).
   */
  async sendTransaction(tx: CosmosTransaction | CosmosMsg): Promise<string> {
    if (!this.keplr) throw new Error('No provider connected');

    const cid = this._extractChainId(this.chainId);

    // If it's a single message, wrap it in a transaction
    const fullTx: CosmosTransaction = 'messages' in tx
      ? tx
      : {
          messages: [tx],
          fee: { gas: '250000', amount: [] },
          memo: '',
        };

    // Use Keplr's signer to sign and broadcast
    const signer = this.keplr.getOfflineSigner(cid);
    const from = this.getAddress();
    if (!from) throw new Error('No connected address');

    // Get account info
    const account = await this._getRpcClient().getAccount(from);
    if (!account) throw new Error(`Account not found: ${from}`);

    // Build SignDoc for signDirect
    // Note: In production, you'd use a proper protobuf encoder.
    // Here we delegate to the wallet's signDirect method which handles encoding.
    try {
      // Attempt signDirect (preferred for Ledger + modern wallets)
      const result = await signer.signDirect(from, {
        bodyBytes: this._encodeTxBody(fullTx.messages, fullTx.memo ?? '', fullTx.timeoutHeight),
        authInfoBytes: this._encodeAuthInfo(fullTx.fee),
        chainId: cid,
        accountNumber: parseInt(account.accountNumber, 10),
      });

      // Encode the signed tx and broadcast
      const txBytes = this._encodeSignedTx(result);
      const txHash = await this._getRpcClient().broadcastTx(txBytes, 'sync');
      return txHash;
    } catch (directError) {
      // Fallback to Amino signing (for legacy wallets / Ledger)
      if ((signer as KeplrOfflineSigner).signAmino) {
        return this._sendAmino(fullTx, signer as KeplrOfflineSigner, from, cid, account);
      }
      throw directError;
    }
  }

  /**
   * Execute a CosmWasm contract.
   * @param params - Execute parameters.
   * @param fee - Optional fee override.
   * @returns Transaction hash.
   */
  async executeWasm(
    params: CosmWasmExecute,
    fee?: CosmosFee,
  ): Promise<string> {
    // Validate provider first (before buildWasmExecuteMsg checks address)
    if (!this.keplr) throw new Error('No provider connected');

    const msg = this.buildWasmExecuteMsg(params);
    const tx = this.buildTransaction({
      messages: [msg],
      fee: fee ?? { gas: '500000', amount: [] },
    });
    return this.sendTransaction(tx);
  }

  /**
   * Query a CosmWasm smart contract (read-only).
   * @param contractAddress - Contract bech32 address.
   * @param query - Query message.
   * @returns Query result.
   */
  async queryWasm(contractAddress: string, query: Record<string, unknown>): Promise<unknown> {
    return this._getRpcClient().queryContract(contractAddress, query);
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a message using ADR-36 (Cosmos standard for off-chain signing).
   * @param message - Message to sign (string or Uint8Array).
   * @returns Signature as a base64 string.
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.keplr) throw new Error('No provider connected');

    const from = this.getAddress();
    if (!from) throw new Error('No connected address');

    const cid = this._extractChainId(this.chainId);
    const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);

    // Try signArbitrary first (Keplr's off-chain signing)
    if (this.keplr.signArbitrary) {
      const result = await this.keplr.signArbitrary(cid, from, msgStr);
      return result.signature;
    }

    // Fallback: build an ADR-36 amino sign doc
    const signer = this.keplr.getOfflineSigner(cid);
    if (!(signer as KeplrOfflineSigner).signAmino) {
      throw new Error('Connected wallet does not support message signing');
    }

    // ADR-36 sign doc
    const signDoc = {
      chain_id: '',
      account_number: '0',
      sequence: '0',
      fee: { amount: [], gas: '0' },
      msgs: [{
        type: 'sign/MsgSignData',
        value: {
          signer: from,
          data: Buffer.from(msgStr).toString('base64'),
        },
      }],
      memo: '',
    };

    const result = await (signer as KeplrOfflineSigner).signAmino!(from, signDoc);
    return result.signature.signature;
  }

  /**
   * Sign a transaction (returns signature without broadcasting).
   * @param tx - CosmosTransaction.
   * @returns Signed transaction data.
   */
  async signTransaction(tx: CosmosTransaction): Promise<{
    signature: string;
    pubKey: string;
    signedTx: CosmosTransaction;
  }> {
    if (!this.keplr) throw new Error('No provider connected');

    const cid = this._extractChainId(this.chainId);
    const from = this.getAddress();
    if (!from) throw new Error('No connected address');

    const signer = this.keplr.getOfflineSigner(cid);
    const key = await this.keplr.getKey(cid);
    const account = await this._getRpcClient().getAccount(from);
    if (!account) throw new Error(`Account not found: ${from}`);

    const result = await signer.signDirect(from, {
      bodyBytes: this._encodeTxBody(tx.messages, tx.memo ?? '', tx.timeoutHeight),
      authInfoBytes: this._encodeAuthInfo(tx.fee),
      chainId: cid,
      accountNumber: parseInt(account.accountNumber, 10),
    });

    return {
      signature: result.signature.signature,
      pubKey: Buffer.from(key.pubKey).toString('base64'),
      signedTx: tx,
    };
  }

  /* ---- Chain Switch ---- */

  /**
   * Switch the active chain.
   * @param chainId - Numeric chain ID (for compatibility).
   */
  async switchChain(chainId: number): Promise<void> {
    const chain = this.findChain(chainId);
    if (chain) {
      this.chainId = chain.id;
      this.rpcUrl = chain.rpcUrl;
      this._rpcClient = null;

      // Re-enable in Keplr
      if (this.keplr) {
        const cid = this._extractChainId(this.chainId);
        await this.keplr.enable(cid);
        const key = await this.keplr.getKey(cid);
        this._accounts = [key.bech32Address];
      }
    }
  }

  /** Switch chain by string ID. */
  async switchChainById(chainId: string): Promise<void> {
    const chain = this.findChainById(chainId);
    if (!chain) throw new Error(`Chain not found: ${chainId}`);
    this.chainId = chain.id;
    this.rpcUrl = chain.rpcUrl;
    this._rpcClient = null;

    if (this.keplr) {
      const cid = this._extractChainId(this.chainId);
      await this.keplr.enable(cid);
      const key = await this.keplr.getKey(cid);
      this._accounts = [key.bech32Address];
    }
  }

  /* ---- Chain Registration ---- */

  /**
   * Register a custom chain with Keplr.
   * Used for chains not in Keplr's default list.
   * @param chain - Chain definition.
   * @param bech32Prefix - Address prefix (e.g. 'cosmos', 'osmo').
   */
  async registerChainWithKeplr(chain: Chain, bech32Prefix: string): Promise<void> {
    if (!this.keplr?.experimentalSuggestChain) {
      throw new Error('Connected wallet does not support chain registration');
    }

    const decimals = chain.nativeCurrency?.decimals ?? 6;
    const symbol = chain.nativeCurrency?.symbol ?? 'ATOM';

    await this.keplr.experimentalSuggestChain({
      chainId: this._extractChainId(chain.id),
      chainName: chain.name,
      rpc: chain.rpcUrl,
      rest: chain.rpcUrl.replace('rpc.', 'rest.').replace('/rpc', '/rest'),
      stakeCurrency: {
        coinDenom: symbol,
        coinMinimalDenom: `u${symbol.toLowerCase()}`,
        coinDecimals: decimals,
      },
      bip44: { coinType: 118 },
      bech32Config: {
        bech32PrefixAccAddr: bech32Prefix,
        bech32PrefixAccPub: `${bech32Prefix}pub`,
        bech32PrefixValAddr: `${bech32Prefix}valoper`,
        bech32PrefixValPub: `${bech32Prefix}valoperpub`,
        bech32PrefixConsAddr: `${bech32Prefix}valcons`,
        bech32PrefixConsPub: `${bech32Prefix}valconspub`,
      },
      currencies: [{
        coinDenom: symbol,
        coinMinimalDenom: `u${symbol.toLowerCase()}`,
        coinDecimals: decimals,
      }],
      feeCurrencies: [{
        coinDenom: symbol,
        coinMinimalDenom: `u${symbol.toLowerCase()}`,
        coinDecimals: decimals,
        gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 },
      }],
      gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 },
    });
  }

  /* ---- Utility ---- */

  /**
   * Convert smallest unit to decimal string.
   */
  static formatBalance(amount: string, decimals: number): string {
    const n = BigInt(amount);
    const divisor = 10n ** BigInt(decimals);
    const intPart = n / divisor;
    const fracPart = n % divisor;
    const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
    return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
  }

  /**
   * Convert decimal to smallest unit.
   */
  static toSmallestUnit(value: string, decimals: number): string {
    const parts = value.split('.');
    const intPart = BigInt(parts[0] || '0');
    let fracPart = 0n;
    if (parts.length > 1) {
      const frac = parts[1].padEnd(decimals, '0').slice(0, decimals);
      fracPart = BigInt(frac);
    }
    return (intPart * 10n ** BigInt(decimals) + fracPart).toString();
  }

  /** Get the default denom for the current chain. */
  private _getDefaultDenom(): string {
    const chain = this.findChainById(this.chainId);
    const symbol = chain?.nativeCurrency?.symbol ?? 'ATOM';
    return `u${symbol.toLowerCase()}`;
  }

  /** Get the default decimals for the current chain. */
  private _getDefaultDecimals(): number {
    const chain = this.findChainById(this.chainId);
    return chain?.nativeCurrency?.decimals ?? 6;
  }

  /** Extract the chain ID string from the full ID (e.g. 'cosmoshub-4' from 'cosmos:cosmoshub-4'). */
  private _extractChainId(fullId: string): string {
    const colonIdx = fullId.indexOf(':');
    return colonIdx >= 0 ? fullId.slice(colonIdx + 1) : fullId;
  }

  /* ---- Private: Amino send fallback ---- */

  private async _sendAmino(
    tx: CosmosTransaction,
    signer: KeplrOfflineSigner,
    from: string,
    chainId: string,
    account: { accountNumber: string; sequence: string },
  ): Promise<string> {
    const aminoMsgs = tx.messages.map((msg) => this._toAminoMsg(msg));

    const signDoc = {
      chain_id: chainId,
      account_number: account.accountNumber,
      sequence: account.sequence,
      fee: {
        amount: tx.fee.amount,
        gas: tx.fee.gas,
      },
      msgs: aminoMsgs,
      memo: tx.memo ?? '',
    };

    const result = await (signer as KeplrOfflineSigner).signAmino!(from, signDoc);

    // Encode and broadcast
    const txBytes = this._encodeAminoSignedTx(result.signed, result.signature);
    return this._getRpcClient().broadcastTx(txBytes, 'sync');
  }

  /* ---- Private: Transaction encoding (minimal) ---- */

  /**
   * Encode a tx body.
   * In production, use a real protobuf encoder (@cosmjs/proto-signing).
   * This minimal implementation is for browser-only use with Keplr.
   */
  private _encodeTxBody(
    messages: CosmosMsg[],
    memo: string,
    timeoutHeight?: number,
  ): Uint8Array {
    // Delegate to Keplr's encoding by providing raw message data.
    // In a full implementation, you'd use protobuf encoding here.
    // Keplr's signDirect can handle this internally.
    // For now, we encode as JSON (works with Keplr's amino fallback).
    const body = {
      messages: messages.map((m) => ({ typeUrl: m.typeUrl, value: m.value })),
      memo,
      timeoutHeight: timeoutHeight ?? 0,
      extensionOptions: [],
    };
    return new TextEncoder().encode(JSON.stringify(body));
  }

  /** Encode auth info. */
  private _encodeAuthInfo(fee: CosmosFee): Uint8Array {
    const auth = {
      fee: {
        amount: fee.amount,
        gasLimit: fee.gas,
      },
    };
    return new TextEncoder().encode(JSON.stringify(auth));
  }

  /** Encode a signed transaction. */
  private _encodeSignedTx(result: {
    signed: { bodyBytes: Uint8Array; authInfoBytes: Uint8Array; chainId: string; accountNumber: number };
    signature: { pub_key: { type: string; value: string }; signature: string };
  }): Uint8Array {
    // Minimal encoding — the actual protobuf encoding is handled by Keplr
    // in production. This is a placeholder for the broadcast layer.
    const tx = {
      body: result.signed,
      authInfo: result.signed,
      signatures: [result.signature.signature],
    };
    return new TextEncoder().encode(JSON.stringify(tx));
  }

  /** Encode an amino-signed transaction. */
  private _encodeAminoSignedTx(
    signed: unknown,
    signature: { pub_key: { type: string; value: string }; signature: string },
  ): Uint8Array {
    const tx = {
      body: { messages: (signed as Record<string, unknown>).msgs ?? [], memo: '' },
      auth_info: {},
      signatures: [signature.signature],
    };
    return new TextEncoder().encode(JSON.stringify(tx));
  }

  /** Convert a CosmosMsg to amino format. */
  private _toAminoMsg(msg: CosmosMsg): unknown {
    switch (msg.typeUrl) {
      case '/cosmos.bank.v1beta1.MsgSend':
        return {
          type: 'cosmos-sdk/MsgSend',
          value: {
            from_address: (msg.value.fromAddress as string) ?? '',
            to_address: (msg.value.toAddress as string) ?? '',
            amount: msg.value.amount,
          },
        };
      case '/cosmwasm.wasm.v1.MsgExecuteContract':
        return {
          type: 'wasm/MsgExecuteContract',
          value: {
            sender: (msg.value.sender as string) ?? '',
            contract: (msg.value.contract as string) ?? '',
            msg: msg.value.msg,
            funds: msg.value.funds ?? [],
          },
        };
      default:
        // Pass through unknown types
        return {
          type: msg.typeUrl,
          value: msg.value,
        };
    }
  }

  /* ---- Private: Wallet resolution ---- */

  private _resolveWallet(walletId?: string): KeplrProvider | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as KeplrWindow;

    if (walletId) {
      switch (walletId) {
        case 'keplr':
          return win.keplr ?? null;
        case 'leap':
          return (win as any).leap ?? win.keplr ?? null;
        case 'cosmostation':
          return (win as any).cosmostation?.keplr ?? win.keplr ?? null;
        default:
          return win.keplr ?? null;
      }
    }

    // Auto-detect: Keplr → Leap → Cosmostation
    if (win.keplr) return win.keplr;
    if ((win as any).leap) return (win as any).leap;
    if ((win as any).cosmostation?.keplr) return (win as any).cosmostation.keplr;

    return null;
  }
}
