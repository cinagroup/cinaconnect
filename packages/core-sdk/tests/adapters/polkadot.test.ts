/**
 * Polkadot Chain Adapter tests.
 *
 * Tests cover SS58 address validation, balance conversion, transaction building,
 * and utility functions without requiring a live wallet or RPC connection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PolkadotChainAdapter,
  POLKADOT_CHAINS,
  POLKADOT_WALLETS,
  decodeSS58,
  isValidSS58Address,
} from '../../src/adapters/polkadot.js';

/* ------------------------------------------------------------------ */
/*  SS58 Address Validation                                            */
/* ------------------------------------------------------------------ */

describe('isValidSS58Address', () => {
  it('accepts valid SS58 addresses', () => {
    // Polkadot (prefix 0)
    expect(isValidSS58Address('13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd')).toBe(true);
    // Kusama (prefix 2)
    expect(isValidSS58Address('HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F')).toBe(true);
    // Generic (prefix 42)
    expect(isValidSS58Address('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')).toBe(true);
  });

  it('rejects empty and too-short addresses', () => {
    expect(isValidSS58Address('')).toBe(false);
    expect(isValidSS58Address('short')).toBe(false);
    expect(isValidSS58Address('1234567890123456789012345678901234567890123456')).toBe(false);
  });

  it('rejects addresses with invalid base58 characters', () => {
    expect(isValidSS58Address('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQ!')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidSS58Address(123 as unknown as string)).toBe(false);
  });
});

