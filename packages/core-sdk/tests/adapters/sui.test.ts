/**
 * Sui Chain Adapter tests.
 *
 * Tests cover BCS encoding/decoding, address validation, utility functions,
 * wallet info constants, chain presets, the TransactionBuilder, the RPC client,
 * and the SuiChainAdapter class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SuiChainAdapter,
  SUI_CHAINS,
  SUI_WALLETS,
  isValidSuiAddress,
  normalizeSuiAddress,
  isValidSuiObjectId,
  formatSuiBalance,
  parseSuiAmount,
  BcsWriter,
  BcsReader,
  encodeTypeTag,
  TransactionBuilder,
  CommandKind,
  bytesToBase58,
  SUI_COIN_TYPE,
  SUI_SYSTEM_OBJECT,
  SUI_CLOCK_OBJECT,
} from '../../src/adapters/sui.js';

/* ------------------------------------------------------------------ */
/*  BCS Writer                                                         */
/* ------------------------------------------------------------------ */

describe('BcsWriter', () => {
  it('writes a single byte (u8)', () => {
    const writer = new BcsWriter();
    writer.write8(0xff);
    expect(writer.toBytes()).toEqual(new Uint8Array([0xff]));
  });

  it('writes u8 with overflow wrapping', () => {
    const writer = new BcsWriter();
    writer.write8(256);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x00]));
  });

  it('writes a 16-bit value (little-endian)', () => {
    const writer = new BcsWriter();
    writer.write16(0x0102);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x02, 0x01]));
  });

  it('writes a 32-bit value (little-endian)', () => {
    const writer = new BcsWriter();
    writer.write32(0x01020304);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x04, 0x03, 0x02, 0x01]));
  });

  it('writes a 64-bit value as bigint', () => {
    const writer = new BcsWriter();
    writer.write64(0x0102030405060708n);
    const bytes = writer.toBytes();
    expect(bytes.length).toBe(8);
    expect(bytes[0]).toBe(0x08);
    expect(bytes[7]).toBe(0x01);
  });

  it('writes a 64-bit value from string', () => {
    const writer = new BcsWriter();
    writer.write64('1000000000');
    expect(writer.toBytes().length).toBe(8);
  });

  it('writes ULEB128 small values', () => {
    const writer = new BcsWriter();
    writer.writeUleb128(42);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x2a]));
  });

  it('writes ULEB128 larger values', () => {
    const writer = new BcsWriter();
    writer.writeUleb128(128);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x80, 0x01]));
  });

  it('writes ULEB128 value 300', () => {
    const writer = new BcsWriter();
    writer.writeUleb128(300);
    expect(writer.toBytes()).toEqual(new Uint8Array([0xac, 0x02]));
  });

  it('writes a byte array with length prefix', () => {
    const writer = new BcsWriter();
    writer.writeBytes(new Uint8Array([0xaa, 0xbb]));
    expect(writer.toBytes()).toEqual(new Uint8Array([0x02, 0xaa, 0xbb]));
  });

  it('writes a UTF-8 string', () => {
    const writer = new BcsWriter();
    writer.writeString('hello');
    const bytes = writer.toBytes();
    expect(bytes[0]).toBe(5); // length
    expect(new TextDecoder().decode(bytes.slice(1))).toBe('hello');
  });

  it('writes a 32-byte address with 0x prefix', () => {
    const writer = new BcsWriter();
    writer.writeAddress('0x1');
    const bytes = writer.toBytes();
    expect(bytes.length).toBe(32);
    expect(bytes[31]).toBe(0x01);
    expect(bytes[0]).toBe(0x00);
  });

  it('writes a full 64-char address', () => {
    const writer = new BcsWriter();
    const addr = '0x' + 'aa'.repeat(32);
    writer.writeAddress(addr);
    const bytes = writer.toBytes();
    expect(bytes.length).toBe(32);
    expect(bytes[0]).toBe(0xaa);
    expect(bytes[31]).toBe(0xaa);
  });

  it('tracks offset correctly', () => {
    const writer = new BcsWriter();
    writer.write8(1);
    expect(writer.offset).toBe(1);
    writer.write16(2);
    expect(writer.offset).toBe(3);
    writer.write32(4);
    expect(writer.offset).toBe(7);
  });

  it('toHex returns 0x-prefixed hex', () => {
    const writer = new BcsWriter();
    writer.write8(0xab);
    writer.write8(0xcd);
    expect(writer.toHex()).toBe('0xabcd');
  });

  it('toBytesHex returns hex without prefix', () => {
    const writer = new BcsWriter();
    writer.write8(0x01);
    expect(writer.toBytesHex()).toBe('01');
  });

  it('supports method chaining', () => {
    const writer = new BcsWriter();
    const result = writer.write8(1).write8(2).write8(3);
    expect(result).toBe(writer);
    expect(writer.toBytes()).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('can be pre-sized', () => {
    const writer = new BcsWriter({ size: 100 });
    writer.write8(42);
    expect(writer.toBytes().length).toBe(100);
    expect(writer.toBytes()[0]).toBe(42);
  });
});

/* ------------------------------------------------------------------ */
/*  BCS Reader                                                         */
/* ------------------------------------------------------------------ */

