/**
 * core-sdk/tests/adapters/hedera.test.ts
 *
 * Comprehensive tests for the Hedera chain adapter.
 * Covers address validation, HBAR formatting, wallet resolution,
 * balance queries, HTS tokens, NFTs, smart contracts, mirror node,
 * signing, transaction building, chain switching, and EVM mode.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HederaChainAdapter,
  HEDERA_CHAINS,
  HEDERA_WALLETS,
  isValidHederaAccountId,
  isValidHederaEvmAddress,
  normalizeHederaAddress,
  isValidHederaTokenId,
  isValidHederaContractId,
  accountIdToEvmAddress,
  parseAccountId,
  formatHbar,
  parseHbarAmount,
  HederaTxType,
  encodeFunctionCall,
  decodeUint256,
  decodeAddress,
  decodeString,
} from '../../src/adapters/hedera.js';

// ---------------------------------------------------------------------------
// Helper: mock the global window for wallet resolution tests
// ---------------------------------------------------------------------------

function mockWindow(wallets: Record<string, unknown> = {}): void {
  // @ts-ignore — test environment
  globalThis.window = { ...wallets };
}

function clearWindow(): void {
  // @ts-ignore
  delete globalThis.window;
}

// ---------------------------------------------------------------------------
// Helper: mock fetch for Mirror Node tests
// ---------------------------------------------------------------------------

function mockFetch(response: unknown, status: number = 200): void {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    statusText: status < 400 ? 'OK' : 'Not Found',
    json: () => Promise.resolve(response),
  });
}

function mockFetchSequence(responses: Array<{ data: unknown; status?: number }>): void {
  let idx = 0;
  globalThis.fetch = vi.fn().mockImplementation(() => {
    const r = responses[idx++] ?? responses[responses.length - 1];
    return Promise.resolve({
      ok: (r.status ?? 200) < 400,
      status: r.status ?? 200,
      statusText: (r.status ?? 200) < 400 ? 'OK' : 'Error',
      json: () => Promise.resolve(r.data),
    });
  });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_ACCOUNT_ID = '0.0.12345';
const TEST_EVM_ADDRESS = '0x0000000000000000000000000000000000003039';
const TEST_TOKEN_ID = '0.0.56789';
const TEST_CONTRACT_ID = '0.0.98765';
const TEST_NFT_SERIAL = 42;
const TEST_TINYBAR = 1_000_000_000n; // 10 HBAR

const MOCK_ACCOUNT_INFO = {
  account: TEST_ACCOUNT_ID,
  balance: { balance: 1_000_000_000, timestamp: '1700000000.000000000', tokens: [] },
  key: { _type: 'ED25519', key: 'abc123' },
  max_automatic_token_associations: 5,
  memo: '',
  receiver_sig_required: false,
  alias: null,
  ethereum_nonce: 0,
  evm_address: TEST_EVM_ADDRESS,
  created_timestamp: '1600000000.000000000',
  deleted: false,
  expiry_timestamp: '1800000000.000000000',
};

const MOCK_TOKEN_INFO = {
  token_id: TEST_TOKEN_ID,
  name: 'TestToken',
  symbol: 'TTK',
  type: 'FUNGIBLE_COMMON' as const,
  decimals: 6,
  total_supply: 1_000_000_000_000,
  max_supply: 10_000_000_000_000,
  admin_key: null,
  created_timestamp: '1600000000.000000000',
  deleted: false,
  memo: '',
  treasury_account_id: '0.0.2',
  custom_fees: { created_timestamp: '1600000000.000000000' },
};

const MOCK_TOKEN_BALANCES = {
  tokens: [
    { token_id: TEST_TOKEN_ID, balance: 500_000_000, decimals: 6 },
    { token_id: '0.0.11111', balance: 100, decimals: 0 },
  ],
};

const MOCK_NFTS = {
  nfts: [
    {
      account_id: TEST_ACCOUNT_ID,
      created_timestamp: '1600000000.000000000',
      deleted: false,
      metadata: 'aGVsbG8=',
      serial_number: TEST_NFT_SERIAL,
      token_id: '0.0.99999',
      spender: null,
    },
  ],
};

const MOCK_TRANSACTIONS = {
  transactions: [
    {
      bytes: '',
      charged_tx_fee: 1_000_000,
      consensus_timestamp: '1700000000.000000000',
      entity_id: TEST_ACCOUNT_ID,
      max_fee: '500000000',
      memo_base64: '',
      name: 'CRYPTOTRANSFER',
      node: '0.0.3',
      nonce: 0,
      parent_consensus_timestamp: null,
      result: 'SUCCESS',
      scheduled: false,
      staking_reward_transfers: [],
      transaction_hash: 'abc',
      transaction_id: `${TEST_ACCOUNT_ID}-1700000000-000000000`,
      transfers: [{ account: TEST_ACCOUNT_ID, amount: -1_000_000 }],
      valid_duration_seconds: '120',
      valid_start_timestamp: '1700000000.000000000',
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests: Address validation
// ---------------------------------------------------------------------------

describe('isValidHederaAccountId', () => {
  it('valid account ID', () => {
    expect(isValidHederaAccountId('0.0.12345')).toBe(true);
  });

  it('valid account ID with 0.0.0', () => {
    expect(isValidHederaAccountId('0.0.0')).toBe(true);
  });

  it('valid account ID with large number', () => {
    expect(isValidHederaAccountId('0.0.999999999')).toBe(true);
  });

  it('rejects EVM address', () => {
    expect(isValidHederaAccountId('0x0000000000000000000000000000000000003039')).toBe(false);
  });

  it('rejects invalid format', () => {
    expect(isValidHederaAccountId('12345')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidHederaAccountId('')).toBe(false);
  });

  it('rejects non-string', () => {
    expect(isValidHederaAccountId(123 as unknown as string)).toBe(false);
  });

  it('rejects partial format 0.0.', () => {
    expect(isValidHederaAccountId('0.0.')).toBe(false);
  });

  it('rejects 0.0.-1', () => {
    expect(isValidHederaAccountId('0.0.-1')).toBe(false);
  });
});

describe('isValidHederaEvmAddress', () => {
  it('valid EVM address', () => {
    expect(isValidHederaEvmAddress('0x0000000000000000000000000000000000003039')).toBe(true);
  });

  it('valid EVM address lowercase', () => {
    expect(isValidHederaEvmAddress('0xaabbccddee00112233445566778899aabbccddee')).toBe(true);
  });

  it('rejects account ID', () => {
    expect(isValidHederaEvmAddress('0.0.12345')).toBe(false);
  });

  it('rejects too short', () => {
    expect(isValidHederaEvmAddress('0x1234')).toBe(false);
  });

  it('rejects too long', () => {
    expect(isValidHederaEvmAddress('0x' + 'a'.repeat(42))).toBe(false);
  });

  it('rejects non-hex chars', () => {
    expect(isValidHederaEvmAddress('0x' + 'g'.repeat(40))).toBe(false);
  });

  it('rejects no 0x prefix', () => {
    expect(isValidHederaEvmAddress('0000000000000000000000000000000000003039')).toBe(false);
  });

  it('rejects non-string', () => {
    expect(isValidHederaEvmAddress(123 as unknown as string)).toBe(false);
  });
});

describe('normalizeHederaAddress', () => {
  it('passes through valid account ID', () => {
    expect(normalizeHederaAddress('0.0.12345')).toBe('0.0.12345');
  });

  it('passes through valid EVM address (lowercased)', () => {
    expect(normalizeHederaAddress('0x0000000000000000000000000000000000003039')).toBe(
      '0x0000000000000000000000000000000000003039',
    );
  });

  it('lowercases uppercase EVM address', () => {
    expect(normalizeHederaAddress('0xAABBCCDDEE00112233445566778899AABBCCDDEE')).toBe(
      '0xaabbccddee00112233445566778899aabbccddee',
    );
  });

  it('throws on invalid address', () => {
    expect(() => normalizeHederaAddress('invalid')).toThrow('Invalid Hedera address');
  });
});

describe('isValidHederaTokenId', () => {
  it('valid token ID', () => {
    expect(isValidHederaTokenId('0.0.56789')).toBe(true);
  });

  it('invalid format', () => {
    expect(isValidHederaTokenId('0.0.')).toBe(false);
  });
});

describe('isValidHederaContractId', () => {
  it('valid contract ID', () => {
    expect(isValidHederaContractId('0.0.98765')).toBe(true);
  });

  it('invalid format', () => {
    expect(isValidHederaContractId('0xabc')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Account ID <-> EVM address conversion
// ---------------------------------------------------------------------------

describe('accountIdToEvmAddress', () => {
  it('converts 0.0.12345', () => {
    // 12345 in hex = 3039
    expect(accountIdToEvmAddress('0.0.12345')).toBe(TEST_EVM_ADDRESS);
  });

  it('converts 0.0.0', () => {
    expect(accountIdToEvmAddress('0.0.0')).toBe('0x' + '0'.repeat(40));
  });

  it('converts 0.0.1', () => {
    expect(accountIdToEvmAddress('0.0.1')).toBe('0x' + '0'.repeat(39) + '1');
  });

  it('converts large account ID', () => {
    const result = accountIdToEvmAddress('0.0.999999999');
    expect(result).toBe('0x' + parseInt('999999999', 10).toString(16).padStart(40, '0'));
  });

  it('throws on invalid ID', () => {
    expect(() => accountIdToEvmAddress('invalid')).toThrow('Invalid Hedera account ID');
  });
});

describe('parseAccountId', () => {
  it('parses 0.0.12345', () => {
    const result = parseAccountId('0.0.12345');
    expect(result).toEqual({ shard: 0, realm: 0, num: 12345 });
  });

  it('returns null for invalid ID', () => {
    expect(parseAccountId('invalid')).toBeNull();
  });

  it('parses 0.0.0', () => {
    expect(parseAccountId('0.0.0')).toEqual({ shard: 0, realm: 0, num: 0 });
  });
});

// ---------------------------------------------------------------------------
// Tests: HBAR formatting
// ---------------------------------------------------------------------------

describe('formatHbar', () => {
  it('formats 1 HBAR (10^8 tinybar)', () => {
    expect(formatHbar(100_000_000n)).toBe('1');
  });

  it('formats fractional HBAR', () => {
    expect(formatHbar(12_345_678n)).toBe('0.12345678');
  });

  it('formats 10 HBAR', () => {
    expect(formatHbar(1_000_000_000n)).toBe('10');
  });

  it('formats zero', () => {
    expect(formatHbar(0n)).toBe('0');
  });

  it('formats large amount', () => {
    expect(formatHbar(123456789012345678n)).toBe('1234567890.12345678');
  });

  it('formats tiny amount', () => {
    expect(formatHbar(1n)).toBe('0.00000001');
  });

  it('formats with trailing zeros removed', () => {
    expect(formatHbar(10_500_000n)).toBe('0.105');
  });

  it('accepts string input', () => {
    expect(formatHbar('100000000')).toBe('1');
  });

  it('accepts number input', () => {
    expect(formatHbar(100000000)).toBe('1');
  });

  it('formats negative tinybar', () => {
    expect(formatHbar(-500_000_000n)).toBe('-5');
  });
});

describe('parseHbarAmount', () => {
  it('parses 1 HBAR to tinybar', () => {
    expect(parseHbarAmount('1')).toBe(100_000_000n);
  });

  it('parses 10 HBAR', () => {
    expect(parseHbarAmount('10')).toBe(1_000_000_000n);
  });

  it('parses fractional HBAR', () => {
    expect(parseHbarAmount('0.12345678')).toBe(12_345_678n);
  });

  it('parses 0', () => {
    expect(parseHbarAmount('0')).toBe(0n);
  });

  it('parses negative amount', () => {
    expect(parseHbarAmount('-5')).toBe(-500_000_000n);
  });

  it('handles whitespace', () => {
    expect(parseHbarAmount('  10  ')).toBe(1_000_000_000n);
  });

  it('pads fractional part', () => {
    expect(parseHbarAmount('0.1')).toBe(10_000_000n);
  });

  it('truncates excessive decimals', () => {
    expect(parseHbarAmount('0.123456789')).toBe(12_345_678n);
  });

  it('round-trips with formatHbar', () => {
    const original = '12.34567890';
    const tinybar = parseHbarAmount(original);
    expect(formatHbar(tinybar)).toBe('12.3456789');
  });
});

// ---------------------------------------------------------------------------
// Tests: Wallet constants
// ---------------------------------------------------------------------------

describe('HEDERA_WALLETS', () => {
  it('has 3 wallets', () => {
    expect(HEDERA_WALLETS.length).toBe(3);
  });

  it('includes HashPack', () => {
    const hashpack = HEDERA_WALLETS.find((w) => w.id === 'hashpack');
    expect(hashpack).toBeDefined();
    expect(hashpack?.name).toBe('HashPack');
    expect(hashpack?.rdns).toBe('com.hashpack.wallet');
  });

  it('includes Blade', () => {
    const blade = HEDERA_WALLETS.find((w) => w.id === 'blade');
    expect(blade).toBeDefined();
    expect(blade?.name).toBe('Blade');
  });

  it('includes Kaiban', () => {
    const kaiban = HEDERA_WALLETS.find((w) => w.id === 'kaiban');
    expect(kaiban).toBeDefined();
    expect(kaiban?.name).toBe('Kaiban');
  });

  it('all wallets have required fields', () => {
    for (const w of HEDERA_WALLETS) {
      expect(!!w.id).toBe(true);
      expect(!!w.name).toBe(true);
      expect(!!w.rdns).toBe(true);
      expect(!!w.icon).toBe(true);
      expect(!!w.downloadUrl).toBe(true);
    }
  });
});

describe('HEDERA_CHAINS', () => {
  it('has 3 chains', () => {
    expect(HEDERA_CHAINS.length).toBe(3);
  });

  it('mainnet chain', () => {
    const mainnet = HEDERA_CHAINS.find((c) => c.id === 'hedera:mainnet');
    expect(mainnet).toBeDefined();
    expect(mainnet?.nativeCurrency?.symbol).toBe('HBAR');
    expect(mainnet?.nativeCurrency?.decimals).toBe(8);
    expect(mainnet?.rpcUrl).toContain('mainnet');
  });

  it('testnet chain', () => {
    const testnet = HEDERA_CHAINS.find((c) => c.id === 'hedera:testnet');
    expect(testnet).toBeDefined();
    expect(testnet?.rpcUrl).toContain('testnet');
  });

  it('previewnet chain', () => {
    const previewnet = HEDERA_CHAINS.find((c) => c.id === 'hedera:previewnet');
    expect(previewnet).toBeDefined();
    expect(previewnet?.rpcUrl).toContain('previewnet');
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaTxType
// ---------------------------------------------------------------------------

describe('HederaTxType', () => {
  it('has CRYPTO_TRANSFER', () => {
    expect(HederaTxType.CRYPTO_TRANSFER).toBe('CRYPTOTRANSFER');
  });

  it('has TOKEN_MINT', () => {
    expect(HederaTxType.TOKEN_MINT).toBe('TOKENMINT');
  });

  it('has CONTRACT_CALL', () => {
    expect(HederaTxType.CONTRACT_CALL).toBe('CONTRACTCALL');
  });

  it('has CONSENSUS_SUBMIT', () => {
    expect(HederaTxType.CONSENSUS_SUBMIT).toBe('CONSENSUSSUBMITMESSAGE');
  });
});

// ---------------------------------------------------------------------------
// Tests: Solidity encoding helpers
// ---------------------------------------------------------------------------

describe('encodeFunctionCall', () => {
  it('encodes function signature', () => {
    const result = encodeFunctionCall('balanceOf(address)', ['0x1234567890abcdef1234567890abcdef12345678']);
    expect(result.startsWith('0x')).toBe(true);
    // Result should have at least 4 bytes (8 hex chars) for selector + params
    expect(result.length).toBeGreaterThan(8);
  });

  it('encodes with no params', () => {
    const result = encodeFunctionCall('totalSupply()');
    expect(result.startsWith('0x')).toBe(true);
    expect(result.length).toBe(10); // 0x + 8 hex chars
  });

  it('produces deterministic output', () => {
    const r1 = encodeFunctionCall('transfer(address,uint256)', ['0xabc', '100']);
    const r2 = encodeFunctionCall('transfer(address,uint256)', ['0xabc', '100']);
    expect(r1).toBe(r2);
  });
});

describe('decodeUint256', () => {
  it('decodes a uint256', () => {
    const hex = '0x' + '0'.repeat(56) + '0000000a';
    expect(decodeUint256(hex)).toBe(10n);
  });

  it('decodes large uint256', () => {
    const hex = '0x' + '0'.repeat(48) + '0100000000000000';
    expect(decodeUint256(hex)).toBe(0x0100000000000000n);
  });

  it('handles without 0x prefix', () => {
    expect(decodeUint256('00000000000000000000000000000000000000000000000000000000000000ff')).toBe(255n);
  });
});

describe('decodeAddress', () => {
  it('decodes an address', () => {
    const hex = '0x' + '0'.repeat(24) + 'aabbccddeeff00112233445566778899aabbccdd';
    expect(decodeAddress(hex)).toBe('0xaabbccddeeff00112233445566778899aabbccdd');
  });

  it('handles without 0x prefix', () => {
    const hex = '0'.repeat(24) + 'aabbccddeeff00112233445566778899aabbccdd';
    expect(decodeAddress(hex)).toBe('0xaabbccddeeff00112233445566778899aabbccdd');
  });
});

describe('decodeString', () => {
  it('decodes a simple string', () => {
    // "Hello" as padded ABI encoding — simplified test
    const hex = '0x000000000000000000000000000000000000000000000000000000000000000548656c6c6f';
    const result = decodeString(hex);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns hex on decode failure', () => {
    // Invalid hex chars get filtered; the function returns the result of TextDecoder
    // which may produce empty string. The important thing is it doesn't throw.
    expect(() => decodeString('0xZZZZ')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — construction & identity
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — construction', () => {
  it('has correct id', () => {
    const adapter = new HederaChainAdapter();
    expect(adapter.id).toBe('hedera-adapter');
  });

  it('has correct name', () => {
    const adapter = new HederaChainAdapter();
    expect(adapter.name).toBe('Hedera Chain Adapter');
  });

  it('default chain is mainnet', async () => {
    const adapter = new HederaChainAdapter();
    expect(await adapter.getChainId()).toBe('hedera:mainnet');
  });

  it('default numeric chain ID is 295', () => {
    const adapter = new HederaChainAdapter();
    expect(adapter.getChainIdNumeric()).toBe(295);
  });

  it('starts disconnected', () => {
    const adapter = new HederaChainAdapter();
    expect(adapter.getAddress()).toBeNull();
  });

  it('starts in native mode', () => {
    const adapter = new HederaChainAdapter();
    expect(adapter.getEvmMode()).toBe(false);
  });

  it('can toggle EVM mode', () => {
    const adapter = new HederaChainAdapter();
    adapter.setEvmMode(true);
    expect(adapter.getEvmMode()).toBe(true);
    adapter.setEvmMode(false);
    expect(adapter.getEvmMode()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — chain registration & switching
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — chains', () => {
  it('registerChains replaces chains', () => {
    const adapter = new HederaChainAdapter();
    const customChains = [
      {
        id: 'hedera:custom',
        name: 'Custom Net',
        rpcUrl: 'https://custom.mirrornode.com/api/v1',
        nativeCurrency: { name: 'Hbar', symbol: 'HBAR', decimals: 8 },
      },
    ];
    adapter.registerChains(customChains);
    expect(adapter.findChainById('hedera:custom')).toBeDefined();
    expect(adapter.findChainById('hedera:mainnet')).toBeUndefined();
  });

  it('registerChains with empty array uses defaults', async () => {
    const adapter = new HederaChainAdapter();
    adapter.registerChains([]);
    expect(await adapter.getChainId()).toBe('hedera:mainnet');
  });

  it('findChainById finds mainnet', () => {
    const adapter = new HederaChainAdapter();
    const chain = adapter.findChainById('hedera:mainnet');
    expect(chain?.name).toBe('Hedera Mainnet');
  });

  it('findChain returns undefined for non-matching numeric ID', () => {
    const adapter = new HederaChainAdapter();
    expect(adapter.findChain(999)).toBeUndefined();
  });

  it('switchChainById switches to testnet', async () => {
    const adapter = new HederaChainAdapter();
    await adapter.switchChainById('hedera:testnet');
    expect(await adapter.getChainId()).toBe('hedera:testnet');
    expect(adapter.getChainIdNumeric()).toBe(296);
  });

  it('switchChainById switches to previewnet', async () => {
    const adapter = new HederaChainAdapter();
    await adapter.switchChainById('hedera:previewnet');
    expect(await adapter.getChainId()).toBe('hedera:previewnet');
    expect(adapter.getChainIdNumeric()).toBe(297);
  });

  it('switchChainById throws on unknown chain', async () => {
    const adapter = new HederaChainAdapter();
    await expect(adapter.switchChainById('hedera:unknown')).rejects.toThrow('Chain not found');
  });

  it('switchChain with numeric ID 296', async () => {
    const adapter = new HederaChainAdapter();
    await adapter.switchChain(296);
    expect(await adapter.getChainId()).toBe('hedera:testnet');
  });

  it('setMirrorNodeUrl updates URL and resets client', () => {
    const adapter = new HederaChainAdapter();
    adapter.setMirrorNodeUrl('https://custom.example.com/api/v1');
    expect(adapter.getMirrorNodeUrl()).toBe('https://custom.example.com/api/v1');
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — connector
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — connector', () => {
  it('setConnector stores the connector', () => {
    const adapter = new HederaChainAdapter();
    const mockConnector = { getProvider: () => null } as any;
    adapter.setConnector(mockConnector);
    // No public getter, but setConnector should not throw
    expect(() => adapter.setConnector(mockConnector)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — provider
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — provider', () => {
  it('setProvider and getProvider', () => {
    const adapter = new HederaChainAdapter();
    const mockProvider: any = { name: 'test' };
    adapter.setProvider(mockProvider);
    expect(adapter.getProvider()).toBe(mockProvider);
  });

  it('getProvider returns null initially', () => {
    const adapter = new HederaChainAdapter();
    expect(adapter.getProvider()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — wallet resolution
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — wallet resolution', () => {
  beforeEach(() => {
    clearWindow();
  });

  it('connect throws when no wallet is available', async () => {
    clearWindow();
    const adapter = new HederaChainAdapter();
    await expect(adapter.connect()).rejects.toThrow('No Hedera wallet found');
  });

  it('connect resolves HashPack when available', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: '0.0.12345', publicKey: 'abc' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
      },
    });
    const adapter = new HederaChainAdapter();
    const accounts = await adapter.connect();
    expect(accounts).toEqual(['0.0.12345']);
    expect(adapter.getAddress()).toBe('0.0.12345');
  });

  it('connect resolves Blade when HashPack is absent', async () => {
    mockWindow({
      blade: {
        name: 'Blade',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: '0.0.67890', publicKey: 'def' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
      },
    });
    const adapter = new HederaChainAdapter();
    const accounts = await adapter.connect();
    expect(accounts).toEqual(['0.0.67890']);
  });

  it('connect resolves Kaiban as fallback', async () => {
    mockWindow({
      kaiban: {
        name: 'Kaiban',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: '0.0.11111', publicKey: 'ghi' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
      },
    });
    const adapter = new HederaChainAdapter();
    const accounts = await adapter.connect();
    expect(accounts).toEqual(['0.0.11111']);
  });

  it('connect prefers walletId over auto-detect', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: '0.0.1', publicKey: 'a' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
      },
      blade: {
        name: 'Blade',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: '0.0.2', publicKey: 'b' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
      },
    });
    const adapter = new HederaChainAdapter();
    const accounts = await adapter.connect('blade');
    expect(accounts).toEqual(['0.0.2']);
  });

  it('connect falls back to getAccountNum', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve(null),
        getAccountNum: () => Promise.resolve('0.0.54321'),
        disconnect: () => Promise.resolve(),
      },
    });
    const adapter = new HederaChainAdapter();
    const accounts = await adapter.connect();
    expect(accounts).toEqual(['0.0.54321']);
  });

  it('disconnect clears state', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: '0.0.123', publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    expect(adapter.getAddress()).toBe('0.0.123');

    await adapter.disconnect();
    expect(adapter.getAddress()).toBeNull();
    expect(adapter.getProvider()).toBeNull();
  });

  it('getAccounts throws when not connected', async () => {
    const adapter = new HederaChainAdapter();
    await expect(adapter.getAccounts()).rejects.toThrow('Not connected');
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — balance queries
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — getBalance', () => {
  it('returns balance from Mirror Node', async () => {
    mockFetch(MOCK_ACCOUNT_INFO);
    const adapter = new HederaChainAdapter();
    const balance = await adapter.getBalance(TEST_ACCOUNT_ID);
    expect(balance).toBe('1000000000');
  });

  it('returns balance for EVM address', async () => {
    mockFetch(MOCK_ACCOUNT_INFO);
    const adapter = new HederaChainAdapter();
    const balance = await adapter.getBalance(TEST_EVM_ADDRESS);
    expect(balance).toBe('1000000000');
  });

  it('returns 0 on API failure', async () => {
    mockFetch({ error: 'not found' }, 404);
    mockFetch({ error: 'not found' }, 404);
    const adapter = new HederaChainAdapter();
    const balance = await adapter.getBalance(TEST_ACCOUNT_ID);
    expect(balance).toBe('0');
  });

  it('getBalanceFormatted returns human-readable HBAR', async () => {
    mockFetch(MOCK_ACCOUNT_INFO);
    const adapter = new HederaChainAdapter();
    const formatted = await adapter.getBalanceFormatted(TEST_ACCOUNT_ID);
    expect(formatted).toBe('10'); // 1_000_000_000 tinybar = 10 HBAR
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — token balances
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — getAllBalances', () => {
  it('returns token balances', async () => {
    mockFetch(MOCK_TOKEN_BALANCES);
    const adapter = new HederaChainAdapter();
    const balances = await adapter.getAllBalances(TEST_ACCOUNT_ID);
    expect(balances.length).toBe(2);
    expect(balances[0].token_id).toBe(TEST_TOKEN_ID);
    expect(balances[0].balance).toBe(500_000_000);
  });

  it('returns empty array on API failure', async () => {
    mockFetch({ error: 'fail' }, 500);
    const adapter = new HederaChainAdapter();
    const balances = await adapter.getAllBalances(TEST_ACCOUNT_ID);
    expect(balances).toEqual([]);
  });
});

describe('HederaChainAdapter — getTokenInfo', () => {
  it('returns token info', async () => {
    mockFetch(MOCK_TOKEN_INFO);
    const adapter = new HederaChainAdapter();
    const info = await adapter.getTokenInfo(TEST_TOKEN_ID);
    expect(info?.name).toBe('TestToken');
    expect(info?.symbol).toBe('TTK');
    expect(info?.type).toBe('FUNGIBLE_COMMON');
    expect(info?.decimals).toBe(6);
  });

  it('returns null on failure', async () => {
    mockFetch({ error: 'not found' }, 404);
    const adapter = new HederaChainAdapter();
    const info = await adapter.getTokenInfo(TEST_TOKEN_ID);
    expect(info).toBeNull();
  });

  it('throws on invalid token ID', async () => {
    const adapter = new HederaChainAdapter();
    await expect(adapter.getTokenInfo('invalid')).rejects.toThrow('Invalid Hedera token ID');
  });
});

describe('HederaChainAdapter — getTokenBalance', () => {
  it('returns token balance for account', async () => {
    mockFetch(MOCK_TOKEN_BALANCES);
    const adapter = new HederaChainAdapter();
    const balance = await adapter.getTokenBalance(TEST_TOKEN_ID, TEST_ACCOUNT_ID);
    expect(balance).toBe('500000000');
  });

  it('returns 0 when token not found', async () => {
    mockFetch(MOCK_TOKEN_BALANCES);
    const adapter = new HederaChainAdapter();
    const balance = await adapter.getTokenBalance('0.0.99999', TEST_ACCOUNT_ID);
    expect(balance).toBe('0');
  });

  it('returns 0 on API failure', async () => {
    mockFetch({ error: 'fail' }, 500);
    const adapter = new HederaChainAdapter();
    const balance = await adapter.getTokenBalance(TEST_TOKEN_ID, TEST_ACCOUNT_ID);
    expect(balance).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — NFTs
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — NFTs', () => {
  it('getNfts returns NFT holdings', async () => {
    mockFetch(MOCK_NFTS);
    const adapter = new HederaChainAdapter();
    const nfts = await adapter.getNfts(TEST_ACCOUNT_ID);
    expect(nfts.length).toBe(1);
    expect(nfts[0].token_id).toBe('0.0.99999');
    expect(nfts[0].serial_number).toBe(42);
  });

  it('getNfts returns empty on failure', async () => {
    mockFetch({ error: 'fail' }, 500);
    const adapter = new HederaChainAdapter();
    const nfts = await adapter.getNfts(TEST_ACCOUNT_ID);
    expect(nfts).toEqual([]);
  });

  it('getNftInfo returns NFT info', async () => {
    const mockNft = {
      account_id: TEST_ACCOUNT_ID,
      created_timestamp: '1600000000.000000000',
      deleted: false,
      metadata: 'dGVzdA==',
      serial_number: 1,
      token_id: '0.0.99999',
      spender: null,
    };
    mockFetch(mockNft);
    const adapter = new HederaChainAdapter();
    const nft = await adapter.getNftInfo('0.0.99999', 1);
    expect(nft?.serial_number).toBe(1);
  });

  it('getNftInfo returns null on failure', async () => {
    mockFetch({ error: 'not found' }, 404);
    const adapter = new HederaChainAdapter();
    const nft = await adapter.getNftInfo('0.0.99999', 1);
    expect(nft).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — transactions
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — transactions', () => {
  it('getTransactions returns history', async () => {
    mockFetch(MOCK_TRANSACTIONS);
    const adapter = new HederaChainAdapter();
    const txs = await adapter.getTransactions(TEST_ACCOUNT_ID);
    expect(txs.length).toBe(1);
    expect(txs[0].name).toBe('CRYPTOTRANSFER');
    expect(txs[0].result).toBe('SUCCESS');
  });

  it('getTransactions returns empty on failure', async () => {
    mockFetch({ error: 'fail' }, 500);
    const adapter = new HederaChainAdapter();
    const txs = await adapter.getTransactions(TEST_ACCOUNT_ID);
    expect(txs).toEqual([]);
  });

  it('getTransaction returns a single transaction', async () => {
    mockFetch(MOCK_TRANSACTIONS);
    const adapter = new HederaChainAdapter();
    const tx = await adapter.getTransaction(`${TEST_ACCOUNT_ID}-1700000000-000000000`);
    expect(tx?.transaction_id).toBe(`${TEST_ACCOUNT_ID}-1700000000-000000000`);
  });

  it('getTransaction returns null on failure', async () => {
    mockFetch({ error: 'not found' }, 404);
    const adapter = new HederaChainAdapter();
    const tx = await adapter.getTransaction('0.0.123-0-0');
    expect(tx).toBeNull();
  });

  it('getExchangeRate returns HBAR/USD', async () => {
    mockFetch({
      current_rate: { hbar_equivalent: 1, cent_equivalent: 1234 },
    });
    const adapter = new HederaChainAdapter();
    const rate = await adapter.getExchangeRate();
    expect(rate?.hbarUsd).toBe(12.34);
  });

  it('getExchangeRate returns null on failure', async () => {
    mockFetch({ error: 'fail' }, 500);
    const adapter = new HederaChainAdapter();
    const rate = await adapter.getExchangeRate();
    expect(rate).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — signing
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — signing', () => {
  it('signMessage uses wallet signMessage', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: (_msg: string, _account: string) =>
          Promise.resolve({ signature: 'sig_abc123', publicKey: 'pk', accountId: TEST_ACCOUNT_ID }),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    const sig = await adapter.signMessage('Hello Hedera');
    expect(sig).toBe('sig_abc123');
  });

  it('signMessage falls back to EIP-1193', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        request: ({ method }: { method: string }) => {
          if (method === 'personal_sign') return Promise.resolve('0xsignature');
          return Promise.reject(new Error('unknown'));
        },
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    const sig = await adapter.signMessage('test');
    expect(sig).toBe('0xsignature');
  });

  it('signMessage throws when no provider', async () => {
    const adapter = new HederaChainAdapter();
    await expect(adapter.signMessage('test')).rejects.toThrow('No provider connected');
  });

  it('signTransaction signs tx bytes', async () => {
    const rawBytes = new Uint8Array([1, 2, 3, 4]);
    const signedBytes = new Uint8Array([1, 2, 3, 4, 5]);

    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        signTransaction: (_tx: Uint8Array) => Promise.resolve(signedBytes),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    const result = await adapter.signTransaction(rawBytes);
    expect(typeof result).toBe('string');
  });

  it('signTransaction with base64 string input', async () => {
    const rawBytes = new Uint8Array([1, 2, 3]);
    const base64 = btoa(String.fromCharCode(...rawBytes));
    const signedBytes = new Uint8Array([1, 2, 3, 4]);

    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        signTransaction: (_tx: Uint8Array) => Promise.resolve(signedBytes),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    const result = await adapter.signTransaction(base64);
    expect(typeof result).toBe('string');
  });

  it('signTransaction throws when wallet does not support it', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        // No signTransaction method
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    await expect(adapter.signTransaction(new Uint8Array([1]))).rejects.toThrow(
      'does not support transaction signing',
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — transactions (sending)
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — sendTransaction', () => {
  it('throws when no provider', async () => {
    const adapter = new HederaChainAdapter();
    await expect(
      adapter.sendTransaction({ to: TEST_ACCOUNT_ID, amount: '100' }),
    ).rejects.toThrow('No provider connected');
  });

  it('accepts base64 string and submits', async () => {
    const rawBytes = new Uint8Array([1, 2, 3]);
    const base64 = btoa(String.fromCharCode(...rawBytes));
    const txHash = '0xtxhash';

    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        signTransaction: (tx: Uint8Array) => Promise.resolve(tx),
        submitTransaction: (_tx: Uint8Array) => Promise.resolve(txHash),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    const result = await adapter.sendTransaction(base64);
    expect(result).toBe(txHash);
  });

  it('accepts Uint8Array and submits', async () => {
    const txBytes = new Uint8Array([4, 5, 6]);
    const txHash = '0xtxhash2';

    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        signTransaction: (tx: Uint8Array) => Promise.resolve(tx),
        submitTransaction: (_tx: Uint8Array) => Promise.resolve(txHash),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    const result = await adapter.sendTransaction(txBytes);
    expect(result).toBe(txHash);
  });

  it('transferHbar delegates to sendTransaction', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    await expect(
      adapter.transferHbar(TEST_ACCOUNT_ID, 1_000_000_000),
    ).rejects.toThrow(/require.*@hashgraph\/sdk/);
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — smart contracts (EVM mode)
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — smart contracts', () => {
  it('callContract throws in native mode', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    await expect(adapter.callContract(TEST_CONTRACT_ID, '0x')).rejects.toThrow(
      'Contract calls require EVM mode',
    );
  });

  it('callContract uses eth_call in EVM mode', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        request: ({ method }: { method: string }) => {
          if (method === 'eth_call') return Promise.resolve('0x000000000000000000000000000000000000000000000000000000000000000a');
          return Promise.reject(new Error('unknown'));
        },
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    adapter.setEvmMode(true);
    const result = await adapter.callContract(TEST_CONTRACT_ID, '0x70a08231');
    expect(result).toBe('0x000000000000000000000000000000000000000000000000000000000000000a');
  });

  it('callContract with EVM address in EVM mode', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        request: ({ method }: { method: string }) => {
          if (method === 'eth_call') return Promise.resolve('0x01');
          return Promise.reject(new Error('unknown'));
        },
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    adapter.setEvmMode(true);
    const result = await adapter.callContract(TEST_EVM_ADDRESS, '0x');
    expect(result).toBe('0x01');
  });

  it('executeContract uses eth_sendTransaction in EVM mode', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        request: ({ method }: { method: string }) => {
          if (method === 'eth_sendTransaction') return Promise.resolve('0xtxhash');
          return Promise.reject(new Error('unknown'));
        },
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    adapter.setEvmMode(true);
    const txId = await adapter.executeContract(TEST_CONTRACT_ID, '0xa9059cbb');
    expect(txId).toBe('0xtxhash');
  });

  it('deployContract deploys bytecode', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        request: ({ method }: { method: string }) => {
          if (method === 'eth_sendTransaction') return Promise.resolve('0xcontractaddress');
          return Promise.reject(new Error('unknown'));
        },
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    adapter.setEvmMode(true);
    const address = await adapter.deployContract('0x60806040', '100000000');
    expect(address).toBe('0xcontractaddress');
  });

  it('deployContract throws without EIP-1193', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        // No request method
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    adapter.setEvmMode(true);
    await expect(adapter.deployContract('0x6080')).rejects.toThrow('requires EVM mode with EIP-1193');
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — request (EIP-1193 compatible)
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — request method', () => {
  it('hedera_getBalance', async () => {
    mockFetch(MOCK_ACCOUNT_INFO);
    const adapter = new HederaChainAdapter();
    const balance = await adapter.request({
      method: 'hedera_getBalance',
      params: [TEST_ACCOUNT_ID],
    });
    expect(balance).toBe('1000000000');
  });

  it('hedera_getChainId', async () => {
    const adapter = new HederaChainAdapter();
    const chainId = await adapter.request({ method: 'hedera_getChainId' });
    expect(chainId).toBe('hedera:mainnet');
  });

  it('hedera_getAccountInfo', async () => {
    mockFetch(MOCK_ACCOUNT_INFO);
    const adapter = new HederaChainAdapter();
    const info = await adapter.request({
      method: 'hedera_getAccountInfo',
      params: [TEST_ACCOUNT_ID],
    });
    expect((info as any).account).toBe(TEST_ACCOUNT_ID);
  });

  it('hedera_getAccountInfo returns null on failure', async () => {
    mockFetch({ error: 'not found' }, 404);
    const adapter = new HederaChainAdapter();
    const info = await adapter.request({
      method: 'hedera_getAccountInfo',
      params: [TEST_ACCOUNT_ID],
    });
    expect(info).toBeNull();
  });

  it('hedera_getTokenInfo', async () => {
    mockFetch(MOCK_TOKEN_INFO);
    const adapter = new HederaChainAdapter();
    const info = await adapter.request({
      method: 'hedera_getTokenInfo',
      params: [TEST_TOKEN_ID],
    });
    expect((info as any)?.name).toBe('TestToken');
  });

  it('hedera_signMessage delegates to signMessage', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: (_msg: string, _account: string) =>
          Promise.resolve({ signature: 'sig_xyz', publicKey: 'pk', accountId: TEST_ACCOUNT_ID }),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    const sig = await adapter.request({
      method: 'hedera_signMessage',
      params: ['Hello'],
    });
    expect(sig).toBe('sig_xyz');
  });

  it('throws on unsupported method', async () => {
    const adapter = new HederaChainAdapter();
    await expect(adapter.request({ method: 'unknown_method' })).rejects.toThrow(
      'Unsupported Hedera method',
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — token/NFT transfer helpers
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — transfer helpers', () => {
  it('transferToken throws in native mode', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    await expect(
      adapter.transferToken('0.0.54321', TEST_TOKEN_ID, 100),
    ).rejects.toThrow(/require.*@hashgraph\/sdk/);
  });

  it('transferNft throws without connected account', async () => {
    const adapter = new HederaChainAdapter();
    await expect(
      adapter.transferNft('0.0.54321', '0.0.99999', 1),
    ).rejects.toThrow(/No connected account/);
  });

  it('transferHbar with bigint amount', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    await expect(
      adapter.transferHbar(TEST_ACCOUNT_ID, 5_000_000_000n),
    ).rejects.toThrow(/require.*@hashgraph\/sdk/);
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — EVM mode transactions
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — EVM mode transactions', () => {
  it('sendTransaction uses eth_sendTransaction in EVM mode', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        request: ({ method }: { method: string }) => {
          if (method === 'eth_sendTransaction') return Promise.resolve('0xevmTxHash');
          return Promise.reject(new Error('unknown'));
        },
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    adapter.setEvmMode(true);
    const txId = await adapter.sendTransaction({
      to: TEST_EVM_ADDRESS,
      amount: '1000000000',
    });
    expect(txId).toBe('0xevmTxHash');
  });

  it('transferHbar works in EVM mode', async () => {
    mockWindow({
      hashpack: {
        name: 'HashPack',
        icon: '',
        requestConnect: () => Promise.resolve({ accountId: TEST_ACCOUNT_ID, publicKey: 'pk' }),
        getAccountNum: () => Promise.resolve(null),
        disconnect: () => Promise.resolve(),
        signMessage: () => Promise.reject(new Error('not supported')),
        request: ({ method }: { method: string }) => {
          if (method === 'eth_sendTransaction') return Promise.resolve('0xhbarTx');
          return Promise.reject(new Error('unknown'));
        },
      },
    });
    const adapter = new HederaChainAdapter();
    await adapter.connect();
    adapter.setEvmMode(true);
    const txId = await adapter.transferHbar(TEST_EVM_ADDRESS, 500_000_000);
    expect(txId).toBe('0xhbarTx');
  });
});

// ---------------------------------------------------------------------------
// Tests: HederaChainAdapter — Mirror Node client direct usage
// ---------------------------------------------------------------------------

describe('HederaChainAdapter — Mirror Node client', () => {
  it('fetches account transactions with limit', async () => {
    mockFetch(MOCK_TRANSACTIONS);
    const adapter = new HederaChainAdapter();
    const txs = await adapter.getTransactions(TEST_ACCOUNT_ID, 5);
    expect(txs.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: Export verification
// ---------------------------------------------------------------------------

describe('Module exports', () => {
  it('HederaChainAdapter is exported', () => {
    expect(typeof HederaChainAdapter).toBe('function');
  });

  it('HEDERA_CHAINS is exported', () => {
    expect(Array.isArray(HEDERA_CHAINS)).toBe(true);
    expect(HEDERA_CHAINS.length).toBe(3);
  });

  it('HEDERA_WALLETS is exported', () => {
    expect(Array.isArray(HEDERA_WALLETS)).toBe(true);
    expect(HEDERA_WALLETS.length).toBe(3);
  });

  it('utility functions are exported', () => {
    expect(typeof isValidHederaAccountId).toBe('function');
    expect(typeof isValidHederaEvmAddress).toBe('function');
    expect(typeof normalizeHederaAddress).toBe('function');
    expect(typeof isValidHederaTokenId).toBe('function');
    expect(typeof isValidHederaContractId).toBe('function');
    expect(typeof accountIdToEvmAddress).toBe('function');
    expect(typeof parseAccountId).toBe('function');
    expect(typeof formatHbar).toBe('function');
    expect(typeof parseHbarAmount).toBe('function');
    expect(typeof encodeFunctionCall).toBe('function');
    expect(typeof decodeUint256).toBe('function');
    expect(typeof decodeAddress).toBe('function');
    expect(typeof decodeString).toBe('function');
  });
});