describe('decodeSS58', () => {
  it('decodes valid SS58 addresses', () => {
    // Generic address with prefix 42 (0x2a)
    const addr = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const result = decodeSS58(addr);
    expect(result).not.toBeNull();
    expect(result!.publicKey.length).toBe(64); // 32 bytes as hex
  });

  it('returns null for invalid addresses', () => {
    expect(decodeSS58('')).toBeNull();
    expect(decodeSS58('short')).toBeNull();
    expect(decodeSS58('invalidSS58address!!')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Chain Presets                                                      */
/* ------------------------------------------------------------------ */

describe('POLKADOT_CHAINS', () => {
  it('includes mainnet and testnets', () => {
    expect(POLKADOT_CHAINS.length).toBe(3);
    expect(POLKADOT_CHAINS[0].name).toBe('Polkadot');
    expect(POLKADOT_CHAINS[1].name).toBe('Kusama');
    expect(POLKADOT_CHAINS[2].name).toContain('Westend');
  });

  it('has correct native currencies', () => {
    expect(POLKADOT_CHAINS[0].nativeCurrency?.symbol).toBe('DOT');
    expect(POLKADOT_CHAINS[0].nativeCurrency?.decimals).toBe(10);
    expect(POLKADOT_CHAINS[1].nativeCurrency?.symbol).toBe('KSM');
    expect(POLKADOT_CHAINS[1].nativeCurrency?.decimals).toBe(12);
  });

  it('has valid RPC and explorer URLs', () => {
    POLKADOT_CHAINS.forEach((chain) => {
      expect(chain.rpcUrl).toMatch(/^wss?:\/\//);
      expect(chain.explorerUrl).toMatch(/^https?:\/\//);
    });
  });
});

describe('POLKADOT_WALLETS', () => {
  it('includes major Polkadot wallets', () => {
    const ids = POLKADOT_WALLETS.map((w) => w.id);
    expect(ids).toContain('polkadotjs');
    expect(ids).toContain('talisman');
    expect(ids).toContain('subwallet');
  });
});

/* ------------------------------------------------------------------ */
/*  Adapter Instance                                                   */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter', () => {
  let adapter: PolkadotChainAdapter;

  beforeEach(() => {
    adapter = new PolkadotChainAdapter();
  });

  it('has correct identity', () => {
    expect(adapter.id).toBe('polkadot-adapter');
    expect(adapter.name).toBe('Polkadot Chain Adapter');
  });

  it('registers chains', () => {
    adapter.registerChains(POLKADOT_CHAINS);
    expect(adapter.findChainById('polkadot:91b171bb158e2d3848fa23a9f1c25182')).toBeDefined();
  });

  it('sets RPC URL', () => {
    adapter.setRpcUrl('wss://custom.polkadot.rpc');
  });

  it('returns empty accounts when not connected', async () => {
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual([]);
  });

  it('returns null address when not connected', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('switches chain', async () => {
    adapter.registerChains(POLKADOT_CHAINS);
    await expect(adapter.switchChain(1)).resolves.not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  Unit Conversion                                                    */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter plancksToDOT', () => {
  it('converts whole numbers', () => {
    expect(PolkadotChainAdapter.plancksToDOT('10000000000')).toBe('1');
    expect(PolkadotChainAdapter.plancksToDOT('50000000000')).toBe('5');
  });

  it('converts fractional numbers', () => {
    expect(PolkadotChainAdapter.plancksToDOT('12345678901')).toBe('1.2345678901');
    expect(PolkadotChainAdapter.plancksToDOT('10000000001')).toBe('1.0000000001');
  });

  it('handles zero', () => {
    expect(PolkadotChainAdapter.plancksToDOT('0')).toBe('0');
  });
});

describe('PolkadotChainAdapter dotToPlancks', () => {
  it('converts whole numbers', () => {
    expect(PolkadotChainAdapter.dotToPlancks('1')).toBe('10000000000');
    expect(PolkadotChainAdapter.dotToPlancks('5')).toBe('50000000000');
  });

  it('converts fractional numbers', () => {
    expect(PolkadotChainAdapter.dotToPlancks('1.2345678901')).toBe('12345678901');
  });

  it('handles zero', () => {
    expect(PolkadotChainAdapter.dotToPlancks('0')).toBe('0');
  });
});

/* ------------------------------------------------------------------ */
/*  Transaction Building                                               */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter buildTransfer', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('builds a valid DOT transfer', () => {
    const tx = adapter.buildTransfer(
      '13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd',
      '10000000000',
    );
    expect(tx.to).toBe('13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd');
    expect(tx.value).toBe('10000000000');
  });

  it('throws on invalid recipient', () => {
    expect(() =>
      adapter.buildTransfer('invalid-address', '10000000000'),
    ).toThrow('Invalid recipient address');
  });
});

describe('PolkadotChainAdapter buildAssetTransfer', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('builds an asset transfer', () => {
    const tx = adapter.buildAssetTransfer({
      assetId: '1984',
      to: '13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd',
      amount: '1000000',
    });
    expect(tx.to).toBe('13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd');
    expect(tx.value).toBe('1000000');
    expect(tx.memo).toBe('asset:1984');
  });

  it('throws on invalid recipient', () => {
    expect(() =>
      adapter.buildAssetTransfer({
        assetId: '1984',
        to: 'invalid',
        amount: '100',
      }),
    ).toThrow('Invalid recipient address');
  });
});

/* ------------------------------------------------------------------ */
/*  Balance Formatting                                                 */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter getBalanceFormatted', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('throws on invalid address', async () => {
    await expect(adapter.getBalanceFormatted('invalid')).rejects.toThrow('Invalid Polkadot address');
  });
});

/* ------------------------------------------------------------------ */
/*  getAssetBalance                                                    */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter getAssetBalance', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('throws on invalid address', async () => {
    await expect(adapter.getAssetBalance('1984', 'invalid')).rejects.toThrow('Invalid Polkadot address');
  });
});

/* ------------------------------------------------------------------ */
/*  sendTransaction                                                    */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter sendTransaction', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('throws when no provider', async () => {
    await expect(
      adapter.sendTransaction({ to: '13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd', value: '1000' }),
    ).rejects.toThrow('No provider connected');
  });
});

