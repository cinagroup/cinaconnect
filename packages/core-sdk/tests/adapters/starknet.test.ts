/**
 * Starknet Chain Adapter tests.
 *
 * Tests cover:
 * - Address validation & normalization
 * - Felt252 encoding & calldata utilities
 * - Balance formatting & parsing
 * - Cairo array & struct encoding
 * - SNIP-12 message encoding
 * - ERC-20 calldata builders
 * - Transaction encoding (single & multi-call)
 * - StarknetChainAdapter core methods
 * - Account abstraction helpers
 * - Contract interaction helpers
 * - Chain presets & configuration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Constants
  Felt252_MAX,
  STRK_DECIMALS,
  ETH_DECIMALS,
  STRK_TOKEN_ADDRESS,
  ETH_TOKEN_ADDRESS,
  STARKNET_CHAINS,
  STARKNET_WALLETS,
  // Address utilities
  isValidStarknetAddress,
  normalizeStarknetAddress,
  isValidFelt,
  padHex,
  // Encoding utilities
  encodeFelt252,
  encodeCalldata,
  encodeStruct,
  encodeCairoArray,
  encodeByteArray,
  encodeSnip12Message,
  encodeMultiCall,
  // Transaction builders
  buildInvokeTx,
  buildMultiInvokeTx,
  // Balance utilities
  formatStarknetBalance,
  parseStarknetAmount,
  // ERC-20 calldata
  buildErc20BalanceCalldata,
  buildErc20TransferCalldata,
  buildErc20ApproveCalldata,
  // Types
  type StarknetCall,
  type StarknetInvokeTransaction,
  // Adapter class
  StarknetChainAdapter,
} from '../../src/adapters/starknet.js';

// ============================================================
// Constants
// ============================================================

describe('Starknet constants', () => {
  it('STRK_DECIMALS should be 18', () => {
    expect(STRK_DECIMALS).toBe(18);
  });

  it('ETH_DECIMALS should be 18', () => {
    expect(ETH_DECIMALS).toBe(18);
  });

  it('Felt252_MAX should be the Starknet prime field bound', () => {
    expect(Felt252_MAX).toBe((1n << 251n) + 17n * (1n << 192n) + 1n);
  });

  it('STRK_TOKEN_ADDRESS should be a valid hex address', () => {
    expect(STRK_TOKEN_ADDRESS).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(isValidStarknetAddress(STRK_TOKEN_ADDRESS)).toBe(true);
  });

  it('ETH_TOKEN_ADDRESS should be a valid hex address', () => {
    expect(ETH_TOKEN_ADDRESS).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(isValidStarknetAddress(ETH_TOKEN_ADDRESS)).toBe(true);
  });

  it('STARKNET_CHAINS should have mainnet and sepolia', () => {
    expect(STARKNET_CHAINS.length).toBeGreaterThanOrEqual(2);
    const ids = STARKNET_CHAINS.map((c) => c.id);
    expect(ids).toContain('starknet:mainnet');
    expect(ids).toContain('starknet:sepolia');
  });

  it('STARKNET_WALLETS should list known wallets', () => {
    expect(STARKNET_WALLETS.length).toBeGreaterThanOrEqual(3);
    const ids = STARKNET_WALLETS.map((w) => w.id);
    expect(ids).toContain('argent-x');
    expect(ids).toContain('braavos');
    expect(ids).toContain('okx');
  });
});

// ============================================================
// Address validation & normalization
// ============================================================

describe('isValidStarknetAddress', () => {
  it('returns true for valid full-length address', () => {
    expect(
      isValidStarknetAddress(
        '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      ),
    ).toBe(true);
  });

  it('returns true for valid short address', () => {
    expect(isValidStarknetAddress('0x123abc')).toBe(true);
  });

  it('returns true for address without 0x prefix stripped', () => {
    expect(isValidStarknetAddress('0xabc')).toBe(true);
  });

  it('returns false for non-string input', () => {
    expect(isValidStarknetAddress(null as unknown as string)).toBe(false);
    expect(isValidStarknetAddress(undefined as unknown as string)).toBe(false);
    expect(isValidStarknetAddress(123 as unknown as string)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidStarknetAddress('')).toBe(false);
  });

  it('returns false for string without 0x prefix', () => {
    expect(isValidStarknetAddress('04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d')).toBe(false);
  });

  it('returns false for non-hex characters', () => {
    expect(isValidStarknetAddress('0xGGGG')).toBe(false);
  });

  it('returns false for address exceeding 64 hex chars', () => {
    expect(
      isValidStarknetAddress('0x' + 'a'.repeat(66)),
    ).toBe(false);
  });
});

describe('normalizeStarknetAddress', () => {
  it('pads short address to 64 hex chars', () => {
    const result = normalizeStarknetAddress('0x123');
    expect(result).toBe('0x' + '0'.repeat(61) + '123');
    expect(result.length).toBe(66); // 0x + 64 chars
  });

  it('handles address without 0x prefix', () => {
    const result = normalizeStarknetAddress('abc');
    expect(result).toBe('0x' + '0'.repeat(61) + 'abc');
  });

  it('leaves full-length address unchanged', () => {
    const addr = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
    expect(normalizeStarknetAddress(addr)).toBe(addr);
  });

  it('throws on non-string input', () => {
    expect(() => normalizeStarknetAddress(null as unknown as string)).toThrow();
  });
});

// ============================================================
// Felt252 encoding
// ============================================================

describe('isValidFelt', () => {
  it('returns true for valid hex felt', () => {
    expect(isValidFelt('0x1234')).toBe(true);
  });

  it('returns true for decimal string within range', () => {
    expect(isValidFelt('12345')).toBe(true);
  });

  it('returns false for value exceeding Felt252_MAX', () => {
    // Value just above max
    const tooBig = (Felt252_MAX + 1n).toString();
    expect(isValidFelt(tooBig)).toBe(false);
  });

  it('returns false for negative values', () => {
    expect(isValidFelt('-1')).toBe(false);
  });

  it('returns false for non-hex string', () => {
    expect(isValidFelt('0xZZZZ')).toBe(false);
  });

  it('returns false for hex exceeding 64 chars', () => {
    expect(isValidFelt('0x' + 'f'.repeat(65))).toBe(false);
  });
});

describe('padHex', () => {
  it('pads short hex to 64 chars', () => {
    expect(padHex('0x123')).toBe('0x' + '0'.repeat(61) + '123');
  });

  it('handles hex without 0x prefix', () => {
    expect(padHex('abc')).toBe('0x' + '0'.repeat(61) + 'abc');
  });

  it('does not truncate already-full hex', () => {
    const full = '0x' + 'f'.repeat(64);
    expect(padHex(full)).toBe(full);
  });

  it('lowercases output', () => {
    expect(padHex('0xABCD')).toBe('0x' + '0'.repeat(60) + 'abcd');
  });
});

describe('encodeFelt252', () => {
  it('encodes a decimal number', () => {
    const result = encodeFelt252(42);
    expect(result).toBe('0x' + '0'.repeat(62) + '2a');
  });

  it('encodes a bigint', () => {
    const result = encodeFelt252(12345n);
    expect(result).toBe('0x' + '0'.repeat(60) + '3039');
  });

  it('encodes a hex string', () => {
    const result = encodeFelt252('0xdead');
    expect(result).toBe('0x' + '0'.repeat(60) + 'dead');
  });

  it('encodes a decimal string', () => {
    const result = encodeFelt252('100');
    expect(result).toBe('0x' + '0'.repeat(62) + '64');
  });

  it('throws on value exceeding Felt252_MAX', () => {
    expect(() => encodeFelt252(Felt252_MAX + 1n)).toThrow();
    expect(() => encodeFelt252((Felt252_MAX + 1n).toString())).toThrow();
  });

  it('throws on invalid hex string', () => {
    expect(() => encodeFelt252('0xGGGG')).toThrow();
  });

  it('encodes zero correctly', () => {
    const result = encodeFelt252(0);
    expect(result).toBe('0x' + '0'.repeat(64));
  });
});

// ============================================================
// Calldata encoding
// ============================================================

describe('encodeCalldata', () => {
  it('encodes an array of mixed felt252 values', () => {
    const result = encodeCalldata([1, '0xabc', 42n]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '1');
    expect(result[1]).toBe('0x' + '0'.repeat(61) + 'abc');
    expect(result[2]).toBe('0x' + '0'.repeat(62) + '2a');
  });

  it('returns empty array for empty input', () => {
    expect(encodeCalldata([])).toEqual([]);
  });
});

describe('encodeStruct', () => {
  it('encodes a struct as flat array', () => {
    const result = encodeStruct({ x: 1, y: 2 });
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '1');
    expect(result[1]).toBe('0x' + '0'.repeat(62) + '2');
  });

  it('handles mixed value types in struct', () => {
    const result = encodeStruct({
      low: '0x1234',
      high: 0n,
    });
    expect(result).toHaveLength(2);
  });
});

describe('encodeCairoArray', () => {
  it('prepends length to array', () => {
    const result = encodeCairoArray([1, 2, 3]);
    expect(result).toHaveLength(4); // length + 3 items
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '3');
  });

  it('handles empty array', () => {
    const result = encodeCairoArray([]);
    expect(result).toHaveLength(1); // just length
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '0');
  });
});

describe('encodeByteArray', () => {
  it('encodes empty data', () => {
    const result = encodeByteArray(new Uint8Array([]));
    // [num_chunks=0, pending_word=0, pending_word_size=0]
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '0');
  });

  it('encodes data less than 31 bytes', () => {
    const data = new TextEncoder().encode('hello');
    const result = encodeByteArray(data);
    // [num_chunks=0, pending_word, pending_word_size=5]
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '0');
    expect(result[result.length - 1]).toBe('0x' + '0'.repeat(62) + '5');
  });

  it('encodes data with multiple 31-byte chunks', () => {
    const data = new Uint8Array(62);
    data.fill(0xff);
    const result = encodeByteArray(data);
    // [num_chunks=2, chunk0, chunk1, pending_word=0, pending_word_size=0]
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '2');
    expect(result.length).toBe(5); // 1 + 2 + 1 + 1
  });
});

describe('encodeSnip12Message', () => {
  it('encodes a message with SNIP-12 prefix', () => {
    const result = encodeSnip12Message('hello');
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Should include prefix "StarkNet Message" + length + data
  });

  it('encodes an empty message', () => {
    const result = encodeSnip12Message('');
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Balance formatting
// ============================================================

describe('formatStarknetBalance', () => {
  it('formats a whole number STRK balance', () => {
    // 1 STRK = 10^18 wei
    const result = formatStarknetBalance('1000000000000000000');
    expect(result).toBe('1');
  });

  it('formats a fractional STRK balance', () => {
    // 1.5 STRK
    const result = formatStarknetBalance('1500000000000000000');
    expect(result).toBe('1.5');
  });

  it('formats zero balance', () => {
    expect(formatStarknetBalance(0)).toBe('0');
    expect(formatStarknetBalance('0')).toBe('0');
    expect(formatStarknetBalance(0n)).toBe('0');
  });

  it('formats a large balance with many decimals', () => {
    const result = formatStarknetBalance('12345678901234567890123456n' as unknown as string);
    expect(result).toContain('.');
  });

  it('trims trailing zeros', () => {
    const result = formatStarknetBalance('1000000000000000000');
    expect(result).toBe('1');
    expect(result).not.toContain('.');
  });

  it('supports custom decimals', () => {
    const result = formatStarknetBalance('123456789', 9);
    expect(result).toBe('0.123456789');
  });

  it('handles bigint input', () => {
    const result = formatStarknetBalance(999999999999999999n);
    expect(result).toBe('0.999999999999999999');
  });
});

describe('parseStarknetAmount', () => {
  it('parses a whole STRK amount', () => {
    const result = parseStarknetAmount('1');
    expect(result).toBe(1000000000000000000n);
  });

  it('parses a fractional STRK amount', () => {
    const result = parseStarknetAmount('1.5');
    expect(result).toBe(1500000000000000000n);
  });

  it('parses zero', () => {
    expect(parseStarknetAmount('0')).toBe(0n);
  });

  it('parses a large amount', () => {
    const result = parseStarknetAmount('1000000');
    expect(result).toBe(1000000n * 10n ** 18n);
  });

  it('supports custom decimals', () => {
    const result = parseStarknetAmount('1.234', 3);
    expect(result).toBe(1234n);
  });

  it('pads fractional part to correct decimals', () => {
    const result = parseStarknetAmount('1.5');
    expect(result).toBe(1500000000000000000n);
  });

  it('truncates excess decimal places', () => {
    const result = parseStarknetAmount('1.123456789012345678999');
    expect(result.toString().length).toBeLessThanOrEqual(20);
  });
});

// ============================================================
// ERC-20 calldata builders
// ============================================================

describe('buildErc20BalanceCalldata', () => {
  it('builds calldata for balanceOf', () => {
    const result = buildErc20BalanceCalldata(
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('normalizes short address', () => {
    const result = buildErc20BalanceCalldata('0x123');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('buildErc20TransferCalldata', () => {
  it('builds calldata for transfer with small amount', () => {
    const result = buildErc20TransferCalldata(
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      1000n,
    );
    // [recipient, amount_low, amount_high]
    expect(result).toHaveLength(3);
    expect(result[0]).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result[1]).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result[2]).toBe('0x' + '0'.repeat(64)); // high = 0 for small amount
  });

  it('builds calldata for transfer with large amount (u256 split)', () => {
    const largeAmount = (1n << 128n) + 1000n;
    const result = buildErc20TransferCalldata('0x123', largeAmount);
    expect(result).toHaveLength(3);
    expect(result[1]).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result[2]).toMatch(/^0x[0-9a-f]{64}$/);
    // high should be non-zero
    expect(result[2]).not.toBe('0x' + '0'.repeat(64));
  });

  it('accepts string amount', () => {
    const result = buildErc20TransferCalldata('0x123', '1000');
    expect(result).toHaveLength(3);
  });
});

describe('buildErc20ApproveCalldata', () => {
  it('builds calldata for approve', () => {
    const result = buildErc20ApproveCalldata(
      '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      5000n,
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('handles max approval amount', () => {
    const maxUint256 = (1n << 256n) - 1n;
    const result = buildErc20ApproveCalldata('0x123', maxUint256);
    expect(result).toHaveLength(3);
  });
});

// ============================================================
// Transaction encoding
// ============================================================

describe('encodeMultiCall', () => {
  it('encodes a single call', () => {
    const calls: StarknetCall[] = [
      {
        contractAddress: '0x123',
        entrypoint: 'transfer',
        calldata: ['0x456', '0x789'],
      },
    ];
    const result = encodeMultiCall(calls);
    expect(result.length).toBeGreaterThan(0);
    // First element should be the call count
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '1');
  });

  it('encodes multiple calls', () => {
    const calls: StarknetCall[] = [
      {
        contractAddress: '0x111',
        entrypoint: 'func_a',
        calldata: ['0x1'],
      },
      {
        contractAddress: '0x222',
        entrypoint: 'func_b',
        calldata: ['0x2', '0x3'],
      },
    ];
    const result = encodeMultiCall(calls);
    // call_count=2, then 2 call headers (4 felt each), then calldata_len, then calldata
    expect(result.length).toBeGreaterThan(8);
    expect(result[0]).toBe('0x' + '0'.repeat(62) + '2');
  });

  it('normalizes contract addresses in call', () => {
    const calls: StarknetCall[] = [
      {
        contractAddress: '0x1',
        entrypoint: '0x1',
        calldata: [],
      },
    ];
    const result = encodeMultiCall(calls);
    // First element after count should be normalized address
    expect(result[1]).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('encodes entrypoint as felt', () => {
    const calls: StarknetCall[] = [
      {
        contractAddress: '0x1',
        entrypoint: 123,
        calldata: [],
      },
    ];
    const result = encodeMultiCall(calls);
    expect(result.length).toBeGreaterThan(1);
  });

  it('handles empty calldata', () => {
    const calls: StarknetCall[] = [
      {
        contractAddress: '0x1',
        entrypoint: '0x1',
        calldata: [],
      },
    ];
    const result = encodeMultiCall(calls);
    // No calldata, so the entry should be minimal
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('buildInvokeTx', () => {
  it('builds a single-call invoke transaction', () => {
    const call: StarknetCall = {
      contractAddress: '0x123',
      entrypoint: 'transfer',
      calldata: ['0x456', '0x789'],
    };
    const tx = buildInvokeTx('0xsender', call);
    expect(tx.type).toBe('INVOKE');
    expect(tx.sender_address).toMatch(/^0x[0-9a-f]{64}$/);
    expect(tx.calldata).toBeInstanceOf(Array);
    expect(tx.version).toBe('0x1');
  });

  it('includes optional nonce', () => {
    const call: StarknetCall = {
      contractAddress: '0x1',
      entrypoint: '0x1',
      calldata: [],
    };
    const tx = buildInvokeTx('0x1', call, { nonce: '0x5' });
    expect(tx.nonce).toBe('0x5');
  });

  it('includes optional maxFee', () => {
    const call: StarknetCall = {
      contractAddress: '0x1',
      entrypoint: '0x1',
      calldata: [],
    };
    const tx = buildInvokeTx('0x1', call, { maxFee: '0x2386f26fc10000' });
    expect(tx.max_fee).toBe('0x2386f26fc10000');
  });

  it('includes custom version', () => {
    const call: StarknetCall = {
      contractAddress: '0x1',
      entrypoint: '0x1',
      calldata: [],
    };
    const tx = buildInvokeTx('0x1', call, { version: '0x3' });
    expect(tx.version).toBe('0x3');
  });

  it('includes signature', () => {
    const call: StarknetCall = {
      contractAddress: '0x1',
      entrypoint: '0x1',
      calldata: [],
    };
    const tx = buildInvokeTx('0x1', call, { signature: ['0xr', '0xs'] });
    expect(tx.signature).toEqual(['0xr', '0xs']);
  });
});

describe('buildMultiInvokeTx', () => {
  it('builds a multi-call invoke transaction', () => {
    const calls: StarknetCall[] = [
      {
        contractAddress: '0x111',
        entrypoint: 'func_a',
        calldata: ['0x1'],
      },
      {
        contractAddress: '0x222',
        entrypoint: 'func_b',
        calldata: ['0x2'],
      },
    ];
    const tx = buildMultiInvokeTx('0xsender', calls);
    expect(tx.type).toBe('INVOKE');
    expect(tx.sender_address).toMatch(/^0x[0-9a-f]{64}$/);
    expect(tx.calldata).toBeInstanceOf(Array);
  });

  it('accepts options', () => {
    const calls: StarknetCall[] = [
      {
        contractAddress: '0x1',
        entrypoint: '0x1',
        calldata: [],
      },
    ];
    const tx = buildMultiInvokeTx('0x1', calls, { nonce: '0x1', maxFee: '0x100' });
    expect(tx.nonce).toBe('0x1');
    expect(tx.max_fee).toBe('0x100');
  });

  it('handles empty calls array', () => {
    const tx = buildMultiInvokeTx('0x1', []);
    expect(tx.type).toBe('INVOKE');
    expect(tx.calldata).toBeInstanceOf(Array);
  });
});

// ============================================================
// StarknetChainAdapter core methods
// ============================================================

describe('StarknetChainAdapter basics', () => {
  it('has correct id', () => {
    const adapter = new StarknetChainAdapter();
    expect(adapter.id).toBe('starknet-adapter');
  });

  it('has correct name', () => {
    const adapter = new StarknetChainAdapter();
    expect(adapter.name).toBe('Starknet Chain Adapter');
  });

  it('starts with default chain', () => {
    const adapter = new StarknetChainAdapter();
    expect(adapter.getChainStringId()).toBe('starknet:mainnet');
  });

  it('returns null address when not connected', () => {
    const adapter = new StarknetChainAdapter();
    expect(adapter.getAddress()).toBeNull();
  });

  it('returns default RPC URL', () => {
    const adapter = new StarknetChainAdapter();
    expect(adapter.getRpcUrl()).toBe(STARKNET_CHAINS[0].rpcUrl);
  });
});

describe('StarknetChainAdapter.setConnector', () => {
  it('accepts a connector', () => {
    const adapter = new StarknetChainAdapter();
    const mockConnector = { getProvider: () => null } as any;
    expect(() => adapter.setConnector(mockConnector)).not.toThrow();
  });
});

describe('StarknetChainAdapter.registerChains', () => {
  it('registers custom chains', () => {
    const adapter = new StarknetChainAdapter();
    const customChains = [
      {
        id: 'starknet:custom',
        name: 'Custom',
        rpcUrl: 'https://custom.rpc.io',
        nativeCurrency: { name: 'STRK', symbol: 'STRK', decimals: 18 },
        explorerUrl: 'https://custom.explorer.io',
      },
    ];
    adapter.registerChains(customChains);
    expect(adapter.findChainById('starknet:custom')).toBeDefined();
    expect(adapter.getChainStringId()).toBe('starknet:custom');
    expect(adapter.getRpcUrl()).toBe('https://custom.rpc.io');
  });

  it('falls back to default chains when given empty array', () => {
    const adapter = new StarknetChainAdapter();
    adapter.registerChains([]);
    expect(adapter.findChainById('starknet:mainnet')).toBeDefined();
  });
});

describe('StarknetChainAdapter.findChain', () => {
  it('returns first chain for numeric ID', () => {
    const adapter = new StarknetChainAdapter();
    const chain = adapter.findChain(1);
    expect(chain).toBeDefined();
    expect(chain!.id).toBe('starknet:mainnet');
  });
});

describe('StarknetChainAdapter.findChainById', () => {
  it('finds mainnet by string ID', () => {
    const adapter = new StarknetChainAdapter();
    const chain = adapter.findChainById('starknet:mainnet');
    expect(chain).toBeDefined();
    expect(chain!.name).toBe('Starknet Mainnet');
  });

  it('finds sepolia by string ID', () => {
    const adapter = new StarknetChainAdapter();
    const chain = adapter.findChainById('starknet:sepolia');
    expect(chain).toBeDefined();
    expect(chain!.name).toBe('Starknet Sepolia');
  });

  it('returns undefined for unknown ID', () => {
    const adapter = new StarknetChainAdapter();
    expect(adapter.findChainById('starknet:unknown')).toBeUndefined();
  });
});

describe('StarknetChainAdapter.setProvider', () => {
  it('accepts a provider', () => {
    const adapter = new StarknetChainAdapter();
    const mockProvider = {
      isConnected: false,
      enable: async () => [],
      disconnect: async () => {},
      request: async () => null,
    };
    expect(() => adapter.setProvider(mockProvider)).not.toThrow();
    expect(adapter.getProvider()).toBe(mockProvider);
  });
});

describe('StarknetChainAdapter.getAccounts', () => {
  it('throws when not connected', async () => {
    const adapter = new StarknetChainAdapter();
    await expect(adapter.getAccounts()).rejects.toThrow('Not connected');
  });
});

describe('StarknetChainAdapter.disconnect', () => {
  it('clears state', async () => {
    const adapter = new StarknetChainAdapter();
    const mockProvider = {
      isConnected: true,
      enable: async () => ['0x123'],
      disconnect: async () => {},
      request: async () => null,
    };
    await adapter.connect();
    await adapter.disconnect();
    expect(adapter.getAddress()).toBeNull();
  });

  it('handles provider without disconnect method', async () => {
    const adapter = new StarknetChainAdapter();
    const mockProvider = {
      isConnected: true,
      enable: async () => ['0x123'],
      request: async () => null,
    } as any;
    await adapter.connect();
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });
});

describe('StarknetChainAdapter.switchChain', () => {
  it('switches chain by numeric ID', async () => {
    const adapter = new StarknetChainAdapter();
    await expect(adapter.switchChain(1)).resolves.not.toThrow();
  });

  it('switches chain by string ID', async () => {
    const adapter = new StarknetChainAdapter();
    await expect(adapter.switchChainById('starknet:sepolia')).resolves.not.toThrow();
    expect(adapter.getChainStringId()).toBe('starknet:sepolia');
    expect(adapter.getRpcUrl()).toBe(STARKNET_CHAINS[1].rpcUrl);
  });

  it('throws on unknown chain ID', async () => {
    const adapter = new StarknetChainAdapter();
    await expect(adapter.switchChainById('unknown')).rejects.toThrow();
  });
});

describe('StarknetChainAdapter.setRpcUrl', () => {
  it('sets custom RPC URL', () => {
    const adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://my.rpc.io');
    expect(adapter.getRpcUrl()).toBe('https://my.rpc.io');
  });
});

// ============================================================
// StarknetChainAdapter mocked RPC methods
// ============================================================

// Mock fetch globally
const mockFetch = vi.fn();

describe('StarknetChainAdapter.getBalance', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('throws on invalid address', async () => {
    await expect(adapter.getBalance('not-an-address')).rejects.toThrow();
  });

  it('returns balance from RPC', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: '0x123456789abcdef',
      }),
    });

    const result = await adapter.getBalance(
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    );
    expect(result).toBe('0x123456789abcdef');
    expect(mockFetch).toHaveBeenCalled();
  });

  it('returns 0x0 on RPC failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await adapter.getBalance(
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    );
    expect(result).toBe('0x0');
  });

  it('returns formatted balance', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: '0xde0b6b3a7640000', // 1 STRK
      }),
    });
    const result = await adapter.getBalanceFormatted(
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    );
    expect(result).toBe('1');
  });
});

describe('StarknetChainAdapter.getChainId', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns chain ID from RPC', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: '0x534e5f4d41494e', // SN_MAIN
      }),
    });
    const result = await adapter.getChainId();
    expect(result).toBe('0x534e5f4d41494e');
  });
});

describe('StarknetChainAdapter.getBlockNumber', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns block number from RPC', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { block_number: 123456 },
      }),
    });
    const result = await adapter.getBlockNumber();
    expect(result).toBe(123456);
  });
});

describe('StarknetChainAdapter.getTokenBalance', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('throws on invalid token address', async () => {
    await expect(
      adapter.getTokenBalance('invalid', '0x123'),
    ).rejects.toThrow();
  });

  it('throws on invalid user address', async () => {
    await expect(
      adapter.getTokenBalance('0x123', 'invalid'),
    ).rejects.toThrow();
  });

  it('returns u256 balance from contract call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { result: ['0x1234', '0x0'] },
      }),
    });
    const result = await adapter.getTokenBalance(
      STRK_TOKEN_ADDRESS,
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    );
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('returns 0x0 on RPC failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await adapter.getTokenBalance(
      ETH_TOKEN_ADDRESS,
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    );
    expect(result).toBe('0x0');
  });
});

describe('StarknetChainAdapter.callContract', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('throws on invalid contract address', async () => {
    await expect(adapter.callContract('invalid', 'func')).rejects.toThrow();
  });

  it('returns result array from RPC', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { result: ['0x1', '0x2', '0x3'] },
      }),
    });
    const result = await adapter.callContract(
      '0x123',
      'get_value',
      ['0x456'],
    );
    expect(result).toEqual(['0x1', '0x2', '0x3']);
  });
});

describe('StarknetChainAdapter.getTransactionStatus', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns transaction status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          transaction_hash: '0xabc',
          status: 'ACCEPTED_ON_L2',
          finality_status: 'ACCEPTED_ON_L2',
          execution_status: 'SUCCEEDED',
          block_hash: '0xdef',
          block_number: 100,
        },
      }),
    });
    const result = await adapter.getTransactionStatus('0xabc');
    expect(result.finality_status).toBe('ACCEPTED_ON_L2');
    expect(result.execution_status).toBe('SUCCEEDED');
  });
});

describe('StarknetChainAdapter.getTransaction', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns transaction data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          transaction_hash: '0xabc',
          type: 'INVOKE',
          sender_address: '0x123',
          calldata: ['0x1'],
        },
      }),
    });
    const result = await adapter.getTransaction('0xabc') as { transaction_hash: string };
    expect(result.transaction_hash).toBe('0xabc');
  });
});

describe('StarknetChainAdapter.getTransactionReceipt', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns transaction receipt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          transaction_hash: '0xabc',
          finality_status: 'ACCEPTED_ON_L2',
          execution_status: 'SUCCEEDED',
          events: [],
        },
      }),
    });
    const result = await adapter.getTransactionReceipt('0xabc') as { finality_status: string };
    expect(result.finality_status).toBe('ACCEPTED_ON_L2');
  });
});

describe('StarknetChainAdapter.waitForTransaction', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('resolves when transaction is accepted', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          transaction_hash: '0xabc',
          finality_status: 'ACCEPTED_ON_L2',
          execution_status: 'SUCCEEDED',
        },
      }),
    });
    const result = await adapter.waitForTransaction('0xabc', 3, 10);
    expect(result.finality_status).toBe('ACCEPTED_ON_L2');
  });

  it('resolves when transaction is rejected', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          transaction_hash: '0xabc',
          status: 'REJECTED',
        },
      }),
    });
    const result = await adapter.waitForTransaction('0xabc', 3, 10);
    expect(result.status).toBe('REJECTED');
  });

  it('throws on timeout', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          transaction_hash: '0xabc',
          finality_status: 'RECEIVED',
          status: 'RECEIVED',
        },
      }),
    });
    await expect(adapter.waitForTransaction('0xabc', 2, 10)).rejects.toThrow();
  });
});

describe('StarknetChainAdapter.estimateGas', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns fee estimate', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          gas_consumed: '0x1234',
          gas_price: '0x5678',
          overall_fee: '0x100000',
          unit: 'FRI',
        },
      }),
    });
    const tx: StarknetInvokeTransaction = {
      type: 'INVOKE',
      sender_address: '0x123',
      calldata: ['0x1'],
    };
    const result = await adapter.estimateGas(tx);
    expect(result).toBe('0x100000');
  });

  it('returns default estimate on failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const tx: StarknetInvokeTransaction = {
      type: 'INVOKE',
      sender_address: '0x123',
      calldata: ['0x1'],
    };
    const result = await adapter.estimateGas(tx);
    expect(result).toBe('0x2386f26fc10000'); // default
  });
});

describe('StarknetChainAdapter.getStorageAt', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns storage value', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: '0xabc',
      }),
    });
    const result = await adapter.getStorageAt('0x123', '0x0');
    expect(result).toBe('0xabc');
  });
});

// ============================================================
// StarknetChainAdapter mocked wallet methods
// ============================================================

describe('StarknetChainAdapter.wallet operations', () => {
  let adapter: StarknetChainAdapter;
  let mockProvider: any;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');

    mockProvider = {
      isConnected: false,
      enable: vi.fn().mockResolvedValue([
        '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      ]),
      disconnect: vi.fn().mockResolvedValue(undefined),
      request: vi.fn().mockResolvedValue(null),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('connects via enable()', async () => {
    await adapter.connect();
    expect(adapter.getAddress()).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('gets accounts after connect', async () => {
    await adapter.connect();
    const accounts = await adapter.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('signs message', async () => {
    mockProvider.request.mockResolvedValueOnce({ r: '0xr', s: '0xs' });
    await adapter.connect();
    const result = await adapter.signMessage('hello world');
    expect(result).toContain('0xr');
    expect(result).toContain('0xs');
  });

  it('signs transaction', async () => {
    mockProvider.request.mockResolvedValueOnce(['0xr', '0xs']);
    await adapter.connect();
    const result = await adapter.signTransaction({
      type: 'INVOKE',
      sender_address: '0x123',
      calldata: ['0x1'],
    });
    expect(result).toEqual(['0xr', '0xs']);
  });

  it('sends transaction via wallet_addInvokeTransaction', async () => {
    mockProvider.request.mockResolvedValueOnce({
      transaction_hash: '0xtxhash',
    });
    await adapter.connect();
    const result = await adapter.sendTransaction({
      type: 'INVOKE',
      sender_address: '0x123',
      calldata: ['0x1'],
    });
    expect(result).toBe('0xtxhash');
  });

  it('sends transaction with pre-built signature via RPC', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { transaction_hash: '0xtxhash2' },
      }),
    });
    await adapter.connect();
    const result = await adapter.sendTransaction({
      type: 'INVOKE',
      sender_address: '0x123',
      calldata: ['0x1'],
      signature: ['0xr', '0xs'],
    });
    expect(result).toBe('0xtxhash2');
  });

  it('sends STRK transfer', async () => {
    mockProvider.request.mockResolvedValueOnce({
      transaction_hash: '0xtransfer',
    });
    await adapter.connect();
    const result = await adapter.transferStrk('0x123', 1000n);
    expect(result).toBe('0xtransfer');
  });

  it('sends ETH transfer', async () => {
    mockProvider.request.mockResolvedValueOnce({
      transaction_hash: '0xethtransfer',
    });
    await adapter.connect();
    const result = await adapter.transferEth('0x123', 500n);
    expect(result).toBe('0xethtransfer');
  });

  it('executes contract call', async () => {
    mockProvider.request.mockResolvedValueOnce({
      transaction_hash: '0xcontractcall',
    });
    await adapter.connect();
    const result = await adapter.executeContractCall(
      '0x123',
      'set_value',
      ['0x42'],
    );
    expect(result).toBe('0xcontractcall');
  });

  it('executes multi-call', async () => {
    mockProvider.request.mockResolvedValueOnce({
      transaction_hash: '0xmulticall',
    });
    await adapter.connect();
    const result = await adapter.executeMultiCall([
      {
        contractAddress: '0x111',
        entrypoint: 'func_a',
        calldata: ['0x1'],
      },
      {
        contractAddress: '0x222',
        entrypoint: 'func_b',
        calldata: ['0x2'],
      },
    ]);
    expect(result).toBe('0xmulticall');
  });
});

// ============================================================
// Account Abstraction helpers
// ============================================================

describe('StarknetChainAdapter.isDeployedAccount', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns true for deployed account', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: '0xclasshash',
      }),
    });
    const result = await adapter.isDeployedAccount('0x123');
    expect(result).toBe(true);
  });

  it('returns false for undeployed address', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Contract not found'));
    const result = await adapter.isDeployedAccount('0x123');
    expect(result).toBe(false);
  });
});

describe('StarknetChainAdapter.getAccountClassHash', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns class hash for deployed account', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: '0xclasshash',
      }),
    });
    const result = await adapter.getAccountClassHash('0x123');
    expect(result).toBe('0xclasshash');
  });

  it('returns null for undeployed address', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Not found'));
    const result = await adapter.getAccountClassHash('0x123');
    expect(result).toBeNull();
  });
});

describe('StarknetChainAdapter.getNonce', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns nonce for given address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: '0x5',
      }),
    });
    const result = await adapter.getNonce('0x123');
    expect(result).toBe('0x5');
  });

  it('throws when no address provided and not connected', async () => {
    await expect(adapter.getNonce()).rejects.toThrow('No address provided');
  });
});

// ============================================================
// Request method (EIP-1193 style)
// ============================================================

describe('StarknetChainAdapter.request', () => {
  let adapter: StarknetChainAdapter;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');

    const mockProvider = {
      isConnected: false,
      enable: vi.fn().mockResolvedValue(['0x123']),
      disconnect: vi.fn(),
      request: vi.fn().mockResolvedValue(null),
    };
    adapter.setProvider(mockProvider);
    (adapter as any)._accounts = ['0x0000000000000000000000000000000000000000000000000000000000000123'];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('handles starknet_getBalance', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x100' }),
    });
    const result = await adapter.request({ method: 'starknet_getBalance', params: ['0x123'] });
    expect(result).toBe('0x100');
  });

  it('handles starknet_chainId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x534e5f4d41494e' }),
    });
    const result = await adapter.request({ method: 'starknet_chainId' });
    expect(result).toBe('0x534e5f4d41494e');
  });

  it('handles starknet_getTransactionStatus', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { transaction_hash: '0xabc', status: 'ACCEPTED_ON_L2' },
      }),
    });
    const result = await adapter.request({
      method: 'starknet_getTransactionStatus',
      params: ['0xabc'],
    });
    expect((result as any).status).toBe('ACCEPTED_ON_L2');
  });

  it('throws on unsupported method', async () => {
    await expect(adapter.request({ method: 'starknet_unknown' })).rejects.toThrow();
  });
});

// ============================================================
// Edge cases & error handling
// ============================================================

describe('StarknetChainAdapter error handling', () => {
  let adapter: StarknetChainAdapter;
  let mockProvider: any;

  beforeEach(() => {
    global.fetch = mockFetch;
    adapter = new StarknetChainAdapter();
    adapter.setRpcUrl('https://mock.rpc.io');
    mockProvider = {
      isConnected: false,
      enable: vi.fn().mockResolvedValue(['0x123']),
      disconnect: vi.fn(),
      request: vi.fn().mockResolvedValue(null),
    };
    adapter.setProvider(mockProvider);
    (adapter as any)._accounts = ['0x123'];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sendTransaction throws when no provider', async () => {
    const adapter2 = new StarknetChainAdapter();
    await expect(
      adapter2.sendTransaction({ type: 'INVOKE', sender_address: '0x1', calldata: [] }),
    ).rejects.toThrow('No provider connected');
  });

  it('signMessage throws when no provider', async () => {
    const adapter2 = new StarknetChainAdapter();
    await expect(adapter2.signMessage('hello')).rejects.toThrow('No provider connected');
  });

  it('signTransaction throws when no provider', async () => {
    const adapter2 = new StarknetChainAdapter();
    await expect(adapter2.signTransaction({})).rejects.toThrow('No provider connected');
  });

  it('transferStrk throws when no connected account', async () => {
    const adapter2 = new StarknetChainAdapter();
    await expect(adapter2.transferStrk('0x123', 1000n)).rejects.toThrow('No connected account');
  });

  it('transferStrk throws on invalid recipient', async () => {
    const mockProvider = {
      isConnected: false,
      enable: vi.fn().mockResolvedValue(['0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d']),
      disconnect: vi.fn(),
      request: vi.fn().mockResolvedValue(null),
    };
    const adapter2 = new StarknetChainAdapter();
    adapter2.setProvider(mockProvider);
    await adapter2.connect();
    await expect(adapter2.transferStrk('invalid', 1000n)).rejects.toThrow('Invalid recipient');
  });

  it('executeMultiCall throws on empty calls', async () => {
    await expect(adapter.executeMultiCall([])).rejects.toThrow('No calls provided');
  });

  it('executeMultiCall throws when no connected account', async () => {
    const adapter2 = new StarknetChainAdapter();
    await expect(
      adapter2.executeMultiCall([
        { contractAddress: '0x1', entrypoint: '0x1', calldata: [] },
      ]),
    ).rejects.toThrow('No connected account');
  });

  it('executeContractCall throws when no connected account', async () => {
    const adapter2 = new StarknetChainAdapter();
    await expect(adapter2.executeContractCall('0x1', 'func')).rejects.toThrow('No connected account');
  });
});

// ============================================================
// Integration: createAdapter factory
// ============================================================

describe('createAdapter factory (starknet)', () => {
  it('creates StarknetChainAdapter via factory', async () => {
    const { createAdapter } = await import('../../src/index.js');
    const adapter = await createAdapter({ type: 'starknet' });
    expect(adapter).toBeDefined();
    expect((adapter as any).id).toBe('starknet-adapter');
  });

  it('registers custom chains via factory', async () => {
    const { createAdapter } = await import('../../src/index.js');
    const adapter = await createAdapter({
      type: 'starknet',
      chains: [
        {
          id: 'starknet:custom',
          name: 'Custom',
          rpcUrl: 'https://custom.rpc',
          nativeCurrency: { name: 'STRK', symbol: 'STRK', decimals: 18 },
        },
      ],
    });
    expect((adapter as any).findChainById('starknet:custom')).toBeDefined();
  });
});
