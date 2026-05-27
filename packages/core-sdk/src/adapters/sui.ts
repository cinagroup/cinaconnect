/**
 * Sui Chain Adapter — provides Sui-specific operations.
 *
 * Uses Sui JSON-RPC for on-chain queries and the Sui wallet standard
 * (window.suiWallet) for signing and transaction submission.
 * Supports Sui Wallet, Ethos, Martian Sui, and Surf wallets.
 * Includes a native BCS (Binary Canonical Serialization) encoder/decoder,
 * transaction builder for TransferObjects, SplitCoins, MergeCoins,
 * MoveCall, and Publish operations.
 */

import type { Connector } from '../connector.js';
import type { Chain } from '../types.js';

/* ------------------------------------------------------------------ */
/*  BCS (Binary Canonical Serialization) — minimal implementation      */
/*  Adapted from the Sui Move specification.                           */
/*  For production, use @mysten/bcs or @scure/bip39.                  */
/* ------------------------------------------------------------------ */

/** BCS writer — serializes values into a byte buffer. */
export class BcsWriter {
  private data: number[] = [];
  /** Current write offset. */
  offset: number = 0;

  constructor(options?: { size?: number }) {
    if (options?.size) this.data = new Array(options.size);
  }

  /** Write a single byte (u8). */
  write8(value: number): this {
    this.data[this.offset++] = value & 0xff;
    return this;
  }

  /** Write a 16-bit unsigned integer (little-endian). */
  write16(value: number): this {
    this.data[this.offset++] = value & 0xff;
    this.data[this.offset++] = (value >> 8) & 0xff;
    return this;
  }

  /** Write a 32-bit unsigned integer (little-endian). */
  write32(value: number): this {
    this.data[this.offset++] = value & 0xff;
    this.data[this.offset++] = (value >> 8) & 0xff;
    this.data[this.offset++] = (value >> 16) & 0xff;
    this.data[this.offset++] = (value >> 24) & 0xff;
    return this;
  }

  /** Write a 64-bit unsigned integer (little-endian, as two u32s). */
  write64(value: bigint | string): this {
    const n = BigInt(value);
    const lo = Number(n & 0xffffffffn);
    const hi = Number((n >> 32n) & 0xffffffffn);
    this.write32(lo);
    this.write32(hi);
    return this;
  }

  /** Write a variable-length ULEB128-encoded integer. */
  writeUleb128(value: number): this {
    let v = value;
    while (v >= 0x80) {
      this.data[this.offset++] = (v & 0x7f) | 0x80;
      v >>= 7;
    }
    this.data[this.offset++] = v;
    return this;
  }

  /** Write a length-prefixed byte array. */
  writeBytes(data: Uint8Array | number[]): this {
    this.writeUleb128(data.length);
    for (let i = 0; i < data.length; i++) {
      this.data[this.offset++] = data[i];
    }
    return this;
  }

  /** Write a BCS-encoded string (length-prefixed UTF-8 bytes). */
  writeString(str: string): this {
    const bytes = new TextEncoder().encode(str);
    return this.writeBytes(bytes);
  }