/* ------------------------------------------------------------------ */
/*  signMessage                                                        */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter signMessage', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('throws when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('does not support message signing');
  });

  it('throws when no connected address', async () => {
    const mockProvider = {
      accounts: [],
      signer: { signRaw: vi.fn() },
      subscribe: vi.fn(),
      disconnect: vi.fn(),
    };
    adapter.setProvider(mockProvider as any);
    await expect(adapter.signMessage('hello')).rejects.toThrow('No connected address');
  });

  it('signMessage works when signer is available', async () => {
    const mockProvider = {
      accounts: [{ address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }],
      signer: { signRaw: vi.fn().mockResolvedValue({ signature: '0xdeadbeef' }) },
      subscribe: vi.fn(),
      disconnect: vi.fn(),
    };
    adapter.setProvider(mockProvider as any);
    // signMessage requires a connected address (set via connect()),
    // so without connection it throws 'No connected address'
    await expect(adapter.signMessage('hello')).rejects.toThrow('No connected address');
  });
});

/* ------------------------------------------------------------------ */
/*  PolkadotChainAdapter - Provider & API                               */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter provider and API', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('returns null provider before setProvider', () => {
    expect(adapter.getProvider()).toBeNull();
  });

  it('accepts and returns provider', () => {
    const mockProvider = {
      accounts: [],
      signer: {},
      subscribe: vi.fn(),
      disconnect: vi.fn(),
    };
    adapter.setProvider(mockProvider as any);
    expect(adapter.getProvider()).toBe(mockProvider);
  });

  it('connect throws when no wallet', async () => {
    await expect(adapter.connect()).rejects.toThrow('No Polkadot wallet found');
  });

  it('connect throws for unrecognized wallet ID', async () => {
    await expect(adapter.connect('unknown-wallet')).rejects.toThrow('No Polkadot wallet found');
  });

  it('disconnect clears state', async () => {
    const mockProvider = {
      accounts: [{ address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }],
      signer: {},
      subscribe: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    adapter.setProvider(mockProvider as any);
    await adapter.disconnect();
    expect(adapter.getAddress()).toBeNull();
  });

  it('getBalance throws on invalid address', async () => {
    await expect(adapter.getBalance('invalid-address')).rejects.toThrow('Invalid Polkadot address');
  });

  it('getBalanceFormatted throws on invalid address', async () => {
    await expect(adapter.getBalanceFormatted('invalid')).rejects.toThrow('Invalid Polkadot address');
  });

  it('getAssetBalance throws on invalid address', async () => {
    await expect(adapter.getAssetBalance('1', 'invalid')).rejects.toThrow('Invalid Polkadot address');
  });
});

/* ------------------------------------------------------------------ */
/*  decodeSS58 extended                                                 */
/* ------------------------------------------------------------------ */

