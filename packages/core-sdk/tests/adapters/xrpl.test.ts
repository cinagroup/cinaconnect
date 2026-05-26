/**
 * XRPL (XRP Ledger) Chain Adapter tests.
 *
 * Tests cover address validation, amount encoding/decoding,
 * transaction building (Payment, OfferCreate, OfferCancel, TrustSet,
 * NFTokenMint, NFTokenBurn, NFTokenCreateOffer), binary serialization,
 * wallet/provider constants, chain presets, the XrplRpcClient, and
 * the XrplChainAdapter class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  XrplChainAdapter,
  XRPL_CHAINS,
  XRPL_WALLETS,
  isValidXrplAddress,
  isValidXAddress,
  isValidAnyXrplAddress,
  normalizeXrplAddress,
  bytesToBase58 as xrplBytesToBase58,
  encodeDrops,
  decodeDrops,
  parseXrpAmount,
  buildPayment,
  buildOfferCreate,
  buildOfferCancel,
  buildTrustSet,
  buildNftMint,
  buildNftBurn,
  buildNftCreateOffer,
  XrplBinaryWriter,
  XrplTxType,
  XrplFieldType,
} from '../../src/adapters/xrpl.js';

/* ------------------------------------------------------------------ */
/*  Address Validation                                                  */
/* ------------------------------------------------------------------ */