  /** Write a fixed-length address (32 bytes). */
  writeAddress(hex: string): this {
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

  /** Get the serialized bytes as a hex string with 0x prefix. */
  toHex(): string {
    return '0x' + this.toBytesHex();
  }

  /** Get the serialized bytes as a hex string without prefix. */
  toBytesHex(): string {
    return Array.from(this.toBytes())
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/** BCS reader — deserializes values from a byte buffer. */
export class BcsReader {
  private data: Uint8Array;
  /** Current read offset. */
  offset: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  /** Read a single byte (u8). */
  read8(): number {
    return this.data[this.offset++];
  }

  /** Read a 16-bit unsigned integer (little-endian). */
  read16(): number {
    const value =
      this.data[this.offset] |
      (this.data[this.offset + 1] << 8);
    this.offset += 2;
    return value;
  }

  /** Read a 32-bit unsigned integer (little-endian). */
  read32(): number {
    const value =
      this.data[this.offset] |
      (this.data[this.offset + 1] << 8) |
      (this.data[this.offset + 2] << 16) |
      (this.data[this.offset + 3] << 24);
    this.offset += 4;
    return value >>> 0;
  }

  /** Read a 64-bit unsigned integer (little-endian, as bigint). */
  read64(): bigint {
    const lo = BigInt(this.read32());
    const hi = BigInt(this.read32());
    return lo | (hi << 32n);
  }

  /** Read a ULEB128-encoded integer. */
  readUleb128(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = this.data[this.offset++];
      result |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte >= 0x80);
    return result;
  }

  /** Read a length-prefixed byte array. */
  readBytes(): Uint8Array {
    const len = this.readUleb128();
    const bytes = this.data.slice(this.offset, this.offset + len);
    this.offset += len;
    return bytes;
  }

  /** Read a BCS-encoded string. */
  readString(): string {
    return new TextDecoder().decode(this.readBytes());
  }

  /** Read a fixed-length address (32 bytes). */
  readAddress(): string {
    const bytes = this.data.slice(this.offset, this.offset + 32);
    this.offset += 32;
    return '0x' + Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Read a boolean. */
  readBool(): boolean {
    return this.read8() === 1;
  }
}

/* ------------------------------------------------------------------ */
/*  Sui-specific BCS helpers                                           */
/* ------------------------------------------------------------------ */

/** SUI coin type tag. */
export const SUI_COIN_TYPE = '0x2::sui::SUI';

/** Well-known Sui object IDs. */
export const SUI_SYSTEM_OBJECT = '0x0000000000000000000000000000000000000000000000000000000000000005';
export const SUI_CLOCK_OBJECT = '0x0000000000000000000000000000000000000000000000000000000000000006';

/**
 * Encode a Sui coin type tag to BCS bytes.
 * Format: tag_kind (1 byte) + address + module + name + generics
 */
export function encodeTypeTag(typeStr: string): Uint8Array {
  const parts = typeStr.split('<');
  const base = parts[0];
  const generics = parts[1] ? parts[1].replace('>', '').split(',').map((s) => s.trim()) : [];

  const [address, module, name] = base.split('::');
  const writer = new BcsWriter();

  // tag_kind: 0 = bool, 1 = u8, ... 28 = struct
  writer.write8(28); // Struct
  writer.writeAddress(address);
  writer.writeString(module);
  writer.writeString(name);

  // Generics
  writer.writeUleb128(generics.length);
  for (const g of generics) {
    // Recursive encoding for nested generics
    const nested = encodeTypeTag(g.trim());
    // We need to figure out the kind - simplified: treat as struct
    writer.writeBytes(nested);
  }

  return writer.toBytes();
}

/**
 * Serialize a SUI balance to human-readable format.
 * SUI has 9 decimal places.
 */
export function formatSuiBalance(mist: string | bigint | number): string {
  const n = BigInt(mist);
  const divisor = 1_000_000_000n;
  const intPart = n / divisor;
  const fracPart = n % divisor;
  const fracStr = fracPart.toString().padStart(9, '0').replace(/0+$/, '');
  return fracStr ? `${intPart}.${fracStr}` : `${intPart}`;
}

/**
 * Parse a human-readable SUI amount to MIST (smallest unit).
 */
export function parseSuiAmount(sui: string): bigint {
  const parts = sui.split('.');
  const intPart = BigInt(parts[0] || '0');
  let fracPart = 0n;
  if (parts.length > 1) {
    const frac = parts[1].padEnd(9, '0').slice(0, 9);
    fracPart = BigInt(frac);
  }
  return intPart * 1_000_000_000n + fracPart;
}

/* ------------------------------------------------------------------ */
/*  Address validation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate a Sui address (hex string).
 * - Must start with 0x
 * - Must be 64 hex chars (32 bytes) after 0x
 */
export function isValidSuiAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  const hex = address.slice(2);
  // Allow shorter addresses (they get zero-padded to 32 bytes)
  if (hex.length === 0 || hex.length > 64) return false;
  return /^[0-9a-fA-F]+$/.test(hex);
}

/**
 * Normalize a Sui address to full 64-char hex with 0x prefix.
 */
export function normalizeSuiAddress(address: string): string {
  if (!address.startsWith('0x')) return '0x' + address.padStart(64, '0');
  return '0x' + address.slice(2).padStart(64, '0');
}

/**
 * Check if an address is a Sui object ID (valid hex with 0x prefix).
 */
export function isValidSuiObjectId(address: string): boolean {
  return isValidSuiAddress(address);
}

/* ------------------------------------------------------------------ */
/*  Base58 helpers for Sui (used in wallet interactions)               */
/* ------------------------------------------------------------------ */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

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
/*  Sui wallet provider interface                                      */
/* ------------------------------------------------------------------ */

/** A Sui object with metadata. */
export interface SuiObject {
  /** Object ID (0x-prefixed hex). */
  objectId: string;
  /** Object version. */
  version: string;
  /** Object digest (base58). */
  digest: string;
  /** Object type (e.g. '0x2::coin::Coin<0x2::sui::SUI>'). */
  type: string;
  /** Owner (address or shared). */
  owner?: string;
  /** Previous transaction that modified this object. */
  previousTransaction?: string;
}

/** A Sui coin balance. */
export interface SuiCoinBalance {
  /** Coin type. */
  coinType: string;
  /** Total balance in MIST (string for large numbers). */
  totalBalance: string;
  /** Number of coin objects. */
  coinObjectCount: number;
}

/** Sui transaction block response. */
export interface SuiTransactionResponse {
  /** Transaction digest (base58). */
  digest: string;
  /** Effects of the transaction. */
  effects?: {
    status: { status: string; error?: string };
    gasUsed: { computationCost: string; storageCost: string; storageRebate: string; nonRefundableStorageFee: string };
    gasObject: { objectId: string };
    transactionDigest: string;
    modifiedAtVersions?: { objectId: string; version: string }[];
  };
  /** Events emitted. */
  events?: unknown[];
}

/** Sui gas budget configuration. */
export interface SuiGasBudget {
  /** Maximum computation cost in MIST. */
  computationBudget?: string;
  /** Total gas budget in MIST (combined). */
  totalBudget?: string;
}

/** Sui transaction request for sendTransaction. */
export interface SuiTransactionRequest {
  /** Transaction block bytes (base64-encoded BCS). */
  txBytes: string;
  /** Gas budget in MIST. */
  gasBudget: string;
  /** Signature(s) for the transaction. */
  signatures?: string[];
}

/** Sui wallet provider (window.suiWallet style). */
export interface SuiWalletProvider {
  /** Wallet name. */
  name?: string;
  /** Wallet icon URL. */
  icon?: string;

  /** Get the connected accounts. */
  getAccounts(): Promise<{ address: string }[]>;

  /** Connect the wallet and request permissions. */
  connect(params?: { permissions?: string[] }): Promise<{ accounts: { address: string }[] }>;

  /** Disconnect the wallet. */
  disconnect(): Promise<void>;

  /** Sign a transaction block. */
  signTransactionBlock?(params: {
    transactionBlock: string | Uint8Array;
  }): Promise<{ bytes: string; signature: string }>;

  /** Sign a personal message. */
  signMessage?(params: {
    message: string | Uint8Array;
  }): Promise<{ messageBytes: string; signature: string }>;

  /** Sign and execute a transaction block. */
  signAndExecuteTransactionBlock?(params: {
    transactionBlock: string | Uint8Array;
    requestType?: 'WaitForLocalExecution' | 'WaitForEffectsCert' | 'WaitForLocalExecution';
  }): Promise<{ effects: unknown; objectChanges?: unknown[] }>;

  /** EIP-1193 style request. */
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;

  /** Listen to account changes. */
  on?(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;

  /** Whether the wallet is connected. */
  isConnected?: boolean;
  /** Current account addresses. */
  accounts?: string[];
}

/** Window type with Sui wallet. */
interface SuiWindow extends Omit<Window, 'ethereum'> {
  suiWallet?: SuiWalletProvider;
  ethereum?: SuiWalletProvider & Record<string, unknown>;
  ethosWallet?: SuiWalletProvider;
  martian?: { sui?: SuiWalletProvider };
  surf?: SuiWalletProvider;
}

/* ------------------------------------------------------------------ */
/*  Supported Sui wallets                                              */
/* ------------------------------------------------------------------ */

export interface SuiWalletInfo {
  id: string;
  name: string;
  rdns: string;
  icon: string;
  downloadUrl: string;
}

export const SUI_WALLETS: SuiWalletInfo[] = [
  {
    id: 'sui-wallet',
    name: 'Sui Wallet',
    rdns: 'com.sui.wallet',
    icon: 'https://wallet.sui.io/icon.png',
    downloadUrl: 'https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajojpbmgppaayo',
  },
  {
    id: 'ethos',
    name: 'Ethos Wallet',
    rdns: 'app.ethos.wallet',
    icon: 'https://ethoswallet.xyz/favicon.png',
    downloadUrl: 'https://ethoswallet.xyz',
  },
  {
    id: 'martian',
    name: 'Martian Sui Wallet',
    rdns: 'com.martian.sui',
    icon: 'https://martianwallet.xyz/favicon.ico',
    downloadUrl: 'https://martianwallet.xyz/sui-wallet',
  },
  {
    id: 'surf',
    name: 'Surf Wallet',
    rdns: 'app.surf.wallet',
    icon: 'https://surf.xyz/favicon.png',
    downloadUrl: 'https://surf.xyz',
  },
];

/** Well-known Sui chain presets. */
export const SUI_CHAINS: Chain[] = [
  {
    id: 'sui:mainnet',
    name: 'Sui Mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    nativeCurrency: { name: 'Sui', symbol: 'SUI', decimals: 9 },
    explorerUrl: 'https://suiscan.xyz/mainnet',
    iconUrl: 'https://cryptologos.cc/logos/sui-sui-logo.svg',
  },
  {
    id: 'sui:testnet',
    name: 'Sui Testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    nativeCurrency: { name: 'Sui', symbol: 'SUI', decimals: 9 },
    explorerUrl: 'https://suiscan.xyz/testnet',
    iconUrl: 'https://cryptologos.cc/logos/sui-sui-logo.svg',
  },
  {
    id: 'sui:devnet',
    name: 'Sui Devnet',
    rpcUrl: 'https://fullnode.devnet.sui.io:443',
    nativeCurrency: { name: 'Sui', symbol: 'SUI', decimals: 9 },
    explorerUrl: 'https://suiscan.xyz/devnet',
    iconUrl: 'https://cryptologos.cc/logos/sui-sui-logo.svg',
  },
];

/* ------------------------------------------------------------------ */
/*  Sui Transaction Builder                                            */
/* ------------------------------------------------------------------ */

/** Transaction input (object or pure). */
export interface SuiTransactionInput {
  /** Pure value (for u64, address, etc.). */
  Pure?: { value: Uint8Array; type?: string };
  /** Object input — by ID. */
  ImmOrOwnedObject?: { objectId: string; version: string; digest: string };
  /** Object input — shared object. */
  SharedObject?: { objectId: string; initialVersion: string; mutable: boolean };
  /** Receiving input. */
  Receiving?: { objectId: string; version: string; digest: string };
}

/** Built transaction block with BCS-encoded bytes. */
export interface BuiltTransactionBlock {
  /** BCS-encoded transaction bytes (base64). */
  bytes: string;
  /** Raw bytes. */
  rawBytes: Uint8Array;
  /** Gas budget used. */
  gasBudget: string;
  /** Summary of the commands. */
  commands: SuiCommand[];
}

/** Kind of command in a Sui transaction block. */
export enum CommandKind {
  MoveCall = 0,
  TransferObjects = 1,
  SplitCoin = 2,
  SplitCoinEqual = 3,
  Publish = 4,
  MakeMoveVec = 5,
  MergeCoins = 6,
}

/** Base command interface. */
export interface SuiCommand {
  kind: CommandKind;
}

/** TransferObjects command. */
export interface TransferObjectsCommand extends SuiCommand {
  kind: CommandKind.TransferObjects;
  /** Objects to transfer (input indices). */
  objects: number[];
  /** Destination address (input index or pure). */
  address: number;
}

/** SplitCoin command. */
export interface SplitCoinCommand extends SuiCommand {
  kind: CommandKind.SplitCoin;
  /** Coin to split from (input index). */
  coin: number;
  /** Amounts to split into (input indices). */
  amounts: number[];
}

/** MergeCoins command. */
export interface MergeCoinsCommand extends SuiCommand {
  kind: CommandKind.MergeCoins;
  /** Destination coin (input index). */
  coin: number;
  /** Coins to merge (input indices). */
  sources: number[];
}

/** MoveCall command. */
export interface MoveCallCommand extends SuiCommand {
  kind: CommandKind.MoveCall;
  /** Package address. */
  package: string;
  /** Module name. */
  module: string;
  /** Function name. */
  function: string;
  /** Type arguments. */
  typeArguments: string[];
  /** Input arguments (input indices). */
  arguments: number[];
}

/** Publish command. */
export interface PublishCommand extends SuiCommand {
  kind: CommandKind.Publish;
  /** Module bytecode (modules as byte arrays). */
  modules: Uint8Array[];
  /** Dependencies (package addresses). */
  dependencies: string[];
}

/**
 * Transaction builder for Sui.
 * Constructs a transaction block programmatically.
 */
export class TransactionBuilder {
  private inputs: SuiTransactionInput[] = [];
  private commands: SuiCommand[] = [];

  /** Add a pure input and return its index. */
  inputPure(value: Uint8Array, type?: string): number {
    const idx = this.inputs.length;
    this.inputs.push({ Pure: { value, type } });
    return idx;
  }

  /** Add an input with address (encoded as pure). */
  inputAddress(address: string): number {
    const normalized = normalizeSuiAddress(address);
    const bytes = new Uint8Array(32);
    const cleaned = normalized.slice(2);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    }
    return this.inputPure(bytes, 'address');
  }

  /** Add an input with u64 amount. */
  inputU64(value: bigint | string | number): number {
    const writer = new BcsWriter();
    writer.write64(BigInt(value));
    return this.inputPure(writer.toBytes(), 'u64');
  }

  /** Add an object input and return its index. */
  inputObject(
    objectId: string,
    version: string,
    digest: string,
    shared: boolean = false,
    mutable: boolean = true,
  ): number {
    const idx = this.inputs.length;
    if (shared) {
      this.inputs.push({
        SharedObject: { objectId: normalizeSuiAddress(objectId), initialVersion: version, mutable },
      });
    } else {
      this.inputs.push({
        ImmOrOwnedObject: { objectId: normalizeSuiAddress(objectId), version, digest },
      });
    }
    return idx;
  }

  /** Add a TransferObjects command. */
  transferObjects(objectInputs: number[], addressInput: number): number {
    const cmd: TransferObjectsCommand = {
      kind: CommandKind.TransferObjects,
      objects: objectInputs,
      address: addressInput,
    };
    this.commands.push(cmd);
    return this.commands.length - 1;
  }

  /** Convenience: transfer specific objects to an address. */
  transfer(
    objectId: string,
    version: string,
    digest: string,
    toAddress: string,
  ): number {
    const objInput = this.inputObject(objectId, version, digest);
    const addrInput = this.inputAddress(toAddress);
    return this.transferObjects([objInput], addrInput);
  }

  /** Add a SplitCoin command. */
  splitCoin(coinInput: number, amountInputs: number[]): number {
    const cmd: SplitCoinCommand = {
      kind: CommandKind.SplitCoin,
      coin: coinInput,
      amounts: amountInputs,
    };
    this.commands.push(cmd);
    return this.commands.length - 1;
  }

  /** Convenience: split a coin by amount. */
  split(coinObjectId: string, version: string, digest: string, amount: bigint | string | number): number {
    const coinInput = this.inputObject(coinObjectId, version, digest);
    const amountInput = this.inputU64(amount);
    return this.splitCoin(coinInput, [amountInput]);
  }

  /** Add a MergeCoins command. */
  mergeCoins(coinInput: number, sourceInputs: number[]): number {
    const cmd: MergeCoinsCommand = {
      kind: CommandKind.MergeCoins,
      coin: coinInput,
      sources: sourceInputs,
    };
    this.commands.push(cmd);
    return this.commands.length - 1;
  }

  /** Add a MoveCall command. */
  moveCall(params: {
    package: string;
    module: string;
    function: string;
    typeArguments?: string[];
    arguments?: number[];
  }): number {
    const cmd: MoveCallCommand = {
      kind: CommandKind.MoveCall,
      package: normalizeSuiAddress(params.package),
      module: params.module,
      function: params.function,
      typeArguments: params.typeArguments ?? [],
      arguments: params.arguments ?? [],
    };
    this.commands.push(cmd);
    return this.commands.length - 1;
  }

  /** Add a Publish command. */
  publish(modules: Uint8Array[], dependencies: string[]): number {
    const cmd: PublishCommand = {
      kind: CommandKind.Publish,
      modules,
      dependencies: dependencies.map(normalizeSuiAddress),
    };
    this.commands.push(cmd);
    return this.commands.length - 1;
  }

  /** Get the commands. */
  getCommands(): SuiCommand[] {
    return [...this.commands];
  }

  /** Get the inputs. */
  getInputs(): SuiTransactionInput[] {
    return [...this.inputs];
  }

  /** Build the transaction block to BCS bytes. */
  build(gasBudget: string = '100000000'): BuiltTransactionBlock {
    const writer = new BcsWriter();

    // Version byte
    writer.write8(1);

    // sender (zeroed — will be filled by wallet)
    writer.writeAddress('0x0');

    // gas
    writer.write8(0); // gas price (will be filled)
    writer.write64(gasBudget);

    // inputs
    writer.writeUleb128(this.inputs.length);
    for (const input of this.inputs) {
      if (input.Pure) {
        writer.write8(0); // Pure kind
        writer.writeBytes(input.Pure.value);
      } else if (input.ImmOrOwnedObject) {
        writer.write8(1); // ImmOrOwnedObject kind
        writer.writeAddress(input.ImmOrOwnedObject.objectId);
        writer.writeUleb128(parseInt(input.ImmOrOwnedObject.version, 10));
        // Digest (simplified — just bytes)
        writer.writeBytes(new Uint8Array(32));
      } else if (input.SharedObject) {
        writer.write8(2); // SharedObject kind
        writer.writeAddress(input.SharedObject.objectId);
        writer.writeUleb128(parseInt(input.SharedObject.initialVersion, 10));
        writer.write8(input.SharedObject.mutable ? 1 : 0);
      } else if (input.Receiving) {
        writer.write8(3); // Receiving kind
        writer.writeAddress(input.Receiving.objectId);
        writer.writeUleb128(parseInt(input.Receiving.version, 10));
        writer.writeBytes(new Uint8Array(32));
      }
    }

    // transactions (commands)
    writer.writeUleb128(this.commands.length);
    for (const cmd of this.commands) {
      switch (cmd.kind) {
        case CommandKind.TransferObjects: {
          const tCmd = cmd as TransferObjectsCommand;
          writer.write8(1);
          writer.writeUleb128(tCmd.objects.length);
          for (const o of tCmd.objects) {
            writer.write8(0); // Input kind
            writer.writeUleb128(o);
          }
          writer.write8(0);
          writer.writeUleb128(tCmd.address);
          break;
        }
        case CommandKind.SplitCoin: {
          const sCmd = cmd as SplitCoinCommand;
          writer.write8(2);
          writer.write8(0);
          writer.writeUleb128(sCmd.coin);
          writer.writeUleb128(sCmd.amounts.length);
          for (const a of sCmd.amounts) {
            writer.write8(0);
            writer.writeUleb128(a);
          }
          break;
        }
        case CommandKind.SplitCoinEqual: {
          const sCmd = cmd as SplitCoinCommand;
          writer.write8(3);
          writer.write8(0);
          writer.writeUleb128(sCmd.coin);
          writer.writeUleb128(sCmd.amounts.length);
          break;
        }
        case CommandKind.MergeCoins: {
          const mCmd = cmd as MergeCoinsCommand;
          writer.write8(6);
          writer.write8(0);
          writer.writeUleb128(mCmd.coin);
          writer.writeUleb128(mCmd.sources.length);
          for (const s of mCmd.sources) {
            writer.write8(0);
            writer.writeUleb128(s);
          }
          break;
        }
        case CommandKind.MoveCall: {
          const mcCmd = cmd as MoveCallCommand;
          writer.write8(0);
          writer.writeAddress(mcCmd.package);
          writer.writeString(mcCmd.module);
          writer.writeString(mcCmd.function);
          writer.writeUleb128(mcCmd.typeArguments.length);
          for (const t of mcCmd.typeArguments) {
            writer.writeBytes(encodeTypeTag(t));
          }
          writer.writeUleb128(mcCmd.arguments.length);
          for (const a of mcCmd.arguments) {
            writer.write8(0);
            writer.writeUleb128(a);
          }
          break;
        }
        case CommandKind.Publish: {
          const pCmd = cmd as PublishCommand;
          writer.write8(4);
          writer.writeUleb128(pCmd.modules.length);
          for (const mod of pCmd.modules) {
            writer.writeBytes(mod);
          }
          writer.writeUleb128(pCmd.dependencies.length);
          for (const d of pCmd.dependencies) {
            writer.writeAddress(d);
          }
          break;
        }
        case CommandKind.MakeMoveVec: {
          writer.write8(5);
          // Not fully implemented — reserved for future
          break;
        }
      }
    }

    return {
      bytes: btoa(String.fromCharCode(...writer.toBytes())),
      rawBytes: writer.toBytes(),
      gasBudget,
      commands: [...this.commands],
    };
  }

  /** Reset the builder for reuse. */
  reset(): void {
    this.inputs = [];
    this.commands = [];
  }
}

/* ------------------------------------------------------------------ */
/*  Sui JSON-RPC client                                                */
/* ------------------------------------------------------------------ */

/** Sui RPC response envelope. */
interface SuiRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

/** Sui RPC client for HTTP JSON-RPC calls. */
class SuiRpcClient {
  private rpcUrl: string;
  private idCounter: number = 0;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  /** Make a JSON-RPC call. */
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

    const data = (await resp.json()) as SuiRpcResponse<T>;
    if (data.error) {
      throw new Error(`Sui RPC error ${data.error.code}: ${data.error.message}`);
    }

    return data.result!;
  }

  /** Get balance for a coin type. */
  async getBalance(owner: string, coinType?: string): Promise<SuiCoinBalance> {
    return this.call('suix_getBalance', [owner, coinType ?? '0x2::sui::SUI']);
  }

  /** Get all balances. */
  async getAllBalances(owner: string): Promise<SuiCoinBalance[]> {
    return this.call('suix_getAllBalances', [owner]);
  }

  /** Get coins for an owner. */
  async getCoins(owner: string, coinType: string, cursor?: string, limit?: number): Promise<{
    data: SuiObject[];
    nextCursor?: string;
    hasNextPage: boolean;
  }> {
    return this.call('suix_getCoins', [owner, coinType, cursor ?? null, limit ?? 50]);
  }

  /** Get all coins for an owner. */
  async getAllCoins(owner: string, cursor?: string, limit?: number): Promise<{
    data: SuiObject[];
    nextCursor?: string;
    hasNextPage: boolean;
  }> {
    return this.call('suix_getAllCoins', [owner, cursor ?? null, limit ?? 50]);
  }

  /** Get an object by ID. */
  async getObject(objectId: string, showContent?: boolean): Promise<{
    data?: {
      objectId: string;
      version: string;
      digest: string;
      type?: string;
      owner?: unknown;
      content?: unknown;
      previousTransaction?: string;
    };
    error?: { code: number; message: string };
  }> {
    const options: Record<string, boolean> = {};
    if (showContent) {
      options.showContent = true;
      options.showType = true;
      options.showOwner = true;
    }
    return this.call('sui_getObject', [objectId, options]);
  }

  /** Get multiple objects by ID. */
  async getObjects(objectIds: string[]): Promise<unknown[]> {
    return Promise.all(
      objectIds.map((id) => this.getObject(id, false)),
    );
  }

  /** Execute a transaction block. */
  async executeTransactionBlock(params: {
    transactionBlock: string;
    signature: string | string[];
    requestType?: string;
  }): Promise<SuiTransactionResponse> {
    return this.call('sui_executeTransactionBlock', [
      params.transactionBlock,
      Array.isArray(params.signature) ? params.signature : [params.signature],
      { requestType: params.requestType ?? 'WaitForLocalExecution' },
    ]);
  }

  /** Get transaction block by digest. */
  async getTransactionBlock(digest: string): Promise<SuiTransactionResponse> {
    return this.call('sui_getTransactionBlock', [digest, {
      showInput: true,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    }]);
  }

  /** Get reference gas price. */
  async getReferenceGasPrice(): Promise<string> {
    const result = await this.call<string>('suix_getReferenceGasPrice', []);
    return result;
  }

  /** Get chain ID. */
  async getChainIdentifier(): Promise<string> {
    return this.call('sui_getChainIdentifier', []);
  }

  /** Dry run a transaction block. */
  async dryRunTransactionBlock(txBytes: string): Promise<unknown> {
    return this.call('sui_dryRunTransactionBlock', [txBytes]);
  }

  /** Dev inspect a transaction. */
  async devInspectTransactionBlock(sender: string, txBytes: string, gasPrice?: string): Promise<unknown> {
    const params: unknown[] = [sender, txBytes];
    if (gasPrice) params.push(gasPrice);
    return this.call('sui_devInspectTransactionBlock', params);
  }

  /** Get objects owned by an address. */
  async getOwnedObjects(
    owner: string,
    options?: { filter?: Record<string, unknown>; cursor?: string; limit?: number },
  ): Promise<{
    data: SuiObject[];
    nextCursor?: string;
    hasNextPage: boolean;
  }> {
    const filter = options?.filter ?? null;
    const cursor = options?.cursor ?? null;
    const limit = options?.limit ?? 50;
    return this.call('suix_getOwnedObjects', [owner, { filter }, cursor, limit]);
  }

  /** Get move call metadata for a function. */
  async getNormalizedMoveFunction(
    packageId: string,
    moduleName: string,
    functionName: string,
  ): Promise<unknown> {
    return this.call('suix_getNormalizedMoveFunction', [packageId, moduleName, functionName]);
  }
}

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter                                                     */
/* ------------------------------------------------------------------ */

/**
 * Sui chain adapter implementing chain-specific operations.
 *
 * Wraps a Sui wallet provider (window.suiWallet style) with Sui-specific
 * JSON-RPC calls, transaction building, and message signing.
 *
 * Features:
 * - Native SUI balance queries
 * - Coin object management (split, merge, transfer)
 * - Move function calls
 * - BCS encoding for transaction blocks
 * - Message signing (personal sign)
 * - Chain switching (mainnet, testnet, devnet)
 */
export class SuiChainAdapter {
  /** Unique adapter identifier. */
  readonly id: string = 'sui-adapter';
  /** Human-readable adapter name. */
  readonly name: string = 'Sui Chain Adapter';