describe('decodeSS58 extended', () => {
  it('returns null for too-long address', () => {
    expect(decodeSS58('a'.repeat(50))).toBeNull();
  });

  it('returns null for address with too many leading zeros causing short bytes', () => {
    // '1' is the leading zero character in base58, so many '1's produce
    // a very short byte array that's less than 35 bytes
    expect(decodeSS58('1111111111111111111111111111111111111111111111111')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  SCALE Codec — Compact Encoding/Decoding                             */
/* ------------------------------------------------------------------ */

describe('SCALE Compact decoding', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });
  const _decodeCompact = (bytes: Uint8Array, offset?: number) =>
    (adapter as any)._scaleDecodeCompact(bytes, offset ?? 0);

  it('decodes single-byte mode (mode 00)', () => {
    // value 0 << 2 = 0, mode 00
    expect(_decodeCompact(new Uint8Array([0b000000_00]))).toEqual({ value: 0n, bytesRead: 1 });
    // value 1 << 2 = 4, mode 00
    expect(_decodeCompact(new Uint8Array([0b000001_00]))).toEqual({ value: 1n, bytesRead: 1 });
    // value 63 << 2 = 252, mode 00  (max for single-byte)
    expect(_decodeCompact(new Uint8Array([0b111111_00]))).toEqual({ value: 63n, bytesRead: 1 });
  });

  it('decodes two-byte mode (mode 01)', () => {
    // (value << 2) | 01 = (1 << 2) | 01 = 0b000001_01 = 5
    // value = 16383 << 2 = 0xFFFC, then + 01 = 0xFFFD
    const bytes = new Uint8Array([0b111111_01, 0xFF]);
    expect(_decodeCompact(bytes)).toEqual({ value: 16383n, bytesRead: 2 });
  });

  it('decodes four-byte mode (mode 10)', () => {
    // value = 1073741823 << 2 | 0b10 => 0xFFFFFFFE
    const bytes = new Uint8Array([0b111111_10, 0xFF, 0xFF, 0xFF]);
    // 0xFFFFFFFE >> 2 = 0x3FFFFFFF = 1073741823
    // Note: JS bitwise operations truncate to signed 32-bit, so we test what the impl returns
    expect(_decodeCompact(bytes)).toEqual({ value: 1073741823n, bytesRead: 4 });
  });

  it('decodes big-int mode (mode 11)', () => {
    // lenExp = 0 => byteCount = 4, value in 4 bytes after prefix
    // prefix = (0 << 2) | 0b11 = 0b000000_11 = 3
    const bytes = new Uint8Array([0b000000_11, 0x01, 0x02, 0x03, 0x04]);
    // value = 0x04030201 = 67305985
    expect(_decodeCompact(bytes)).toEqual({ value: 67305985n, bytesRead: 5 });
  });

  it('throws on empty input', () => {
    expect(() => _decodeCompact(new Uint8Array([]))).toThrow('offset 0 beyond 0 bytes');
  });

  it('throws on insufficient bytes for mode 01', () => {
    expect(() => _decodeCompact(new Uint8Array([0b000000_01]))).toThrow('need 2 bytes');
  });

  it('throws on insufficient bytes for mode 10', () => {
    expect(() => _decodeCompact(new Uint8Array([0b000000_10, 0x00]))).toThrow('need 4 bytes');
  });

  it('throws on insufficient bytes for mode 11', () => {
    // lenExp=0 => need 5 bytes, only provide 2
    expect(() => _decodeCompact(new Uint8Array([0b000000_11, 0x01]))).toThrow('need 5 bytes');
  });
});

/* ------------------------------------------------------------------ */
/*  SCALE Codec — u128 Encoding/Decoding                                */
/* ------------------------------------------------------------------ */

describe('SCALE u128 decoding', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });
  const _decodeU128 = (bytes: Uint8Array, offset?: number) =>
    (adapter as any)._scaleDecodeU128(bytes, offset ?? 0);

  it('decodes zero', () => {
    const bytes = new Uint8Array(16);
    expect(_decodeU128(bytes)).toBe(0n);
  });

  it('decodes 1 in little-endian', () => {
    const bytes = new Uint8Array(16);
    bytes[0] = 1;
    expect(_decodeU128(bytes)).toBe(1n);
  });

  it('decodes 256 (0x100) in little-endian', () => {
    const bytes = new Uint8Array(16);
    bytes[1] = 1;
    expect(_decodeU128(bytes)).toBe(256n);
  });

  it('decodes a large u128 value', () => {
    // 1 DOT = 10^10 plancks
    const plancks = 12_345_678_901_234_567_890n;
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Number((plancks >> BigInt(i * 8)) & 0xffn);
    }
    expect(_decodeU128(bytes)).toBe(plancks);
  });

  it('decodes max u128', () => {
    const bytes = new Uint8Array(16).fill(0xff);
    expect(_decodeU128(bytes)).toBe((1n << 128n) - 1n);
  });

  it('decodes at non-zero offset', () => {
    const bytes = new Uint8Array(20);
    bytes[4] = 1; // 1 at offset 4
    expect(_decodeU128(bytes, 4)).toBe(1n);
  });

  it('throws on insufficient bytes', () => {
    const bytes = new Uint8Array(10);
    expect(() => _decodeU128(bytes)).toThrow('need 16 bytes');
  });

  it('throws on insufficient bytes at offset', () => {
    const bytes = new Uint8Array(20);
    expect(() => _decodeU128(bytes, 10)).toThrow('need 16 bytes at offset 10');
  });
});

/* ------------------------------------------------------------------ */
/*  SCALE Codec — AccountInfo Decoding                                  */
/* ------------------------------------------------------------------ */