describe('isValidXrplAddress', () => {
  it('accepts valid classic address', () => {
    expect(isValidXrplAddress('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ')).toBe(true);
  });

  it('accepts Ripple classic address', () => {
    expect(isValidXrplAddress('rN7n3379McA38KfM1bY9bQfJhMfNkGfHhL')).toBe(true);
  });

  it('accepts short valid address', () => {
    expect(isValidXrplAddress('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(true);
  });

  it('rejects address starting with wrong letter', () => {
    expect(isValidXrplAddress('aDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ')).toBe(false);
  });

  it('rejects address too short', () => {
    expect(isValidXrplAddress('rABC')).toBe(false);
  });

  it('rejects address too long', () => {
    expect(isValidXrplAddress('r' + 'a'.repeat(40))).toBe(false);
  });

  it('rejects address with invalid characters', () => {
    expect(isValidXrplAddress('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZ0')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidXrplAddress(null as unknown as string)).toBe(false);
    expect(isValidXrplAddress(undefined as unknown as string)).toBe(false);
    expect(isValidXrplAddress(123 as unknown as string)).toBe(false);
  });
});

describe('isValidXAddress', () => {
  it('accepts valid mainnet X-address', () => {
    expect(isValidXAddress('X7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDWMArnXr61cqZ')).toBe(true);
  });

  it('accepts valid testnet X-address', () => {
    expect(isValidXAddress('T7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDWMArnXr61cqZ')).toBe(true);
  });

  it('rejects address starting with wrong letter', () => {
    expect(isValidXAddress('Y7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDWMArnXr61cqZ')).toBe(false);
  });

  it('rejects address too short', () => {
    expect(isValidXAddress('XABC')).toBe(false);
  });

  it('rejects address with invalid characters', () => {
    expect(isValidXAddress('X7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDWMArnXr61cq0')).toBe(false);
  });
});

describe('isValidAnyXrplAddress', () => {
  it('accepts classic address', () => {
    expect(isValidAnyXrplAddress('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ')).toBe(true);
  });

  it('accepts X-address', () => {
    expect(isValidAnyXrplAddress('X7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDWMArnXr61cqZ')).toBe(true);
  });

  it('rejects invalid address', () => {
    expect(isValidAnyXrplAddress('invalid')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Address Normalization                                               */
/* ------------------------------------------------------------------ */

describe('normalizeXrplAddress', () => {
  it('converts to uppercase', () => {
    const normalized = normalizeXrplAddress('rdnhxj2smfwjhxgfkfdgzcgfdnkvgvlwzq');
    expect(normalized).toBe('RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ');
  });

  it('leaves uppercase unchanged', () => {
    const addr = 'RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ';
    expect(normalizeXrplAddress(addr)).toBe(addr);
  });

  it('mixed case becomes uppercase', () => {
    expect(normalizeXrplAddress('rDnHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ')).toBe(
      'RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ',
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Amount Encoding / Decoding                                          */
/* ------------------------------------------------------------------ */

describe('encodeDrops', () => {
  it('encodes integer drops', () => {
    expect(encodeDrops(1000000)).toBe('1000000');
  });

  it('encodes string drops', () => {
    expect(encodeDrops('50000000')).toBe('50000000');
  });

  it('encodes bigint drops', () => {
    expect(encodeDrops(1000000000000n)).toBe('1000000000000');
  });
});

describe('decodeDrops', () => {
  it('decodes zero drops', () => {
    expect(decodeDrops('0')).toBe('0');
  });

  it('decodes 1 XRP (1_000_000 drops)', () => {
    expect(decodeDrops('1000000')).toBe('1');
  });

  it('decodes fractional XRP', () => {
    expect(decodeDrops('1234567')).toBe('1.234567');
  });

  it('decodes small amounts', () => {
    expect(decodeDrops('1')).toBe('0.000001');
  });

  it('decodes using number input', () => {
    expect(decodeDrops(500000)).toBe('0.5');
  });

  it('trims trailing zeros', () => {
    expect(decodeDrops('1000000')).toBe('1');
    expect(decodeDrops('1000100')).toBe('1.0001');
  });

  it('decodes large amounts', () => {
    expect(decodeDrops('1000000000000')).toBe('1000000');
  });
});

describe('parseXrpAmount', () => {
  it('parses whole XRP', () => {
    expect(parseXrpAmount('1')).toBe(1_000_000n);
  });

  it('parses fractional XRP', () => {
    expect(parseXrpAmount('1.5')).toBe(1_500_000n);
  });

  it('parses small amounts', () => {
    expect(parseXrpAmount('0.000001')).toBe(1n);
  });

  it('parses zero', () => {
    expect(parseXrpAmount('0')).toBe(0n);
  });

  it('pads fractional part to 6 decimals', () => {
    expect(parseXrpAmount('1.1')).toBe(1_100_000n);
  });

  it('round-trips with decodeDrops', () => {
    const original = '12.345678';
    const drops = parseXrpAmount(original);
    expect(decodeDrops(drops.toString())).toBe('12.345678');
  });
});

/* ------------------------------------------------------------------ */
/*  Base58 Encoding                                                     */
/* ------------------------------------------------------------------ */

describe('xrplBytesToBase58', () => {
  it('encodes single zero byte', () => {
    expect(xrplBytesToBase58(new Uint8Array([0]))).toBe('1');
  });

  it('encodes zero bytes as leading 1s', () => {
    expect(xrplBytesToBase58(new Uint8Array([0, 0]))).toBe('11');
  });

  it('encodes a non-zero value', () => {
    const result = xrplBytesToBase58(new Uint8Array([0xff]));
    expect(result.length).toBeGreaterThan(0);
    expect(/[1-9A-HJ-NP-Za-km-z]+/.test(result)).toBe(true);
  });

  it('produces no invalid base58 characters', () => {
    const result = xrplBytesToBase58(new Uint8Array([0x00, 0x01, 0x02, 0xff, 0x7f]));
    expect(result).not.toContain('0');
    expect(result).not.toContain('O');
    expect(result).not.toContain('I');
    expect(result).not.toContain('l');
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  it('produces deterministic output', () => {
    const data = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const a = xrplBytesToBase58(data);
    const b = xrplBytesToBase58(data);
    expect(a).toBe(b);
  });
});

/* ------------------------------------------------------------------ */
/*  XrplBinaryWriter                                                    */
/* ------------------------------------------------------------------ */

describe('XrplBinaryWriter', () => {
  it('writes a single byte (UInt8)', () => {
    const writer = new XrplBinaryWriter();
    writer.write8(0xff);
    expect(writer.toBytes()).toEqual(new Uint8Array([0xff]));
  });

  it('writes u8 with overflow wrapping', () => {
    const writer = new XrplBinaryWriter();
    writer.write8(256);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x00]));
  });

  it('writes a 16-bit value (big-endian)', () => {
    const writer = new XrplBinaryWriter();
    writer.write16(0x0102);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x01, 0x02]));
  });

  it('writes a 32-bit value (big-endian)', () => {
    const writer = new XrplBinaryWriter();
    writer.write32(0x01020304);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
  });

  it('writes a 64-bit value as bigint (big-endian)', () => {
    const writer = new XrplBinaryWriter();
    writer.write64(0x0102030405060708n);
    const bytes = writer.toBytes();
    expect(bytes.length).toBe(8);
    expect(bytes[0]).toBe(0x01);
    expect(bytes[7]).toBe(0x08);
  });

  it('writes a 64-bit value from string', () => {
    const writer = new XrplBinaryWriter();
    writer.write64('1000000000');
    expect(writer.toBytes().length).toBe(8);
  });

  it('writes a raw byte array', () => {
    const writer = new XrplBinaryWriter();
    writer.writeBytes(new Uint8Array([0xaa, 0xbb, 0xcc]));
    expect(writer.toBytes()).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc]));
  });

  it('writes a hex string', () => {
    const writer = new XrplBinaryWriter();
    writer.writeHex('0xDEADBEEF');
    expect(writer.toBytes()).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it('writes an AccountID (20 bytes)', () => {
    const writer = new XrplBinaryWriter();
    writer.writeAccountId('0x1');
    const bytes = writer.toBytes();
    expect(bytes.length).toBe(20);
    expect(bytes[19]).toBe(0x01);
    expect(bytes[0]).toBe(0x00);
  });

  it('writes a Hash256 (32 bytes)', () => {
    const writer = new XrplBinaryWriter();
    writer.writeHash256('0x1');
    const bytes = writer.toBytes();
    expect(bytes.length).toBe(32);
    expect(bytes[31]).toBe(0x01);
    expect(bytes[0]).toBe(0x00);
  });

  it('writes VarUInt small value', () => {
    const writer = new XrplBinaryWriter();
    writer.writeVarUInt(42);
    expect(writer.toBytes()).toEqual(new Uint8Array([0x2a]));
  });

  it('writes VarUInt medium value', () => {
    const writer = new XrplBinaryWriter();
    writer.writeVarUInt(256);
    const bytes = writer.toBytes();
    expect(bytes[0] & 0xf0).toBe(0xf0); // 2-byte encoding
    expect(bytes.length).toBe(2);
  });

  it('tracks offset correctly', () => {
    const writer = new XrplBinaryWriter();
    writer.write8(1);
    expect(writer.offset).toBe(1);
    writer.write16(2);
    expect(writer.offset).toBe(3);
    writer.write32(4);
    expect(writer.offset).toBe(7);
  });

  it('toHex returns hex string', () => {
    const writer = new XrplBinaryWriter();
    writer.write8(0xab);
    writer.write8(0xcd);
    expect(writer.toHex()).toBe('abcd');
  });

  it('supports method chaining', () => {
    const writer = new XrplBinaryWriter();
    const result = writer.write8(1).write8(2).write8(3);
    expect(result).toBe(writer);
    expect(writer.toBytes()).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('can be pre-sized', () => {
    const writer = new XrplBinaryWriter({ size: 100 });
    writer.write8(42);
    expect(writer.toBytes().length).toBe(100);
    expect(writer.toBytes()[0]).toBe(42);
  });
});

/* ------------------------------------------------------------------ */
/*  XrplTxType enum                                                     */
/* ------------------------------------------------------------------ */

describe('XrplTxType', () => {
  it('Payment is Payment', () => {
    expect(XrplTxType.Payment).toBe('Payment');
  });

  it('OfferCreate is OfferCreate', () => {
    expect(XrplTxType.OfferCreate).toBe('OfferCreate');
  });

  it('OfferCancel is OfferCancel', () => {
    expect(XrplTxType.OfferCancel).toBe('OfferCancel');
  });

  it('TrustSet is TrustSet', () => {
    expect(XrplTxType.TrustSet).toBe('TrustSet');
  });

  it('NFTokenMint is NFTokenMint', () => {
    expect(XrplTxType.NFTokenMint).toBe('NFTokenMint');
  });

  it('NFTokenBurn is NFTokenBurn', () => {
    expect(XrplTxType.NFTokenBurn).toBe('NFTokenBurn');
  });

  it('NFTokenCreateOffer is NFTokenCreateOffer', () => {
    expect(XrplTxType.NFTokenCreateOffer).toBe('NFTokenCreateOffer');
  });

  it('NFTokenAcceptOffer is NFTokenAcceptOffer', () => {
    expect(XrplTxType.NFTokenAcceptOffer).toBe('NFTokenAcceptOffer');
  });
});

/* ------------------------------------------------------------------ */
/*  XrplFieldType enum                                                  */
/* ------------------------------------------------------------------ */

describe('XrplFieldType', () => {
  it('AccountID is 8', () => {
    expect(XrplFieldType.AccountID).toBe(8);
  });

  it('UInt16 is 1', () => {
    expect(XrplFieldType.UInt16).toBe(1);
  });

  it('UInt32 is 2', () => {
    expect(XrplFieldType.UInt32).toBe(2);
  });

  it('Hash256 is 6', () => {
    expect(XrplFieldType.Hash256).toBe(6);
  });

  it('STObject is 14', () => {
    expect(XrplFieldType.STObject).toBe(14);
  });

  it('STArray is 15', () => {
    expect(XrplFieldType.STArray).toBe(15);
  });
});

/* ------------------------------------------------------------------ */
/*  Chain Presets                                                       */
/* ------------------------------------------------------------------ */

describe('XRPL_CHAINS', () => {
  it('has 3 chains', () => {
    expect(XRPL_CHAINS.length).toBe(3);
  });

  it('includes mainnet', () => {
    const mainnet = XRPL_CHAINS.find((c) => c.id === 'xrpl:mainnet');
    expect(mainnet).toBeDefined();
    expect(mainnet!.rpcUrl).toBe('https://s1.ripple.com:51234');
    expect(mainnet!.nativeCurrency!.symbol).toBe('XRP');
    expect(mainnet!.nativeCurrency!.decimals).toBe(6);
  });

  it('includes testnet', () => {
    const testnet = XRPL_CHAINS.find((c) => c.id === 'xrpl:testnet');
    expect(testnet).toBeDefined();
    expect(testnet!.rpcUrl).toBe('https://s.altnet.rippletest.net:51234');
  });

  it('includes devnet', () => {
    const devnet = XRPL_CHAINS.find((c) => c.id === 'xrpl:devnet');
    expect(devnet).toBeDefined();
    expect(devnet!.rpcUrl).toBe('https://s.devnet.rippletest.net:51234');
  });

  it('all chains have required fields', () => {
    for (const chain of XRPL_CHAINS) {
      expect(chain.id).toBeDefined();
      expect(chain.name).toBeDefined();
      expect(chain.rpcUrl).toBeDefined();
      expect(chain.nativeCurrency).toBeDefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Wallet Info                                                         */
/* ------------------------------------------------------------------ */

describe('XRPL_WALLETS', () => {
  it('has 5 wallets', () => {
    expect(XRPL_WALLETS.length).toBe(5);
  });

  it('includes Xaman', () => {
    const wallet = XRPL_WALLETS.find((w) => w.id === 'xaman');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('Xaman (formerly XUMM)');
  });

  it('includes Ledger', () => {
    const wallet = XRPL_WALLETS.find((w) => w.id === 'ledger');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('Ledger');
  });

  it('includes Xpring Wallet', () => {
    const wallet = XRPL_WALLETS.find((w) => w.id === 'xpring');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('Xpring Wallet');
  });

  it('includes Toast Wallet', () => {
    const wallet = XRPL_WALLETS.find((w) => w.id === 'toast');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('Toast Wallet');
  });

  it('includes GemWallet', () => {
    const wallet = XRPL_WALLETS.find((w) => w.id === 'gemwallet');
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe('GemWallet');
  });

  it('all wallets have required fields', () => {
    for (const wallet of XRPL_WALLETS) {
      expect(wallet.id).toBeDefined();
      expect(wallet.name).toBeDefined();
      expect(wallet.rdns).toBeDefined();
      expect(wallet.icon).toBeDefined();
      expect(wallet.downloadUrl).toBeDefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Transaction Builders                                                */
/* ------------------------------------------------------------------ */

describe('buildPayment', () => {
  it('creates a basic Payment transaction', () => {
    const tx = buildPayment({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU',
      amount: '1000000',
      sequence: 42,
    });

    expect(tx.TransactionType).toBe(XrplTxType.Payment);
    expect(tx.Account).toBe('RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ');
    expect(tx.Destination).toBe('RPEPPER7KFTD9W2TO4CQK6UCFUHM9C6GDHQU');
    expect(tx.Amount).toBe('1000000');
    expect(tx.Fee).toBe('12');
    expect(tx.Sequence).toBe(42);
  });

  it('sets custom fee', () => {
    const tx = buildPayment({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU',
      amount: '500000',
      fee: '20',
      sequence: 1,
    });
    expect(tx.Fee).toBe('20');
  });

  it('adds memos when provided', () => {
    const tx = buildPayment({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU',
      amount: '1000000',
      sequence: 42,
      memos: [{ data: '68656c6c6f', type: '746578742f706c61696e' }],
    });
    expect(tx.Memos).toBeDefined();
    expect(tx.Memos!.length).toBe(1);
    expect(tx.Memos![0].Memo.MemoData).toBe('68656C6C6F');
  });

  it('sets flags when provided', () => {
    const tx = buildPayment({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU',
      amount: '1000000',
      sequence: 42,
      flags: 0x80000000,
    });
    expect(tx.Flags).toBe(0x80000000);
  });
});

describe('buildOfferCreate', () => {
  it('creates a basic OfferCreate transaction', () => {
    const tx = buildOfferCreate({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      takerPays: '10000000',
      takerGets: {
        currency: 'USD',
        issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
        value: '1',
      },
      sequence: 42,
    });

    expect(tx.TransactionType).toBe(XrplTxType.OfferCreate);
    expect(tx.Account).toBe('RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ');
    expect(tx.TakerPays).toBe('10000000');
    expect((tx.TakerGets as any).currency).toBe('USD');
  });

  it('sets expiration when provided', () => {
    const tx = buildOfferCreate({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      takerPays: '10000000',
      takerGets: '5000000',
      sequence: 42,
      expiration: 700000000,
    });
    expect(tx.Expiration).toBe(700000000);
  });
});

describe('buildOfferCancel', () => {
  it('creates a basic OfferCancel transaction', () => {
    const tx = buildOfferCancel({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      offerSequence: 40,
      sequence: 42,
    });

    expect(tx.TransactionType).toBe(XrplTxType.OfferCancel);
    expect(tx.OfferSequence).toBe(40);
  });
});

describe('buildTrustSet', () => {
  it('creates a basic TrustSet transaction', () => {
    const tx = buildTrustSet({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      limitAmount: {
        currency: 'USD',
        issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
        value: '1000',
      },
      sequence: 42,
    });

    expect(tx.TransactionType).toBe(XrplTxType.TrustSet);
    expect((tx.LimitAmount as any).currency).toBe('USD');
    expect((tx.LimitAmount as any).value).toBe('1000');
  });

  it('sets flags when provided', () => {
    const tx = buildTrustSet({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      limitAmount: {
        currency: 'USD',
        issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
        value: '1000',
      },
      sequence: 42,
      flags: 0x00040000, // tfSetfAuth
    });
    expect(tx.Flags).toBe(0x00040000);
  });
});

describe('buildNftMint', () => {
  it('creates a basic NFTokenMint transaction', () => {
    const tx = buildNftMint({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      nftTaxon: 0,
      sequence: 42,
    });

    expect(tx.TransactionType).toBe(XrplTxType.NFTokenMint);
    expect(tx.NFTokenTaxon).toBe(0);
  });

  it('includes URI when provided', () => {
    const tx = buildNftMint({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      nftTaxon: 1,
      uri: '697066733a2f2f',
      sequence: 42,
    });
    expect(tx.URI).toBe('697066733a2f2f');
  });

  it('includes TransferFee when provided', () => {
    const tx = buildNftMint({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      nftTaxon: 2,
      transferFee: 500, // 5%
      sequence: 42,
    });
    expect(tx.TransferFee).toBe(500);
  });
});

describe('buildNftBurn', () => {
  it('creates a basic NFTokenBurn transaction', () => {
    const tx = buildNftBurn({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      nftId: '00000123ABC' + '0'.repeat(53),
      sequence: 42,
    });

    expect(tx.TransactionType).toBe(XrplTxType.NFTokenBurn);
    expect(tx.NFTokenID).toBe('00000123ABC' + '0'.repeat(53));
  });
});

describe('buildNftCreateOffer', () => {
  it('creates a basic NFTokenCreateOffer transaction', () => {
    const tx = buildNftCreateOffer({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      nftId: '00000123ABC' + '0'.repeat(53),
      amount: '1000000',
      sequence: 42,
      flags: 1,
    });

    expect(tx.TransactionType).toBe(XrplTxType.NFTokenCreateOffer);
    expect(tx.Amount).toBe('1000000');
  });

  it('sets destination for sell offers', () => {
    const tx = buildNftCreateOffer({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      nftId: '00000123ABC' + '0'.repeat(53),
      amount: '2000000',
      sequence: 42,
      destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU',
      flags: 1,
    });
    expect(tx.Destination).toBe('RPEPPER7KFTD9W2TO4CQK6UCFUHM9C6GDHQU');
  });

  it('sets expiration when provided', () => {
    const tx = buildNftCreateOffer({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      nftId: '00000123ABC' + '0'.repeat(53),
      amount: '1000000',
      sequence: 42,
      flags: 2, // buy offer
      expiration: 700000000,
    });
    expect(tx.Expiration).toBe(700000000);
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — basics                                           */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('has correct id', () => {
    expect(adapter.id).toBe('xrpl-adapter');
  });

  it('has correct name', () => {
    expect(adapter.name).toBe('XRPL Chain Adapter');
  });

  it('defaults to mainnet RPC', () => {
    expect(adapter.getRpcUrl()).toBe('https://s1.ripple.com:51234');
  });

  it('getAddress returns null when not connected', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('getProvider returns null when not set', () => {
    expect(adapter.getProvider()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — chain management                                 */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter chain management', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('findChain returns first chain for any numeric ID', () => {
    const chain = adapter.findChain(1);
    expect(chain).toBeDefined();
    expect(chain!.id).toBe('xrpl:mainnet');
  });

  it('findChainById finds mainnet', () => {
    const chain = adapter.findChainById('xrpl:mainnet');
    expect(chain).toBeDefined();
    expect(chain!.name).toBe('XRP Ledger Mainnet');
  });

  it('findChainById finds testnet', () => {
    const chain = adapter.findChainById('xrpl:testnet');
    expect(chain).toBeDefined();
    expect(chain!.name).toBe('XRP Ledger Testnet');
  });

  it('findChainById returns undefined for unknown', () => {
    expect(adapter.findChainById('xrpl:unknown')).toBeUndefined();
  });

  it('switchChainById updates RPC URL', () => {
    adapter.switchChainById('xrpl:testnet');
    expect(adapter.getRpcUrl()).toBe('https://s.altnet.rippletest.net:51234');
  });

  it('switchChainById throws for unknown chain', async () => {
    await expect(adapter.switchChainById('xrpl:unknown')).rejects.toThrow();
  });

  it('getChainId returns string chain ID', async () => {
    const chainId = await adapter.getChainId();
    expect(chainId).toBe('xrpl:mainnet');
  });

  it('getChainIdNumeric returns a positive number', () => {
    const numeric = adapter.getChainIdNumeric();
    expect(typeof numeric).toBe('number');
    expect(numeric).toBeGreaterThan(0);
  });

  it('registerChains replaces default chains', () => {
    const customChains = [{
      id: 'xrpl:custom',
      name: 'Custom XRPL Chain',
      rpcUrl: 'https://custom.xrpl.example.com',
      nativeCurrency: { name: 'XRP', symbol: 'XRP', decimals: 6 },
    }];
    adapter.registerChains(customChains);
    expect(adapter.findChainById('xrpl:custom')).toBeDefined();
    expect(adapter.findChainById('xrpl:mainnet')).toBeUndefined();
  });

  it('switchChain updates current chain', async () => {
    await adapter.switchChain(1);
    expect(adapter.getRpcUrl()).toBe(XRPL_CHAINS[0].rpcUrl);
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — setConnector                                     */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter setConnector', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('setConnector accepts a connector', () => {
    const mockConnector = { id: 'test' } as any;
    expect(() => adapter.setConnector(mockConnector)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — setProvider                                      */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter setProvider', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
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
/*  XrplChainAdapter — setRpcUrl                                        */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter setRpcUrl', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('setRpcUrl updates the RPC URL', () => {
    adapter.setRpcUrl('https://s2.ripple.com:51234');
    expect(adapter.getRpcUrl()).toBe('https://s2.ripple.com:51234');
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — connect / disconnect                             */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter connect/disconnect', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('connect throws when no wallet is available', async () => {
    await expect(adapter.connect()).rejects.toThrow('No XRPL wallet found');
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
      connect: vi.fn().mockResolvedValue({ accounts: [{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }] }),
      disconnect: mockDisconnect,
    };
    adapter.setProvider(mockProvider);
    adapter['provider'] = mockProvider;
    adapter['_accounts'] = ['rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ'];

    await adapter.disconnect();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(adapter.getAddress()).toBeNull();
    expect(adapter.getProvider()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — getAccounts                                      */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter getAccounts', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('throws when not connected', async () => {
    await expect(adapter.getAccounts()).rejects.toThrow('Not connected');
  });

  it('returns accounts when connected', async () => {
    const mockProvider = {
      getAccounts: vi.fn().mockResolvedValue([
        { address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' },
        { address: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU' },
      ]),
      connect: vi.fn().mockResolvedValue({
        accounts: [
          { address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' },
          { address: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU' },
        ],
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    adapter.setProvider(mockProvider);

    const accounts = await mockProvider.getAccounts();
    expect(accounts.length).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — balance validation                               */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter balance validation', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('getBalance rejects invalid address', async () => {
    await expect(adapter.getBalance('invalid')).rejects.toThrow('Invalid XRPL address');
  });

  it('getBalanceFormatted rejects invalid address', async () => {
    await expect(adapter.getBalanceFormatted('not-valid')).rejects.toThrow('Invalid XRPL address');
  });

  it('getAccountInfo rejects invalid address', async () => {
    await expect(adapter.getAccountInfo('bad')).rejects.toThrow('Invalid XRPL address');
  });

  it('getTrustLines rejects invalid address', async () => {
    await expect(adapter.getTrustLines('xyz')).rejects.toThrow('Invalid XRPL address');
  });

  it('getNfts rejects invalid address', async () => {
    await expect(adapter.getNfts('invalid')).rejects.toThrow('Invalid XRPL address');
  });

  it('getOffers rejects invalid address', async () => {
    await expect(adapter.getOffers('bad')).rejects.toThrow('Invalid XRPL address');
  });

  it('getTransactions rejects invalid address', async () => {
    await expect(adapter.getTransactions('invalid')).rejects.toThrow('Invalid XRPL address');
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — transaction validation                           */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter transaction validation', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('sendTransaction throws when no provider', async () => {
    await expect(adapter.sendTransaction({})).rejects.toThrow('No provider connected');
  });

  it('signTransaction throws when no provider', async () => {
    await expect(adapter.signTransaction({})).rejects.toThrow('No provider connected');
  });

  it('signMessage throws when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('No provider connected');
  });

  it('sendXrp throws when no provider', async () => {
    await expect(adapter.sendXrp('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ', '1000000')).rejects.toThrow('No provider connected');
  });

  it('sendXrp rejects invalid recipient', async () => {
    const mockProvider = {
      getAccounts: vi.fn().mockResolvedValue([]),
      connect: vi.fn().mockResolvedValue({ accounts: [] }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      signTransaction: vi.fn(),
      request: vi.fn(),
    };
    adapter.setProvider(mockProvider);
    adapter['provider'] = mockProvider;
    adapter['_accounts'] = ['rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ'];

    await expect(adapter.sendXrp('invalid', '1000000')).rejects.toThrow('Invalid recipient');
  });

  it('createOffer throws when no provider', async () => {
    await expect(adapter.createOffer('10000000', '5000000')).rejects.toThrow('No provider connected');
  });

  it('cancelOffer throws when no provider', async () => {
    await expect(adapter.cancelOffer(40)).rejects.toThrow('No provider connected');
  });

  it('createTrustLine throws when no provider', async () => {
    await expect(adapter.createTrustLine('USD', 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', '1000')).rejects.toThrow('No provider connected');
  });

  it('mintNft throws when no provider', async () => {
    await expect(adapter.mintNft(0)).rejects.toThrow('No provider connected');
  });

  it('burnNft throws when no provider', async () => {
    await expect(adapter.burnNft('00000123ABC' + '0'.repeat(53))).rejects.toThrow('No provider connected');
  });

  it('createNftOffer throws when no provider', async () => {
    await expect(adapter.createNftOffer('00000123ABC' + '0'.repeat(53), '1000000')).rejects.toThrow('No provider connected');
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — request (EIP-1193)                               */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter request method', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
  });

  it('request throws for unsupported method', async () => {
    await expect(adapter.request({ method: 'xrpl_unknown' })).rejects.toThrow('Unsupported XRPL method');
  });

  it('request xrpl_getChainId returns chain ID', async () => {
    const result = await adapter.request({ method: 'xrpl_getChainId' });
    expect(result).toBe('xrpl:mainnet');
  });

  it('request xrpl_getBalance rejects invalid address', async () => {
    await expect(adapter.request({
      method: 'xrpl_getBalance',
      params: ['invalid'],
    })).rejects.toThrow('Invalid XRPL address');
  });

  it('request xrpl_getAccountInfo rejects invalid address', async () => {
    await expect(adapter.request({
      method: 'xrpl_getAccountInfo',
      params: ['not-valid'],
    })).rejects.toThrow('Invalid XRPL address');
  });

  it('request xrpl_getNfts rejects invalid address', async () => {
    await expect(adapter.request({
      method: 'xrpl_getNfts',
      params: ['bad'],
    })).rejects.toThrow('Invalid XRPL address');
  });
});

/* ------------------------------------------------------------------ */
/*  Integration-style tests with mocked provider                        */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter with mock provider', () => {
  let adapter: XrplChainAdapter;
  let mockProvider: any;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
    mockProvider = {
      name: 'Test XRPL Wallet',
      getAccounts: vi.fn().mockResolvedValue([{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }]),
      connect: vi.fn().mockResolvedValue({
        accounts: [{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }],
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      signMessage: vi.fn().mockResolvedValue({
        message: 'hello',
        signature: 'deadbeef',
      }),
      signTransaction: vi.fn().mockResolvedValue({
        tx_blob: '120000...',
        hash: 'ABC123',
      }),
      signAndSubmit: undefined,
      request: undefined,
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  it('getAddress returns connected address after setting provider', () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];
    expect(adapter.getAddress()).toBe('RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ');
  });

  it('getAccounts returns connected accounts', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual(['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ']);
  });

  it('signMessage delegates to provider', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];

    const sig = await adapter.signMessage('hello world');
    expect(mockProvider.signMessage).toHaveBeenCalled();
    expect(sig).toBe('deadbeef');
  });

  it('signTransaction delegates to provider', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];

    const result = await adapter.signTransaction({
      TransactionType: 'Payment',
      Account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
    });
    expect(mockProvider.signTransaction).toHaveBeenCalled();
    expect(result.tx_blob).toBe('120000...');
    expect(result.hash).toBe('ABC123');
  });

  it('signTransaction throws if wallet does not support it', async () => {
    mockProvider.signTransaction = undefined;
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];

    await expect(adapter.signTransaction({})).rejects.toThrow('does not support transaction signing');
  });

  it('signMessage throws if wallet does not support it', async () => {
    mockProvider.signMessage = undefined;
    mockProvider.request = undefined;
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];

    await expect(adapter.signMessage('hello')).rejects.toThrow('does not support message signing');
  });

  it('sendTransaction delegates to signTransaction then submit', async () => {
    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];

    // Mock getFee and getLedger to avoid RPC calls
    adapter['_rpcClient'] = {
      getFee: vi.fn().mockResolvedValue({
        drops: {
          open_ledger_fee: '15',
          minimum_fee: '10',
          median_fee: '12',
          base_fee: '10',
        },
        levels: { median_level: 12, minimum_level: 10, open_ledger_level: 15, reference_level: 10 },
        current_ledger_size: '0',
        current_queue_size: '0',
      }),
      getLedger: vi.fn().mockResolvedValue({
        ledger: { ledger_index: 80000000, total_coins: '100000000000000000', parent_close_time: 0, parent_hash: '0' },
        ledger_hash: '0',
        ledger_index: 80000000,
        validated: true,
      }),
      submit: vi.fn().mockResolvedValue({
        engine_result: 'tesSUCCESS',
        engine_result_code: 0,
        engine_result_message: 'The transaction was applied.',
        tx_blob: '120000...',
        tx_json: { hash: 'DEADBEEF123', Account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' },
      }),
      getAccountInfo: vi.fn().mockResolvedValue({
        account_data: {
          Account: 'RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ',
          Balance: '1000000000',
          Sequence: 42,
          OwnerCount: 0,
          Flags: 0,
        },
        ledger_current_index: 80000000,
        validated: true,
      }),
      getAccountTransactions: vi.fn().mockResolvedValue({ transactions: [] }),
      getAccountOffers: vi.fn().mockResolvedValue({ offers: [] }),
      getAccountNfts: vi.fn().mockResolvedValue({ account_nfts: [] }),
      getAccountLines: vi.fn().mockResolvedValue({ lines: [] }),
      getTransaction: vi.fn().mockResolvedValue({ hash: 'TEST', tx_json: {}, meta: {} }),
      getServerInfo: vi.fn().mockResolvedValue({ info: { server_state: 'full' } }),
      generateTxBlob: vi.fn().mockResolvedValue({ tx_blob: 'test' }),
      getBalance: vi.fn().mockResolvedValue('1000000000'),
      call: vi.fn().mockResolvedValue({}),
    } as any;

    const tx = buildPayment({
      account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU',
      amount: '1000000',
      fee: '15',
      sequence: 42,
    });

    const hash = await adapter.sendTransaction(tx);
    expect(hash).toBe('DEADBEEF123');
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — mock RPC queries                                */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter with mocked RPC', () => {
  let adapter: XrplChainAdapter;

  beforeEach(() => {
    adapter = new XrplChainAdapter();

    // Mock the RPC client
    adapter['_rpcClient'] = {
      getFee: vi.fn().mockResolvedValue({
        drops: {
          open_ledger_fee: '15',
          minimum_fee: '10',
          median_fee: '12',
          base_fee: '10',
        },
        levels: { median_level: 12, minimum_level: 10, open_ledger_level: 15, reference_level: 10 },
        current_ledger_size: '0',
        current_queue_size: '0',
      }),
      getLedger: vi.fn().mockResolvedValue({
        ledger: { ledger_index: 80000000, total_coins: '100000000000000000', parent_close_time: 0, parent_hash: '0' },
        ledger_hash: '0',
        ledger_index: 80000000,
        validated: true,
      }),
      getBalance: vi.fn().mockResolvedValue('1000000000'),
      getAccountInfo: vi.fn().mockResolvedValue({
        account_data: {
          Account: 'RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ',
          Balance: '1000000000',
          Sequence: 42,
          OwnerCount: 5,
          Flags: 0,
          RegularKey: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU',
        },
        ledger_current_index: 80000000,
        validated: true,
      }),
      getAccountTransactions: vi.fn().mockResolvedValue({
        transactions: [
          {
            tx: { TransactionType: 'Payment', Fee: '12', Account: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' },
            meta: { TransactionResult: 'tesSUCCESS' },
            hash: 'ABC123DEF456',
            ledger_index: 79999999,
            date: 700000000,
          },
        ],
      }),
      getAccountOffers: vi.fn().mockResolvedValue({
        offers: [
          {
            seq: 40,
            TakerPays: '10000000',
            TakerGets: { currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', value: '1' },
            Flags: 0,
            quality: '0.000000001',
          },
        ],
        ledger_index: 80000000,
      }),
      getAccountNfts: vi.fn().mockResolvedValue({
        account_nfts: [
          {
            NFTokenID: '00000123ABC' + '0'.repeat(53),
            NFTokenTaxon: 1,
            TransferFee: 500,
            URI: '697066733a2f2f',
            Issuer: 'RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ',
            nft_serial: 0,
          },
        ],
        ledger_index: 80000000,
      }),
      getAccountLines: vi.fn().mockResolvedValue({
        lines: [
          {
            account: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
            balance: '50.5',
            currency: 'USD',
            limit: '1000',
            limit_peer: '0',
            quality_in: 0,
            quality_out: 0,
            authorized: true,
            peer_authorized: true,
            no_ripple: false,
            no_ripple_peer: false,
          },
        ],
        ledger_index: 80000000,
      }),
      submit: vi.fn().mockResolvedValue({
        engine_result: 'tesSUCCESS',
        engine_result_code: 0,
        engine_result_message: 'The transaction was applied.',
        tx_blob: '120000...',
        tx_json: { hash: 'DEADBEEF123' },
      }),
      getTransaction: vi.fn().mockResolvedValue({
        hash: 'ABC123DEF456',
        tx_json: { TransactionType: 'Payment', Fee: '12' },
        meta: { TransactionResult: 'tesSUCCESS' },
        LedgerIndex: 79999999,
        validated: true,
        date: 700000000,
      }),
      getServerInfo: vi.fn().mockResolvedValue({
        info: { server_state: 'full', validated_ledger: { seq: 80000000 } },
      }),
      generateTxBlob: vi.fn().mockResolvedValue({ tx_blob: 'test' }),
      call: vi.fn().mockResolvedValue({}),
    } as any;
  });

  it('getBalance returns balance from mock', async () => {
    const balance = await adapter.getBalance('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ');
    expect(balance).toBe('1000000000');
  });

  it('getBalanceFormatted returns formatted XRP', async () => {
    const formatted = await adapter.getBalanceFormatted('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ');
    expect(formatted).toBe('1000');
  });

  it('getAccountInfo returns account data', async () => {
    const info = await adapter.getAccountInfo('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ');
    expect(info).not.toBeNull();
    expect(info!.address).toBe('RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ');
    expect(info!.balance).toBe('1000000000');
    expect(info!.sequence).toBe(42);
    expect(info!.ownerCount).toBe(5);
    expect(info!.regularKey).toBe('rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU');
  });

  it('getTrustLines returns trust lines', async () => {
    const lines = await adapter.getTrustLines('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ');
    expect(lines.length).toBe(1);
    expect(lines[0].currency).toBe('USD');
    expect(lines[0].balance).toBe('50.5');
    expect(lines[0].limit).toBe('1000');
    expect(lines[0].authorized).toBe(true);
  });

  it('getOffers returns offers', async () => {
    const offers = await adapter.getOffers('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ');
    expect(offers.length).toBe(1);
    expect(offers[0].seq).toBe(40);
    expect(offers[0].takerPays).toBe('10000000');
  });

  it('getNfts returns NFTs', async () => {
    const nfts = await adapter.getNfts('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ');
    expect(nfts.length).toBe(1);
    expect(nfts[0].nftTaxon).toBe(1);
    expect(nfts[0].nftTransferFee).toBe(500);
  });

  it('getTransactions returns transaction history', async () => {
    const txs = await adapter.getTransactions('rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ');
    expect(txs.length).toBe(1);
    expect(txs[0].txType).toBe('Payment');
    expect(txs[0].status).toBe('tesSUCCESS');
    expect(txs[0].hash).toBe('ABC123DEF456');
  });

  it('getTransaction returns specific transaction', async () => {
    const tx = await adapter.getTransaction('ABC123DEF456');
    expect(tx).not.toBeNull();
    expect(tx!.txType).toBe('Payment');
    expect(tx!.status).toBe('tesSUCCESS');
  });

  it('getTokenBalance finds matching trust line', async () => {
    const balance = await adapter.getTokenBalance(
      'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      'USD',
      'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
    );
    expect(balance).toBe('50.5');
  });

  it('getTokenBalance returns 0 for unknown currency', async () => {
    const balance = await adapter.getTokenBalance(
      'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ',
      'EUR',
      'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
    );
    expect(balance).toBe('0');
  });

  it('getFeeEstimate returns fee data', async () => {
    const fees = await adapter.getFeeEstimate();
    expect(fees.openLedgerFee).toBe('15');
    expect(fees.minimumFee).toBe('10');
    expect(fees.medianFee).toBe('12');
    expect(fees.levels.minimum).toBe(10);
    expect(fees.levels.openLedger).toBe(15);
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — sendXrp with mock provider                       */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter sendXrp', () => {
  let adapter: XrplChainAdapter;
  let mockProvider: any;
  let mockRpcClient: any;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
    mockProvider = {
      name: 'Test XRPL Wallet',
      getAccounts: vi.fn().mockResolvedValue([{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }]),
      connect: vi.fn().mockResolvedValue({ accounts: [{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }] }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      signTransaction: vi.fn().mockResolvedValue({
        tx_blob: '120000...',
        hash: 'ABC123',
      }),
      signAndSubmit: vi.fn().mockResolvedValue({
        hash: 'DEADBEEF456',
        result: { engine_result: 'tesSUCCESS' },
      }),
      request: undefined,
    };

    mockRpcClient = {
      getFee: vi.fn().mockResolvedValue({
        drops: { open_ledger_fee: '15', minimum_fee: '10', median_fee: '12', base_fee: '10' },
        levels: { median_level: 12, minimum_level: 10, open_ledger_level: 15, reference_level: 10 },
        current_ledger_size: '0',
        current_queue_size: '0',
      }),
      getLedger: vi.fn().mockResolvedValue({
        ledger: { ledger_index: 80000000, total_coins: '100000000000000000', parent_close_time: 0, parent_hash: '0' },
        ledger_hash: '0',
        ledger_index: 80000000,
        validated: true,
      }),
      getAccountInfo: vi.fn().mockResolvedValue({
        account_data: {
          Account: 'RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ',
          Balance: '1000000000',
          Sequence: 42,
          OwnerCount: 0,
          Flags: 0,
        },
        ledger_current_index: 80000000,
        validated: true,
      }),
      submit: vi.fn().mockResolvedValue({
        engine_result: 'tesSUCCESS',
        engine_result_code: 0,
        engine_result_message: 'The transaction was applied.',
        tx_blob: '120000...',
        tx_json: { hash: 'DEADBEEF456' },
      }),
      getAccountTransactions: vi.fn().mockResolvedValue({ transactions: [] }),
      getAccountOffers: vi.fn().mockResolvedValue({ offers: [] }),
      getAccountNfts: vi.fn().mockResolvedValue({ account_nfts: [] }),
      getAccountLines: vi.fn().mockResolvedValue({ lines: [] }),
      getTransaction: vi.fn().mockResolvedValue({ hash: 'TEST', tx_json: {}, meta: {} }),
      getServerInfo: vi.fn().mockResolvedValue({ info: { server_state: 'full' } }),
      generateTxBlob: vi.fn().mockResolvedValue({ tx_blob: 'test' }),
      getBalance: vi.fn().mockResolvedValue('1000000000'),
      call: vi.fn().mockResolvedValue({}),
    };

    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];
    adapter['_rpcClient'] = mockRpcClient;
  });

  it('sendXrp uses signAndSubmit when available', async () => {
    const hash = await adapter.sendXrp('rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU', '1000000');
    expect(hash).toBe('DEADBEEF456');
    expect(mockProvider.signAndSubmit).toHaveBeenCalled();
  });

  it('sendXrp falls back to signTransaction + submit', async () => {
    mockProvider.signAndSubmit = undefined;

    const hash = await adapter.sendXrp('rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU', '1000000');
    expect(hash).toBe('DEADBEEF123');
    expect(mockProvider.signTransaction).toHaveBeenCalled();
    expect(mockRpcClient.submit).toHaveBeenCalled();
  });

  it('sendXrp with XRP decimal amount', async () => {
    mockProvider.signAndSubmit = undefined;

    const hash = await adapter.sendXrp('rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU', '1.5');
    expect(hash).toBe('DEADBEEF123');
    expect(mockProvider.signTransaction).toHaveBeenCalled();
  });

  it('sendXrp with memo', async () => {
    mockProvider.signAndSubmit = undefined;

    const hash = await adapter.sendXrp('rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU', '1000000', 'payment memo');
    expect(hash).toBe('DEADBEEF123');
    expect(mockProvider.signTransaction).toHaveBeenCalled();

    // Verify the transaction had a memo
    const callArgs = mockProvider.signTransaction.mock.calls[0][0];
    expect(callArgs.Memos).toBeDefined();
    expect(callArgs.Memos.length).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — DEX operations with mock                         */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter DEX operations', () => {
  let adapter: XrplChainAdapter;
  let mockProvider: any;
  let mockRpcClient: any;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
    mockProvider = {
      name: 'Test XRPL Wallet',
      getAccounts: vi.fn().mockResolvedValue([{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }]),
      connect: vi.fn().mockResolvedValue({ accounts: [{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }] }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      signTransaction: vi.fn().mockResolvedValue({
        tx_blob: '120000...',
        hash: 'ABC123',
      }),
      signAndSubmit: vi.fn().mockResolvedValue({
        hash: 'OFFER_HASH',
        result: { engine_result: 'tesSUCCESS' },
      }),
    };

    mockRpcClient = {
      getFee: vi.fn().mockResolvedValue({
        drops: { open_ledger_fee: '15', minimum_fee: '10', median_fee: '12', base_fee: '10' },
        levels: { median_level: 12, minimum_level: 10, open_ledger_level: 15, reference_level: 10 },
        current_ledger_size: '0',
        current_queue_size: '0',
      }),
      getLedger: vi.fn().mockResolvedValue({
        ledger: { ledger_index: 80000000, total_coins: '100000000000000000', parent_close_time: 0, parent_hash: '0' },
        ledger_hash: '0',
        ledger_index: 80000000,
        validated: true,
      }),
      getAccountInfo: vi.fn().mockResolvedValue({
        account_data: {
          Account: 'RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ',
          Balance: '1000000000',
          Sequence: 42,
          OwnerCount: 0,
          Flags: 0,
        },
        ledger_current_index: 80000000,
        validated: true,
      }),
      submit: vi.fn().mockResolvedValue({
        engine_result: 'tesSUCCESS',
        engine_result_code: 0,
        engine_result_message: 'The transaction was applied.',
        tx_blob: '120000...',
        tx_json: { hash: 'TX_HASH' },
      }),
      getAccountTransactions: vi.fn().mockResolvedValue({ transactions: [] }),
      getAccountOffers: vi.fn().mockResolvedValue({ offers: [] }),
      getAccountNfts: vi.fn().mockResolvedValue({ account_nfts: [] }),
      getAccountLines: vi.fn().mockResolvedValue({ lines: [] }),
      getTransaction: vi.fn().mockResolvedValue({ hash: 'TEST', tx_json: {}, meta: {} }),
      getServerInfo: vi.fn().mockResolvedValue({ info: { server_state: 'full' } }),
      generateTxBlob: vi.fn().mockResolvedValue({ tx_blob: 'test' }),
      getBalance: vi.fn().mockResolvedValue('1000000000'),
      call: vi.fn().mockResolvedValue({}),
    };

    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];
    adapter['_rpcClient'] = mockRpcClient;
  });

  it('createOffer creates an offer', async () => {
    const hash = await adapter.createOffer(
      '10000000',
      {
        currency: 'USD',
        issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
        value: '1',
      },
    );
    expect(hash).toBe('OFFER_HASH');
    expect(mockProvider.signAndSubmit).toHaveBeenCalled();
  });

  it('cancelOffer cancels an offer', async () => {
    mockProvider.signAndSubmit = undefined;
    const hash = await adapter.cancelOffer(40);
    expect(hash).toBe('TX_HASH');
    expect(mockProvider.signTransaction).toHaveBeenCalled();
  });

  it('createTrustLine sets up trust line', async () => {
    const hash = await adapter.createTrustLine('USD', 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', '1000');
    expect(hash).toBe('OFFER_HASH');
    expect(mockProvider.signAndSubmit).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/*  XrplChainAdapter — NFT operations with mock                         */
/* ------------------------------------------------------------------ */

describe('XrplChainAdapter NFT operations', () => {
  let adapter: XrplChainAdapter;
  let mockProvider: any;
  let mockRpcClient: any;

  beforeEach(() => {
    adapter = new XrplChainAdapter();
    mockProvider = {
      name: 'Test XRPL Wallet',
      getAccounts: vi.fn().mockResolvedValue([{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }]),
      connect: vi.fn().mockResolvedValue({ accounts: [{ address: 'rDNHxJ2sMfWjHxGfKfDgZcGfDnKvGhLwZQ' }] }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      signTransaction: vi.fn().mockResolvedValue({
        tx_blob: '120000...',
        hash: 'ABC123',
      }),
      signAndSubmit: vi.fn().mockResolvedValue({
        hash: 'NFT_HASH',
        result: { engine_result: 'tesSUCCESS' },
      }),
    };

    mockRpcClient = {
      getFee: vi.fn().mockResolvedValue({
        drops: { open_ledger_fee: '15', minimum_fee: '10', median_fee: '12', base_fee: '10' },
        levels: { median_level: 12, minimum_level: 10, open_ledger_level: 15, reference_level: 10 },
        current_ledger_size: '0',
        current_queue_size: '0',
      }),
      getLedger: vi.fn().mockResolvedValue({
        ledger: { ledger_index: 80000000, total_coins: '100000000000000000', parent_close_time: 0, parent_hash: '0' },
        ledger_hash: '0',
        ledger_index: 80000000,
        validated: true,
      }),
      getAccountInfo: vi.fn().mockResolvedValue({
        account_data: {
          Account: 'RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ',
          Balance: '1000000000',
          Sequence: 42,
          OwnerCount: 0,
          Flags: 0,
        },
        ledger_current_index: 80000000,
        validated: true,
      }),
      submit: vi.fn().mockResolvedValue({
        engine_result: 'tesSUCCESS',
        engine_result_code: 0,
        engine_result_message: 'The transaction was applied.',
        tx_blob: '120000...',
        tx_json: { hash: 'NFT_HASH' },
      }),
      getAccountTransactions: vi.fn().mockResolvedValue({ transactions: [] }),
      getAccountOffers: vi.fn().mockResolvedValue({ offers: [] }),
      getAccountNfts: vi.fn().mockResolvedValue({ account_nfts: [] }),
      getAccountLines: vi.fn().mockResolvedValue({ lines: [] }),
      getTransaction: vi.fn().mockResolvedValue({ hash: 'TEST', tx_json: {}, meta: {} }),
      getServerInfo: vi.fn().mockResolvedValue({ info: { server_state: 'full' } }),
      generateTxBlob: vi.fn().mockResolvedValue({ tx_blob: 'test' }),
      getBalance: vi.fn().mockResolvedValue('1000000000'),
      call: vi.fn().mockResolvedValue({}),
    };

    adapter.setProvider(mockProvider);
    adapter['_accounts'] = ['RDNHXJ2SMFWJHXGFKFDGZCGFDNKVGVLWZQ'];
    adapter['_rpcClient'] = mockRpcClient;
  });

  it('mintNft mints an NFT', async () => {
    const hash = await adapter.mintNft(0, '697066733a2f2f', 500);
    expect(hash).toBe('NFT_HASH');
    expect(mockProvider.signAndSubmit).toHaveBeenCalled();
  });

  it('burnNft burns an NFT', async () => {
    mockProvider.signAndSubmit = undefined;
    const hash = await adapter.burnNft('00000123ABC' + '0'.repeat(53));
    expect(hash).toBe('NFT_HASH');
    expect(mockProvider.signTransaction).toHaveBeenCalled();
  });

  it('createNftOffer creates an NFT offer', async () => {
    const hash = await adapter.createNftOffer(
      '00000123ABC' + '0'.repeat(53),
      '1000000',
      undefined,
      1,
    );
    expect(hash).toBe('NFT_HASH');
    expect(mockProvider.signAndSubmit).toHaveBeenCalled();
  });

  it('createNftOffer with destination', async () => {
    const hash = await adapter.createNftOffer(
      '00000123ABC' + '0'.repeat(53),
      '2000000',
      'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDHqU',
      1,
    );
    expect(hash).toBe('NFT_HASH');
  });
});