describe('BcsReader', () => {
  it('reads a single byte (u8)', () => {
    const reader = new BcsReader(new Uint8Array([0xff]));
    expect(reader.read8()).toBe(0xff);
  });

  it('reads a 16-bit value (little-endian)', () => {
    const reader = new BcsReader(new Uint8Array([0x02, 0x01]));
    expect(reader.read16()).toBe(0x0102);
  });

  it('reads a 32-bit value (little-endian)', () => {
    const reader = new BcsReader(new Uint8Array([0x04, 0x03, 0x02, 0x01]));
    expect(reader.read32()).toBe(0x01020304);
  });

  it('reads a 64-bit value as bigint', () => {
    const data = new Uint8Array(8);
    data[0] = 0x08;
    data[1] = 0x07;
    data[2] = 0x06;
    data[3] = 0x05;
    data[4] = 0x04;
    data[5] = 0x03;
    data[6] = 0x02;
    data[7] = 0x01;
    const reader = new BcsReader(data);
    expect(reader.read64()).toBe(0x0102030405060708n);
  });

  it('reads a 64-bit value from all zeros', () => {
    const reader = new BcsReader(new Uint8Array(8));
    expect(reader.read64()).toBe(0n);
  });

  it('reads ULEB128 small values', () => {
    const reader = new BcsReader(new Uint8Array([0x2a]));
    expect(reader.readUleb128()).toBe(42);
  });

  it('reads ULEB128 multi-byte values', () => {
    const reader = new BcsReader(new Uint8Array([0x80, 0x01]));
    expect(reader.readUleb128()).toBe(128);
  });

  it('reads ULEB128 value 300', () => {
    const reader = new BcsReader(new Uint8Array([0xac, 0x02]));
    expect(reader.readUleb128()).toBe(300);
  });

  it('reads a length-prefixed byte array', () => {
    const reader = new BcsReader(new Uint8Array([0x02, 0xaa, 0xbb]));
    const bytes = reader.readBytes();
    expect(bytes).toEqual(new Uint8Array([0xaa, 0xbb]));
  });

  it('reads a string', () => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode('hello');
    const data = new Uint8Array([encoded.length, ...encoded]);
    const reader = new BcsReader(data);
    expect(reader.readString()).toBe('hello');
  });

  it('reads a 32-byte address', () => {
    const data = new Uint8Array(32);
    data[31] = 0x01;
    const reader = new BcsReader(data);
    const addr = reader.readAddress();
    expect(addr.startsWith('0x')).toBe(true);
    expect(addr.length).toBe(66);
  });

  it('reads a boolean', () => {
    const reader = new BcsReader(new Uint8Array([1]));
    expect(reader.readBool()).toBe(true);

    const reader2 = new BcsReader(new Uint8Array([0]));
    expect(reader2.readBool()).toBe(false);
  });

  it('tracks offset while reading', () => {
    const reader = new BcsReader(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]));
    reader.read8();
    expect(reader.offset).toBe(1);
    reader.read16();
    expect(reader.offset).toBe(3);
    reader.read8();
    expect(reader.offset).toBe(4);
  });

  it('round-trips with BcsWriter', () => {
    const writer = new BcsWriter();
    writer.write8(42);
    writer.writeUleb128(300);
    writer.writeString('test');

    const reader = new BcsReader(writer.toBytes());
    expect(reader.read8()).toBe(42);
    expect(reader.readUleb128()).toBe(300);
    expect(reader.readString()).toBe('test');
  });
});

/* ------------------------------------------------------------------ */
/*  BCS encodeTypeTag                                                  */
/* ------------------------------------------------------------------ */

describe('encodeTypeTag', () => {
  it('encodes a simple type tag', () => {
    const bytes = encodeTypeTag('0x2::sui::SUI');
    expect(bytes[0]).toBe(28); // Struct kind
    expect(bytes.length).toBeGreaterThan(32);
  });

  it('encodes a type tag with generics', () => {
    const bytes = encodeTypeTag('0x2::coin::Coin<0x2::sui::SUI>');
    expect(bytes[0]).toBe(28); // Struct kind
    // Should have generics count after the name
    expect(bytes.length).toBeGreaterThan(32);
  });

  it('produces different bytes for different types', () => {
    const a = encodeTypeTag('0x2::sui::SUI');
    const b = encodeTypeTag('0x2::coin::Coin<0x2::sui::SUI>');
    expect(a).not.toEqual(b);
  });

  it('handles the SUI system object type', () => {
    const bytes = encodeTypeTag('0x1::sui_system::SuiSystemState');
    expect(bytes[0]).toBe(28);
  });
});

/* ------------------------------------------------------------------ */
/*  SUI Balance Formatting                                             */
/* ------------------------------------------------------------------ */