  private provider: SuiWalletProvider | null = null;
  private chains: Chain[] = [...SUI_CHAINS];
  private currentChain: Chain = SUI_CHAINS[0];
  private rpcUrl: string = SUI_CHAINS[0].rpcUrl;
  private _accounts: string[] = [];
  private _rpcClient: SuiRpcClient | null = null;
  private _connector: Connector | null = null;

  /* ---- Configuration ---- */

  /** Set the Cinacoin connector. */
  setConnector(connector: Connector): void {
    this._connector = connector;
  }

  /** Register supported Sui chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains.length > 0 ? chains : [...SUI_CHAINS];
    this.currentChain = this.chains[0];
    this.rpcUrl = this.currentChain.rpcUrl;
    this._rpcClient = null;
  }

  /** Find a chain by numeric ID (returns first chain for compatibility). */
  findChain(_chainId: number): Chain | undefined {
    return this.chains[0];
  }

  /** Set the active wallet provider. */
  setProvider(provider: SuiWalletProvider): void {
    this.provider = provider;
  }

  /** Get the current provider. */
  getProvider(): SuiWalletProvider | null {
    return this.provider;
  }

  /** Get the RPC client (lazy-init). */
  private _getRpcClient(): SuiRpcClient {
    if (!this._rpcClient) {
      this._rpcClient = new SuiRpcClient(this.rpcUrl);
    }
    return this._rpcClient;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a Sui wallet.
   * Tries Sui Wallet → Ethos → Martian → Surf in order.
   * @param walletId - Optional wallet ID to prefer.
   * @returns Array of connected addresses.
   */
  async connect(walletId?: string): Promise<string[]> {
    const target = this._resolveWallet(walletId);
    if (!target) {
      throw new Error(
        'No Sui wallet found. Install Sui Wallet, Ethos, Martian, or Surf.',
      );
    }

    this.provider = target;

    try {
      const result = await this.provider.connect({
        permissions: ['viewAccount', 'suggestTransaction'],
      });
      this._accounts = result.accounts.map((a) => a.address);
    } catch {
      // Fallback: try getAccounts directly
      const accounts = await this.provider.getAccounts();
      this._accounts = accounts.map((a) => a.address);
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
   * @returns Chain ID string (e.g., 'sui:mainnet').
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
   * Get SUI balance for an address.
   * @param address - Sui address (0x-prefixed hex).
   * @returns Balance in MIST (smallest unit, as string).
   */
  async getBalance(address: string): Promise<string> {
    if (!isValidSuiAddress(address)) {
      throw new Error(`Invalid Sui address: ${address}`);
    }

    try {
      const result = await this._getRpcClient().getBalance(
        normalizeSuiAddress(address),
        '0x2::sui::SUI',
      );
      return result.totalBalance;
    } catch {
      // Fallback: query coins and sum
      try {
        const coins = await this._getRpcClient().getCoins(
          normalizeSuiAddress(address),
          '0x2::sui::SUI',
        );
        let total = 0n;
        for (const coin of coins.data) {
          // In practice, coin objects have balance in content
          total += BigInt((coin as any).balance ?? 0);
        }
        return total.toString();
      } catch {
        return '0';
      }
    }
  }

  /**
   * Get formatted SUI balance (decimal string).
   * @param address - Sui address.
   * @returns Balance in SUI (e.g., "12.345678901").
   */
  async getBalanceFormatted(address: string): Promise<string> {
    const raw = await this.getBalance(address);
    return formatSuiBalance(raw);
  }

  /**
   * Get all coin balances for an address.
   * @param address - Sui address.
   * @returns Array of { coinType, totalBalance, coinObjectCount }.
   */
  async getAllBalances(address: string): Promise<SuiCoinBalance[]> {
    if (!isValidSuiAddress(address)) {
      throw new Error(`Invalid Sui address: ${address}`);
    }

    try {
      return await this._getRpcClient().getAllBalances(
        normalizeSuiAddress(address),
      );
    } catch {
      return [];
    }
  }

  /**
   * Get coin objects for an address.
   * @param address - Sui address.
   * @param coinType - Coin type (defaults to SUI).
   * @returns Array of SuiObject.
   */
  async getCoins(
    address: string,
    coinType: string = '0x2::sui::SUI',
  ): Promise<SuiObject[]> {
    if (!isValidSuiAddress(address)) {
      throw new Error(`Invalid Sui address: ${address}`);
    }

    try {
      const result = await this._getRpcClient().getCoins(
        normalizeSuiAddress(address),
        coinType,
      );
      return result.data;
    } catch {
      return [];
    }
  }

  /* ---- Transactions ---- */

  /**
   * Send a transaction.
   * @param tx - Transaction bytes (base64 string) or SuiTransactionRequest or BuiltTransactionBlock.
   * @returns Transaction digest.
   */
  async sendTransaction(tx: string | SuiTransactionRequest | BuiltTransactionBlock | Uint8Array): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    let txBytes: string;
    let gasBudget = '100000000';

    if (typeof tx === 'string') {
      txBytes = tx;
    } else if (tx instanceof Uint8Array) {
      txBytes = btoa(String.fromCharCode(...tx));
    } else if ('bytes' in tx && 'rawBytes' in tx) {
      // BuiltTransactionBlock
      txBytes = tx.bytes;
      gasBudget = tx.gasBudget;
    } else {
      txBytes = tx.txBytes;
      gasBudget = tx.gasBudget ?? gasBudget;
    }

    // Try signAndExecute first (single call)
    if (this.provider.signAndExecuteTransactionBlock) {
      try {
        const result = await this.provider.signAndExecuteTransactionBlock({
          transactionBlock: txBytes,
          requestType: 'WaitForLocalExecution',
        });

        const digest = (result as any).digest;
        if (digest) return digest;

        // Fallback: get digest from effects
        const effects = result.effects as any;
        if (effects?.transactionDigest) return effects.transactionDigest;
      } catch {
        // Fall through to manual sign + execute
      }
    }

    // Manual sign + execute
    if (this.provider.signTransactionBlock) {
      const signed = await this.provider.signTransactionBlock({
        transactionBlock: txBytes,
      });

      return this._getRpcClient().executeTransactionBlock({
        transactionBlock: signed.bytes,
        signature: signed.signature,
      }).then((r) => r.digest ?? r.effects?.transactionDigest ?? '');
    }

    throw new Error('Connected wallet does not support transaction signing');
  }

  /**
   * Build and send a SUI transfer transaction.
   * @param to - Recipient address.
   * @param amount - Amount in MIST.
   * @param gasBudget - Gas budget in MIST.
   * @returns Transaction digest.
   */
  async transferSui(
    to: string,
    amount: string | bigint | number,
    gasBudget: string = '100000000',
  ): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');
    if (!isValidSuiAddress(to)) throw new Error(`Invalid recipient address: ${to}`);

    // Use raw RPC if wallet supports request
    if (this.provider.request) {
      return this.provider.request({
        method: 'sui_executeTransactionBlock',
        params: [{
          kind: 'transferSui',
          recipient: normalizeSuiAddress(to),
          amount: BigInt(amount).toString(),
        }, {
          gasBudget,
        }],
      }) as Promise<string>;
    }

    throw new Error('Transaction building requires a wallet with signAndExecuteTransactionBlock or request method');
  }

  /* ---- Message Signing ---- */

  /**
   * Sign a personal message.
   * @param message - Message to sign (string or Uint8Array).
   * @returns Signature (base64 or hex).
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    if (this.provider.signMessage) {
      const msgBytes = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;

      const result = await this.provider.signMessage({
        message: msgBytes,
      });
      return result.signature;
    }

    // Fallback: EIP-1193 style personal_sign
    if (this.provider.request) {
      const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const result = await this.provider.request({
        method: 'sui_signMessage',
        params: [this.getAddress(), msgStr],
      });
      return (result as any)?.signature ?? result as string;
    }

    throw new Error('Connected wallet does not support message signing');
  }

  /**
   * Sign a transaction (returns signature without broadcasting).
   * @param tx - Transaction bytes (base64) or BuiltTransactionBlock.
   * @returns Object with bytes and signature.
   */
  async signTransaction(tx: string | BuiltTransactionBlock | Uint8Array): Promise<{
    bytes: string;
    signature: string;
  }> {
    if (!this.provider) throw new Error('No provider connected');
    if (!this.provider.signTransactionBlock) {
      throw new Error('Connected wallet does not support transaction signing');
    }

    let txBytes: string;
    if (typeof tx === 'string') {
      txBytes = tx;
    } else if (tx instanceof Uint8Array) {
      txBytes = btoa(String.fromCharCode(...tx));
    } else {
      txBytes = tx.bytes;
    }

    return this.provider.signTransactionBlock({ transactionBlock: txBytes });
  }

  /* ---- Object Queries ---- */

  /**
   * Get object details by ID.
   * @param objectId - Object ID (0x-prefixed hex).
   * @returns Object data or null.
   */
  async getObject(objectId: string): Promise<SuiObject | null> {
    if (!isValidSuiObjectId(objectId)) {
      throw new Error(`Invalid Sui object ID: ${objectId}`);
    }

    try {
      const result = await this._getRpcClient().getObject(
        normalizeSuiAddress(objectId),
        true,
      );
      if (!result.data) return null;

      return {
        objectId: result.data.objectId,
        version: result.data.version,
        digest: result.data.digest,
        type: result.data.type ?? '',
        owner: typeof result.data.owner === 'string'
          ? result.data.owner
          : JSON.stringify(result.data.owner),
        previousTransaction: result.data.previousTransaction,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get objects owned by an address.
   * @param address - Sui address.
   * @param limit - Max objects to return.
   * @returns Array of SuiObject.
   */
  async getOwnedObjects(address: string, limit: number = 50): Promise<SuiObject[]> {
    if (!isValidSuiAddress(address)) {
      throw new Error(`Invalid Sui address: ${address}`);
    }

    try {
      const result = await this._getRpcClient().getOwnedObjects(
        normalizeSuiAddress(address),
        { limit },
      );
      return result.data;
    } catch {
      return [];
    }
  }

  /**
   * Move call — call a Move function on a package.
   * @param params - Move call parameters.
   * @returns Transaction digest.
   */
  async moveCall(params: {
    package: string;
    module: string;
    function: string;
    typeArguments?: string[];
    arguments?: unknown[];
    gasBudget?: string;
  }): Promise<string> {
    if (!this.provider) throw new Error('No provider connected');

    const builder = new TransactionBuilder();
    const cmdIdx = builder.moveCall({
      package: params.package,
      module: params.module,
      function: params.function,
      typeArguments: params.typeArguments,
      arguments: params.arguments?.map((a) => {
        if (typeof a === 'number') return a;
        // For pure values, we need to add them as inputs
        return -1; // placeholder
      }),
    });

    const built = builder.build(params.gasBudget ?? '100000000');

    return this.sendTransaction(built);
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
   * EIP-1193 compatible request method for Sui.
   */
  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    switch (args.method) {
      case 'sui_getBalance': {
        const address = (args.params?.[0] ?? '') as string;
        const coinType = (args.params?.[1] as string) ?? '0x2::sui::SUI';
        return this.getBalance(address);
      }
      case 'sui_sendTransaction': {
        const tx = args.params?.[0] as string;
        return this.sendTransaction(tx);
      }
      case 'sui_signMessage': {
        const msg = args.params?.[0] as string | Uint8Array;
        return this.signMessage(msg);
      }
      case 'sui_getChainId': {
        return this.getChainId();
      }
      case 'sui_getObject': {
        const objectId = (args.params?.[0] ?? '') as string;
        return this.getObject(objectId);
      }
      case 'sui_getCoins': {
        const address = (args.params?.[0] ?? this.getAddress() ?? '') as string;
        const coinType = (args.params?.[1] as string) ?? '0x2::sui::SUI';
        return this.getCoins(address, coinType);
      }
      default:
        throw new Error(`Unsupported Sui method: ${args.method}`);
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

  private _resolveWallet(walletId?: string): SuiWalletProvider | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as SuiWindow;

    if (walletId) {
      switch (walletId) {
        case 'sui-wallet':
          return win.suiWallet ?? null;
        case 'ethos':
          return win.ethosWallet ?? null;
        case 'martian':
          return win.martian?.sui ?? null;
        case 'surf':
          return win.surf ?? null;
        default:
          return win.suiWallet ?? win.ethosWallet ?? win.surf ?? win.martian?.sui ?? null;
      }
    }

    // Auto-detect: Sui Wallet → Ethos → Surf → Martian
    if (win.suiWallet) return win.suiWallet;
    if (win.ethosWallet) return win.ethosWallet;
    if (win.surf) return win.surf;
    if (win.martian?.sui) return win.martian.sui;
    // Some wallets expose via window.ethereum
    if (win.ethereum) return win.ethereum;

    return null;
  }
}