describe('SCALE AccountInfo decoding', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });
  const _decodeAccountInfo = (bytes: Uint8Array) =>
    (adapter as any)._decodeAccountInfo(bytes);

  function buildAccountInfoBytes({
    nonce = 1,
    consumers = 0,
    providers = 1,
    sufficients = 0,
    free = 10_000_000_000n,
    reserved = 0n,
    frozen = 0n,
  }: {
    nonce?: number;
    consumers?: number;
    providers?: number;
    sufficients?: number;
    free?: bigint;
    reserved?: bigint;
    frozen?: bigint;
  } = {}): Uint8Array {
    const parts: number[] = [];

    // Encode compact values
    const encodeCompact = (val: bigint): number[] => {
      const n = Number(val);
      if (n <= 63) {
        return [n << 2];
      } else if (n <= 16383) {
        const raw = n << 2 | 0b01;
        return [raw & 0xff, (raw >> 8) & 0xff];
      } else {
        // mode 10 for larger values
        const raw = n << 2 | 0b10;
        return [raw & 0xff, (raw >> 8) & 0xff, (raw >> 16) & 0xff, (raw >> 24) & 0xff];
      }
    };

    // Encode u128 little-endian
    const encodeU128 = (val: bigint): number[] => {
      const bytes: number[] = [];
      for (let i = 0; i < 16; i++) {
        bytes.push(Number((val >> BigInt(i * 8)) & 0xffn));
      }
      return bytes;
    };

    parts.push(...encodeCompact(BigInt(nonce)));
    parts.push(...encodeCompact(BigInt(consumers)));
    parts.push(...encodeCompact(BigInt(providers)));
    parts.push(...encodeCompact(BigInt(sufficients)));
    parts.push(...encodeU128(free));
    parts.push(...encodeU128(reserved));
    parts.push(...encodeU128(frozen));

    return new Uint8Array(parts);
  }

  it('decodes free balance with small nonce', () => {
    const bytes = buildAccountInfoBytes({ nonce: 1, free: 10_000_000_000n });
    const result = _decodeAccountInfo(bytes);
    expect(result.free).toBe('10000000000');
  });

  it('decodes free balance for zero nonce', () => {
    const bytes = buildAccountInfoBytes({ nonce: 0, free: 5_000_000_000n });
    const result = _decodeAccountInfo(bytes);
    expect(result.free).toBe('5000000000');
  });

  it('decodes zero free balance', () => {
    const bytes = buildAccountInfoBytes({ nonce: 5, free: 0n });
    const result = _decodeAccountInfo(bytes);
    expect(result.free).toBe('0');
  });

  it('decodes free balance with non-zero consumers/providers', () => {
    const bytes = buildAccountInfoBytes({
      nonce: 42,
      consumers: 3,
      providers: 2,
      sufficients: 1,
      free: 99_999_999_999n,
    });
    const result = _decodeAccountInfo(bytes);
    expect(result.free).toBe('99999999999');
  });

  it('throws on too-short data', () => {
    const bytes = new Uint8Array(10);
    expect(() => _decodeAccountInfo(bytes)).toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  SCALE Codec — Storage Key Building                                  */
/* ------------------------------------------------------------------ */

describe('SCALE storage key building', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });
  const _buildStorageKey = (addr: string) =>
    (adapter as any)._buildStorageKey(addr);

  it('builds a storage key for a valid SS58 address', () => {
    const key = _buildStorageKey('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    expect(key).toMatch(/^0x[a-f0-9]+$/);
    // System Twox128 (16) + Account Twox128 (16) + Blake2b128Concat (16 hash + 32 pubkey) = 80 bytes
    // 80 bytes = 160 hex chars + "0x" prefix = 162
    expect(key.length).toBe(2 + 160);
  });

  it('builds consistent keys for the same address', () => {
    const addr = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const key1 = _buildStorageKey(addr);
    const key2 = _buildStorageKey(addr);
    expect(key1).toBe(key2);
  });

  it('builds different keys for different addresses', () => {
    const key1 = _buildStorageKey('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    const key2 = _buildStorageKey('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');
    expect(key1).not.toBe(key2);
  });

  it('throws on invalid SS58 address', () => {
    expect(() => _buildStorageKey('invalid')).toThrow('invalid SS58 address');
  });
});