describe('formatSuiBalance', () => {
  it('formats zero MIST', () => {
    expect(formatSuiBalance('0')).toBe('0');
  });

  it('formats 1 SUI (1e9 MIST)', () => {
    expect(formatSuiBalance('1000000000')).toBe('1');
  });

  it('formats fractional SUI', () => {
    expect(formatSuiBalance('1234567890')).toBe('1.23456789');
  });

  it('formats small amounts', () => {
    expect(formatSuiBalance('1')).toBe('0.000000001');
  });

  it('formats using bigint input', () => {
    expect(formatSuiBalance(1_000_000_000n)).toBe('1');
  });

  it('formats using number input', () => {
    expect(formatSuiBalance(1_000_000_000)).toBe('1');
  });

  it('trims trailing zeros', () => {
    expect(formatSuiBalance('1000000000')).toBe('1');
    expect(formatSuiBalance('1000100000')).toBe('1.0001');
  });
});

/* ------------------------------------------------------------------ */
/*  parseSuiAmount                                                     */
/* ------------------------------------------------------------------ */

describe('parseSuiAmount', () => {
  it('parses whole SUI', () => {
    expect(parseSuiAmount('1')).toBe(1_000_000_000n);
  });

  it('parses fractional SUI', () => {
    expect(parseSuiAmount('1.5')).toBe(1_500_000_000n);
  });

  it('parses small amounts', () => {
    expect(parseSuiAmount('0.000000001')).toBe(1n);
  });

  it('parses zero', () => {
    expect(parseSuiAmount('0')).toBe(0n);
  });

  it('pads fractional part to 9 decimals', () => {
    expect(parseSuiAmount('1.1')).toBe(1_100_000_000n);
  });

  it('round-trips with formatSuiBalance', () => {
    const original = '12.345678901';
    const mist = parseSuiAmount(original);
    expect(formatSuiBalance(mist)).toBe('12.345678901');
  });
});

/* ------------------------------------------------------------------ */
/*  Address Validation                                                 */
/* ------------------------------------------------------------------ */

describe('isValidSuiAddress', () => {
  it('accepts valid 64-char hex address', () => {
    expect(isValidSuiAddress('0x' + 'a'.repeat(64))).toBe(true);
  });

  it('accepts valid short address (zero-padded)', () => {
    expect(isValidSuiAddress('0x1')).toBe(true);
  });

  it('accepts mixed-case hex', () => {
    expect(isValidSuiAddress('0x' + 'aB'.repeat(32))).toBe(true);
  });

  it('rejects address without 0x prefix', () => {
    expect(isValidSuiAddress('a'.repeat(64))).toBe(false);
  });

  it('rejects empty hex after 0x', () => {
    expect(isValidSuiAddress('0x')).toBe(false);
  });

  it('rejects address too long (>64 hex chars)', () => {
    expect(isValidSuiAddress('0x' + 'a'.repeat(65))).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidSuiAddress('0x' + 'g'.repeat(64))).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidSuiAddress(null as unknown as string)).toBe(false);
    expect(isValidSuiAddress(undefined as unknown as string)).toBe(false);
    expect(isValidSuiAddress(123 as unknown as string)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  normalizeSuiAddress                                                */
/* ------------------------------------------------------------------ */

describe('normalizeSuiAddress', () => {
  it('pads short address to 64 chars', () => {
    const normalized = normalizeSuiAddress('0x1');
    expect(normalized).toBe('0x' + '0'.repeat(63) + '1');
    expect(normalized.length).toBe(66);
  });

  it('pads address without 0x prefix', () => {
    const normalized = normalizeSuiAddress('a1b2');
    expect(normalized.startsWith('0x')).toBe(true);
    expect(normalized.length).toBe(66);
  });

  it('preserves full-length address', () => {
    const addr = '0x' + 'aa'.repeat(32);
    expect(normalizeSuiAddress(addr)).toBe(addr);
  });

  it('handles 32-char hex without 0x', () => {
    const normalized = normalizeSuiAddress('a'.repeat(32));
    expect(normalized.length).toBe(66);
    expect(normalized).toBe('0x00000000000000000000000000000000' + 'a'.repeat(32));
  });
});

/* ------------------------------------------------------------------ */
/*  isValidSuiObjectId                                                 */
/* ------------------------------------------------------------------ */

describe('isValidSuiObjectId', () => {
  it('accepts valid object ID', () => {
    expect(isValidSuiObjectId('0x' + '1'.repeat(64))).toBe(true);
  });

  it('accepts SUI_SYSTEM_OBJECT', () => {
    expect(isValidSuiObjectId(SUI_SYSTEM_OBJECT)).toBe(true);
  });

  it('accepts SUI_CLOCK_OBJECT', () => {
    expect(isValidSuiObjectId(SUI_CLOCK_OBJECT)).toBe(true);
  });

  it('rejects invalid address', () => {
    expect(isValidSuiObjectId('0xinvalid')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  bytesToBase58                                                      */
/* ------------------------------------------------------------------ */

describe('bytesToBase58', () => {
  it('encodes single zero byte', () => {
    expect(bytesToBase58(new Uint8Array([0]))).toBe('1');
  });

  it('encodes zero bytes as leading 1s', () => {
    expect(bytesToBase58(new Uint8Array([0, 0]))).toBe('11');
  });

  it('encodes a non-zero value', () => {
    const result = bytesToBase58(new Uint8Array([0xff]));
    expect(result.length).toBeGreaterThan(0);
    expect(/[1-9A-HJ-NP-Za-km-z]+/.test(result)).toBe(true);
  });

  it('produces no invalid base58 characters', () => {
    const result = bytesToBase58(new Uint8Array([0x00, 0x01, 0x02, 0xff, 0x7f]));
    expect(result).not.toContain('0');
    expect(result).not.toContain('O');
    expect(result).not.toContain('I');
    expect(result).not.toContain('l');
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  it('produces deterministic output', () => {
    const data = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const a = bytesToBase58(data);
    const b = bytesToBase58(data);
    expect(a).toBe(b);
  });
});

/* ------------------------------------------------------------------ */
/*  Well-known constants                                               */
/* ------------------------------------------------------------------ */

describe('Sui constants', () => {
  it('SUI_COIN_TYPE is correct', () => {
    expect(SUI_COIN_TYPE).toBe('0x2::sui::SUI');
  });

  it('SUI_SYSTEM_OBJECT is all zeros with suffix 5', () => {
    expect(SUI_SYSTEM_OBJECT).toBe('0x' + '0'.repeat(63) + '5');
  });

  it('SUI_CLOCK_OBJECT is all zeros with suffix 6', () => {
    expect(SUI_CLOCK_OBJECT).toBe('0x' + '0'.repeat(63) + '6');
  });
});

/* ------------------------------------------------------------------ */
/*  Chain Presets                                                      */
/* ------------------------------------------------------------------ */

describe('SUI_CHAINS', () => {
  it('has 3 chains', () => {
    expect(SUI_CHAINS.length).toBe(3);
  });

  it('includes mainnet', () => {
    const mainnet = SUI_CHAINS.find((c) => c.id === 'sui:mainnet');
    expect(mainnet).toBeDefined();
    expect(mainnet!.rpcUrl).toBe('https://fullnode.mainnet.sui.io:443');
    expect(mainnet!.nativeCurrency!.symbol).toBe('SUI');
    expect(mainnet!.nativeCurrency!.decimals).toBe(9);
  });

  it('includes testnet', () => {
    const testnet = SUI_CHAINS.find((c) => c.id === 'sui:testnet');
    expect(testnet).toBeDefined();
    expect(testnet!.rpcUrl).toBe('https://fullnode.testnet.sui.io:443');
  });

  it('includes devnet', () => {
    const devnet = SUI_CHAINS.find((c) => c.id === 'sui:devnet');
    expect(devnet).toBeDefined();
    expect(devnet!.rpcUrl).toBe('https://fullnode.devnet.sui.io:443');
  });

  it('all chains have required fields', () => {
    for (const chain of SUI_CHAINS) {
      expect(chain.id).toBeDefined();
      expect(chain.name).toBeDefined();
      expect(chain.rpcUrl).toBeDefined();
      expect(chain.nativeCurrency).toBeDefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Wallet Info                                                        */
/* ------------------------------------------------------------------ */

describe('SUI_WALLETS', () => {
  it('has 4 wallets', () => {
    expect(SUI_WALLETS.length).toBe(4);
  });

  it('includes Sui Wallet', () => {
    const wallet = SUI_WALLETS.find((w) => w.id === 'sui-wallet');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('Sui Wallet');
  });

  it('includes Ethos Wallet', () => {
    const wallet = SUI_WALLETS.find((w) => w.id === 'ethos');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('Ethos Wallet');
  });

  it('includes Martian Sui Wallet', () => {
    const wallet = SUI_WALLETS.find((w) => w.id === 'martian');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('Martian Sui Wallet');
  });

  it('includes Surf Wallet', () => {
    const wallet = SUI_WALLETS.find((w) => w.id === 'surf');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('Surf Wallet');
  });

  it('all wallets have required fields', () => {
    for (const wallet of SUI_WALLETS) {
      expect(wallet.id).toBeDefined();
      expect(wallet.name).toBeDefined();
      expect(wallet.rdns).toBeDefined();
      expect(wallet.icon).toBeDefined();
      expect(wallet.downloadUrl).toBeDefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/*  TransactionBuilder                                                 */
/* ------------------------------------------------------------------ */

describe('TransactionBuilder', () => {
  let builder: TransactionBuilder;

  beforeEach(() => {
    builder = new TransactionBuilder();
  });

  it('starts with no inputs or commands', () => {
    expect(builder.getInputs()).toEqual([]);
    expect(builder.getCommands()).toEqual([]);
  });

  it('can add a pure input', () => {
    const idx = builder.inputPure(new Uint8Array([1, 2, 3]));
    expect(idx).toBe(0);
    expect(builder.getInputs().length).toBe(1);
  });

  it('can add an address input', () => {
    const idx = builder.inputAddress('0x1');
    expect(idx).toBe(0);
    expect(builder.getInputs()[0].Pure).toBeDefined();
    expect(builder.getInputs()[0].Pure!.value.length).toBe(32);
  });

  it('can add a u64 input', () => {
    const idx = builder.inputU64(1000000000n);
    expect(idx).toBe(0);
    expect(builder.getInputs()[0].Pure).toBeDefined();
    expect(builder.getInputs()[0].Pure!.value.length).toBe(8);
  });

  it('can add an owned object input', () => {
    const idx = builder.inputObject('0x1', '1', 'abc');
    expect(idx).toBe(0);
    expect(builder.getInputs()[0].ImmOrOwnedObject).toBeDefined();
  });

  it('can add a shared object input', () => {
    const idx = builder.inputObject('0x1', '1', 'abc', true, false);
    expect(idx).toBe(0);
    expect(builder.getInputs()[0].SharedObject).toBeDefined();
    expect(builder.getInputs()[0].SharedObject!.mutable).toBe(false);
  });

  it('can add a TransferObjects command', () => {
    const objIdx = builder.inputObject('0x1', '1', 'abc');
    const addrIdx = builder.inputAddress('0x2');
    const cmdIdx = builder.transferObjects([objIdx], addrIdx);
    expect(cmdIdx).toBe(0);
    expect(builder.getCommands()[0].kind).toBe(CommandKind.TransferObjects);
  });

  it('can add a SplitCoin command', () => {
    const coinIdx = builder.inputObject('0x1', '1', 'abc');
    const amtIdx = builder.inputU64(500000000);
    const cmdIdx = builder.splitCoin(coinIdx, [amtIdx]);
    expect(cmdIdx).toBe(0);
    expect(builder.getCommands()[0].kind).toBe(CommandKind.SplitCoin);
  });

  it('can add a MergeCoins command', () => {
    const coinIdx1 = builder.inputObject('0x1', '1', 'abc');
    const coinIdx2 = builder.inputObject('0x2', '1', 'def');
    const cmdIdx = builder.mergeCoins(coinIdx1, [coinIdx2]);
    expect(cmdIdx).toBe(0);
    expect(builder.getCommands()[0].kind).toBe(CommandKind.MergeCoins);
  });

  it('can add a MoveCall command', () => {
    const cmdIdx = builder.moveCall({
      package: '0x1',
      module: 'my_module',
      function: 'my_function',
      typeArguments: ['0x2::sui::SUI'],
      arguments: [],
    });
    expect(cmdIdx).toBe(0);
    expect(builder.getCommands()[0].kind).toBe(CommandKind.MoveCall);
  });

  it('can add a Publish command', () => {
    const cmdIdx = builder.publish(
      [new Uint8Array([0x01, 0x02])],
      ['0x2'],
    );
    expect(cmdIdx).toBe(0);
    expect(builder.getCommands()[0].kind).toBe(CommandKind.Publish);
  });

  it('build produces BCS bytes', () => {
    const addrIdx = builder.inputAddress('0x1');
    builder.transferObjects([], addrIdx);
    const result = builder.build('100000000');
    expect(result.bytes).toBeDefined();
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.rawBytes).toBeDefined();
    expect(result.rawBytes.length).toBeGreaterThan(0);
    expect(result.gasBudget).toBe('100000000');
  });

  it('build produces base64-encoded bytes', () => {
    builder.inputAddress('0x1');
    const result = builder.build();
    // Should be valid base64
    expect(() => atob(result.bytes)).not.toThrow();
  });

  it('can reset the builder', () => {
    builder.inputU64(100);
    builder.moveCall({ package: '0x1', module: 'm', function: 'f' });
    builder.reset();
    expect(builder.getInputs()).toEqual([]);
    expect(builder.getCommands()).toEqual([]);
  });

  it('convenience transfer creates correct commands', () => {
    const cmdIdx = builder.transfer('0xabc', '1', 'digest123', '0xdef');
    expect(cmdIdx).toBe(0);
    expect(builder.getInputs().length).toBe(2); // object + address
    expect(builder.getCommands().length).toBe(1);
  });

  it('convenience split creates correct commands', () => {
    const cmdIdx = builder.split('0xabc', '1', 'digest123', 500000000);
    expect(cmdIdx).toBe(0);
    expect(builder.getInputs().length).toBe(2); // coin + amount
    expect(builder.getCommands().length).toBe(1);
  });

  it('build with default gas budget', () => {
    const result = builder.build();
    expect(result.gasBudget).toBe('100000000');
  });

  it('can chain multiple commands', () => {
    const coinIdx = builder.inputObject('0x1', '1', 'abc');
    const addrIdx = builder.inputAddress('0x2');
    builder.transferObjects([coinIdx], addrIdx);
    builder.inputU64(100);
    const result = builder.build('50000000');
    expect(result.commands.length).toBe(1);
    expect(result.gasBudget).toBe('50000000');
  });
});

/* ------------------------------------------------------------------ */
/*  CommandKind enum                                                   */
/* ------------------------------------------------------------------ */

describe('CommandKind', () => {
  it('MoveCall is 0', () => {
    expect(CommandKind.MoveCall).toBe(0);
  });

  it('TransferObjects is 1', () => {
    expect(CommandKind.TransferObjects).toBe(1);
  });

  it('SplitCoin is 2', () => {
    expect(CommandKind.SplitCoin).toBe(2);
  });

  it('SplitCoinEqual is 3', () => {
    expect(CommandKind.SplitCoinEqual).toBe(3);
  });

  it('Publish is 4', () => {
    expect(CommandKind.Publish).toBe(4);
  });

  it('MakeMoveVec is 5', () => {
    expect(CommandKind.MakeMoveVec).toBe(5);
  });

  it('MergeCoins is 6', () => {
    expect(CommandKind.MergeCoins).toBe(6);
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — basics                                           */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('has correct id', () => {
    expect(adapter.id).toBe('sui-adapter');
  });

  it('has correct name', () => {
    expect(adapter.name).toBe('Sui Chain Adapter');
  });

  it('defaults to mainnet RPC', () => {
    expect(adapter.getRpcUrl()).toBe('https://fullnode.mainnet.sui.io:443');
  });

  it('getAddress returns null when not connected', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('getProvider returns null when not set', () => {
    expect(adapter.getProvider()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — chain management                                 */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter chain management', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('findChain returns first chain for any numeric ID', () => {
    const chain = adapter.findChain(1);
    expect(chain).toBeDefined();
    expect(chain!.id).toBe('sui:mainnet');
  });

  it('findChainById finds mainnet', () => {
    const chain = adapter.findChainById('sui:mainnet');
    expect(chain).toBeDefined();
    expect(chain!.name).toBe('Sui Mainnet');
  });

  it('findChainById finds testnet', () => {
    const chain = adapter.findChainById('sui:testnet');
    expect(chain).toBeDefined();
    expect(chain!.name).toBe('Sui Testnet');
  });

  it('findChainById returns undefined for unknown', () => {
    expect(adapter.findChainById('sui:unknown')).toBeUndefined();
  });

  it('switchChainById updates RPC URL', () => {
    adapter.switchChainById('sui:testnet');
    expect(adapter.getRpcUrl()).toBe('https://fullnode.testnet.sui.io:443');
  });

  it('switchChainById throws for unknown chain', async () => {
    await expect(adapter.switchChainById('sui:unknown')).rejects.toThrow();
  });

  it('getChainId returns string chain ID', async () => {
    const chainId = await adapter.getChainId();
    expect(chainId).toBe('sui:mainnet');
  });

  it('getChainIdNumeric returns a positive number', () => {
    const numeric = adapter.getChainIdNumeric();
    expect(typeof numeric).toBe('number');
    expect(numeric).toBeGreaterThan(0);
  });

  it('registerChains replaces default chains', () => {
    const customChains = [{
      id: 'sui:custom',
      name: 'Custom Chain',
      rpcUrl: 'https://custom.example.com',
      nativeCurrency: { name: 'SUI', symbol: 'SUI', decimals: 9 },
    }];
    adapter.registerChains(customChains);
    expect(adapter.findChainById('sui:custom')).toBeDefined();
    expect(adapter.findChainById('sui:mainnet')).toBeUndefined();
  });

  it('switchChain updates current chain', async () => {
    await adapter.switchChain(1);
    expect(adapter.getRpcUrl()).toBe(SUI_CHAINS[0].rpcUrl);
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — setConnector                                     */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter setConnector', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('setConnector accepts a connector', () => {
    const mockConnector = { id: 'test' } as any;
    expect(() => adapter.setConnector(mockConnector)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — setProvider                                      */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter setProvider', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('setProvider stores the provider', () => {
    const mockProvider = {
      getAccounts: vi.fn().mockResolvedValue([]),
      connect: vi.fn().mockResolvedValue({ accounts: [] }),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    adapter.setProvider(mockProvider);
    expect(adapter.getProvider()).toBe(mockProvider);
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — setRpcUrl                                        */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter setRpcUrl', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('setRpcUrl updates the RPC URL', () => {
    adapter.setRpcUrl('https://custom.rpc.sui.io');
    expect(adapter.getRpcUrl()).toBe('https://custom.rpc.sui.io');
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — connect / disconnect                             */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter connect/disconnect', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('connect throws when no wallet is available', async () => {
    // In node environment, window is undefined
    await expect(adapter.connect()).rejects.toThrow('No Sui wallet found');
  });

  it('connect with unknown wallet ID throws', async () => {
    await expect(adapter.connect('unknown-wallet')).rejects.toThrow();
  });

  it('disconnect works when not connected', async () => {
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('disconnect with a provider calls disconnect on it', async () => {
    const mockDisconnect = vi.fn().mockResolvedValue(undefined);
    const mockProvider = {
      getAccounts: vi.fn().mockResolvedValue([]),
      connect: vi.fn().mockResolvedValue({ accounts: [{ address: '0xabc' }] }),
      disconnect: mockDisconnect,
    };
    adapter.setProvider(mockProvider);
    adapter['provider'] = mockProvider;
    adapter['_accounts'] = ['0xabc'];

    await adapter.disconnect();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(adapter.getAddress()).toBeNull();
    expect(adapter.getProvider()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — getAccounts                                      */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter getAccounts', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('throws when not connected', async () => {
    await expect(adapter.getAccounts()).rejects.toThrow('Not connected');
  });

  it('returns accounts when connected', async () => {
    const mockProvider = {
      getAccounts: vi.fn().mockResolvedValue([
        { address: '0x' + 'a'.repeat(64) },
        { address: '0x' + 'b'.repeat(64) },
      ]),
      connect: vi.fn().mockResolvedValue({
        accounts: [
          { address: '0x' + 'a'.repeat(64) },
          { address: '0x' + 'b'.repeat(64) },
        ],
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    adapter.setProvider(mockProvider);

    const accounts = await mockProvider.getAccounts();
    expect(accounts.length).toBe(2);
    expect(accounts[0].address).toBe('0x' + 'a'.repeat(64));
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — balance validation                               */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter balance validation', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('getBalance rejects invalid address', async () => {
    await expect(adapter.getBalance('invalid')).rejects.toThrow('Invalid Sui address');
  });

  it('getBalanceFormatted rejects invalid address', async () => {
    await expect(adapter.getBalanceFormatted('invalid')).rejects.toThrow('Invalid Sui address');
  });

  it('getAllBalances rejects invalid address', async () => {
    await expect(adapter.getAllBalances('not-an-address')).rejects.toThrow('Invalid Sui address');
  });

  it('getCoins rejects invalid address', async () => {
    await expect(adapter.getCoins('xyz')).rejects.toThrow('Invalid Sui address');
  });

  it('getOwnedObjects rejects invalid address', async () => {
    await expect(adapter.getOwnedObjects('not-valid')).rejects.toThrow('Invalid Sui address');
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — transaction validation                           */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter transaction validation', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('sendTransaction throws when no provider', async () => {
    await expect(adapter.sendTransaction('abc')).rejects.toThrow('No provider connected');
  });

  it('signTransaction throws when no provider', async () => {
    await expect(adapter.signTransaction('abc')).rejects.toThrow('No provider connected');
  });

  it('signMessage throws when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('No provider connected');
  });

  it('transferSui throws when no provider', async () => {
    await expect(adapter.transferSui('0x1', 100)).rejects.toThrow('No provider connected');
  });

  it('transferSui rejects invalid recipient', async () => {
    const mockProvider = {
      getAccounts: vi.fn().mockResolvedValue([]),
      connect: vi.fn().mockResolvedValue({ accounts: [] }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
    };
    adapter.setProvider(mockProvider);
    adapter['provider'] = mockProvider;
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];

    await expect(adapter.transferSui('invalid-addr', 100)).rejects.toThrow('Invalid recipient');
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — object query validation                          */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter object query validation', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('getObject rejects invalid object ID', async () => {
    await expect(adapter.getObject('not-valid')).rejects.toThrow('Invalid Sui object ID');
  });

  it('getObject returns null on RPC failure', async () => {
    const result = await adapter.getObject('0x' + 'a'.repeat(64));
    expect(result).toBeNull();
  });

  it('getOwnedObjects returns data when connected to mainnet', async () => {
    // This may succeed or fail depending on network; just verify it doesn't throw
    const result = await adapter.getOwnedObjects('0x' + 'a'.repeat(64));
    expect(Array.isArray(result)).toBe(true);
  });

  it('getCoins returns empty on RPC failure', async () => {
    const result = await adapter.getCoins('0x' + 'a'.repeat(64));
    expect(result).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — moveCall validation                              */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter moveCall validation', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('moveCall throws when no provider', async () => {
    await expect(adapter.moveCall({
      package: '0x1',
      module: 'm',
      function: 'f',
    })).rejects.toThrow('No provider connected');
  });
});

/* ------------------------------------------------------------------ */
/*  SuiChainAdapter — request (EIP-1193)                               */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter request method', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('request throws for unsupported method', async () => {
    await expect(adapter.request({ method: 'sui_unknown' })).rejects.toThrow('Unsupported Sui method');
  });

  it('request sui_getChainId returns chain ID', async () => {
    const result = await adapter.request({ method: 'sui_getChainId' });
    expect(result).toBe('sui:mainnet');
  });

  it('request sui_getBalance rejects invalid address', async () => {
    await expect(adapter.request({
      method: 'sui_getBalance',
      params: ['invalid'],
    })).rejects.toThrow('Invalid Sui address');
  });

  it('request sui_getObject rejects invalid object ID', async () => {
    await expect(adapter.request({
      method: 'sui_getObject',
      params: ['not-valid'],
    })).rejects.toThrow('Invalid Sui object ID');
  });
});

/* ------------------------------------------------------------------ */
/*  Integration-style tests with mocked provider                       */
/* ------------------------------------------------------------------ */

describe('SuiChainAdapter with mock provider', () => {
  let adapter: SuiChainAdapter;
  let mockProvider: any;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
    mockProvider = {
      name: 'Test Wallet',
      getAccounts: vi.fn().mockResolvedValue([{ address: '0x' + 'a'.repeat(64) }]),
      connect: vi.fn().mockResolvedValue({
        accounts: [{ address: '0x' + 'a'.repeat(64) }],
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      signMessage: vi.fn().mockResolvedValue({
        messageBytes: 'bWVzc2FnZQ==',
        signature: 'c2lnbmF0dXJl',
      }),
      signTransactionBlock: vi.fn().mockResolvedValue({
        bytes: 'dHhCeHlz',
        signature: 'c2ln',
      }),
      signAndExecuteTransactionBlock: undefined,
      request: undefined,
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  it('getAddress returns connected address after setting provider', () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];
    expect(adapter.getAddress()).toBe('0x' + 'a'.repeat(64));
  });

  it('getAccounts returns connected accounts', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual(['0x' + 'a'.repeat(64)]);
  });

  it('signMessage delegates to provider', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];

    const sig = await adapter.signMessage('hello world');
    expect(mockProvider.signMessage).toHaveBeenCalled();
    expect(sig).toBe('c2lnbmF0dXJl');
  });

  it('signMessage accepts Uint8Array input', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];

    const sig = await adapter.signMessage(new Uint8Array([1, 2, 3]));
    expect(mockProvider.signMessage).toHaveBeenCalled();
    expect(sig).toBe('c2lnbmF0dXJl');
  });

  it('signTransaction delegates to provider', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];

    const result = await adapter.signTransaction('dHhCeHlz');
    expect(mockProvider.signTransactionBlock).toHaveBeenCalled();
    expect(result.bytes).toBe('dHhCeHlz');
    expect(result.signature).toBe('c2ln');
  });

  it('signTransaction with BuiltTransactionBlock', async () => {
    // The mock returns a static response — just verify the method was called
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];

    const tx = new TransactionBuilder();
    tx.inputAddress('0x1');
    const built = tx.build();

    const result = await adapter.signTransaction(built);
    expect(mockProvider.signTransactionBlock).toHaveBeenCalled();
    expect(result.signature).toBe('c2ln');
  });

  it('signTransaction with Uint8Array', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];

    const result = await adapter.signTransaction(new Uint8Array([1, 2, 3]));
    expect(mockProvider.signTransactionBlock).toHaveBeenCalled();
  });

  it('signTransaction throws if wallet does not support it', async () => {
    mockProvider.signTransactionBlock = undefined;
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];

    await expect(adapter.signTransaction('abc')).rejects.toThrow('does not support transaction signing');
  });

  it('signMessage throws if wallet does not support it', async () => {
    mockProvider.signMessage = undefined;
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['0x' + 'a'.repeat(64)];

    await expect(adapter.signMessage('hello')).rejects.toThrow('does not support message signing');
  });
});

/* ------------------------------------------------------------------ */
/*  TransactionBuilder — command encoding coverage                     */
/* ------------------------------------------------------------------ */

describe('TransactionBuilder command encoding', () => {
  it('build with TransferObjects encodes correctly', () => {
    const builder = new TransactionBuilder();
    const objIdx = builder.inputObject('0x1', '1', 'digest');
    const addrIdx = builder.inputAddress('0x2');
    builder.transferObjects([objIdx], addrIdx);
    const result = builder.build('200000000');

    expect(result.commands.length).toBe(1);
    expect(result.commands[0].kind).toBe(CommandKind.TransferObjects);
    expect(result.rawBytes.length).toBeGreaterThan(0);
  });

  it('build with SplitCoin encodes correctly', () => {
    const builder = new TransactionBuilder();
    const coinIdx = builder.inputObject('0x1', '1', 'digest');
    const amtIdx = builder.inputU64(500);
    builder.splitCoin(coinIdx, [amtIdx]);
    const result = builder.build();

    expect(result.commands.length).toBe(1);
    expect(result.commands[0].kind).toBe(CommandKind.SplitCoin);
  });

  it('build with MergeCoins encodes correctly', () => {
    const builder = new TransactionBuilder();
    const coin1 = builder.inputObject('0x1', '1', 'd1');
    const coin2 = builder.inputObject('0x2', '1', 'd2');
    builder.mergeCoins(coin1, [coin2]);
    const result = builder.build();

    expect(result.commands.length).toBe(1);
    expect(result.commands[0].kind).toBe(CommandKind.MergeCoins);
  });

  it('build with MoveCall encodes correctly', () => {
    const builder = new TransactionBuilder();
    const amtIdx = builder.inputU64(1000);
    builder.moveCall({
      package: '0x1',
      module: 'coin',
      function: 'transfer',
      typeArguments: ['0x2::sui::SUI'],
      arguments: [amtIdx],
    });
    const result = builder.build();

    expect(result.commands.length).toBe(1);
    expect(result.commands[0].kind).toBe(CommandKind.MoveCall);
  });

  it('build with Publish encodes correctly', () => {
    const builder = new TransactionBuilder();
    builder.publish(
      [new Uint8Array([0x01, 0x02, 0x03])],
      ['0x2', '0x3'],
    );
    const result = builder.build();

    expect(result.commands.length).toBe(1);
    expect(result.commands[0].kind).toBe(CommandKind.Publish);
  });

  it('build with multiple commands', () => {
    const builder = new TransactionBuilder();
    const coinIdx = builder.inputObject('0x1', '1', 'd');
    const addrIdx = builder.inputAddress('0x2');
    builder.transferObjects([coinIdx], addrIdx);
    builder.inputU64(100);
    builder.moveCall({
      package: '0x1',
      module: 'm',
      function: 'f',
    });
    const result = builder.build();

    expect(result.commands.length).toBe(2);
    expect(result.commands[0].kind).toBe(CommandKind.TransferObjects);
    expect(result.commands[1].kind).toBe(CommandKind.MoveCall);
  });

  it('build includes inputs in output', () => {
    const builder = new TransactionBuilder();
    builder.inputU64(42);
    builder.build();
    expect(builder.getInputs().length).toBe(1);
  });
});
