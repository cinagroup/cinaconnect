import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SuiChainAdapter,
  SUI_CHAINS,
  SUI_WALLETS,
  mistToSui,
  suiToMist,
  isValidSuiAddress,
  VERSION,
} from './index';
import type { SuiConnector, SuiWalletProvider } from './types';
import type { Connector } from '@cinacoin/core-sdk';

/* ── isValidSuiAddress ──────────────────────────────────────────── */

describe('isValidSuiAddress', () => {
  it('returns true for a valid 64-char hex address with 0x prefix', () => {
    expect(isValidSuiAddress('0x' + 'a'.repeat(64))).toBe(true);
  });

  it('returns true for a 66-char address (with 0x) that is valid hex', () => {
    expect(isValidSuiAddress('0x' + 'ab'.repeat(32))).toBe(true);
  });

  it('returns false for an address without 0x prefix', () => {
    expect(isValidSuiAddress('a'.repeat(64))).toBe(false);
  });

  it('returns false for a short address (< 64 hex chars)', () => {
    expect(isValidSuiAddress('0x' + 'a'.repeat(32))).toBe(false);
  });

  it('returns false for non-hex characters', () => {
    expect(isValidSuiAddress('0x' + 'g'.repeat(64))).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidSuiAddress('')).toBe(false);
  });

  it('returns false for null-like input (typeof !== string)', () => {
    // The function checks typeof !== 'string', so any non-string will fail
    expect(isValidSuiAddress(null as unknown as string)).toBe(false);
    expect(isValidSuiAddress(undefined as unknown as string)).toBe(false);
  });
});

/* ── mistToSui / suiToMist ─────────────────────────────────────── */

describe('mistToSui', () => {
  it('converts 0 MIST to "0"', () => {
    expect(mistToSui(0)).toBe('0');
  });

  it('converts 1 SUI (1e9 MIST) to "1"', () => {
    expect(mistToSui(1_000_000_000)).toBe('1');
  });

  it('converts fractional MIST values correctly', () => {
    expect(mistToSui(1_234_567_890)).toBe('1.23456789');
  });

  it('converts large values correctly', () => {
    expect(mistToSui(100_000_000_000n)).toBe('100');
  });

  it('handles string input', () => {
    expect(mistToSui('5000000000')).toBe('5');
  });

  it('trims trailing zeros in the fractional part', () => {
    expect(mistToSui(1_500_000_000)).toBe('1.5');
  });
});

describe('suiToMist', () => {
  it('converts 1 SUI to 1e9 MIST', () => {
    expect(suiToMist(1)).toBe(1_000_000_000n);
  });

  it('converts 0 SUI to 0 MIST', () => {
    expect(suiToMist(0)).toBe(0n);
  });

  it('converts fractional SUI values correctly', () => {
    expect(suiToMist('1.5')).toBe(1_500_000_000n);
  });

  it('handles bigint input', () => {
    expect(suiToMist(100n)).toBe(100_000_000_000n);
  });

  it('pads fractional part to 9 digits', () => {
    expect(suiToMist('0.000000001')).toBe(1n);
  });

  it('truncates fractional part beyond 9 digits', () => {
    expect(suiToMist('1.1234567899')).toBe(1_123_456_789n);
  });
});

/* ── SUI_CHAINS / SUI_WALLETS constants ─────────────────────────── */

describe('SUI_CHAINS', () => {
  it('contains mainnet, testnet, devnet, and localnet', () => {
    const ids = SUI_CHAINS.map(c => c.id);
    expect(ids).toContain('sui:mainnet');
    expect(ids).toContain('sui:testnet');
    expect(ids).toContain('sui:devnet');
    expect(ids).toContain('sui:localnet');
  });

  it('each chain has required fields', () => {
    SUI_CHAINS.forEach(chain => {
      expect(chain).toHaveProperty('id');
      expect(chain).toHaveProperty('name');
      expect(chain).toHaveProperty('rpcUrl');
      expect(chain).toHaveProperty('explorerUrl');
    });
  });

  it('testnet and devnet have faucet URLs', () => {
    const testnet = SUI_CHAINS.find(c => c.id === 'sui:testnet');
    const devnet = SUI_CHAINS.find(c => c.id === 'sui:devnet');
    expect(testnet?.faucetUrl).toBeDefined();
    expect(devnet?.faucetUrl).toBeDefined();
  });
});

describe('SUI_WALLETS', () => {
  it('contains 4 wallets', () => {
    expect(SUI_WALLETS).toHaveLength(4);
  });

  it('each wallet has required fields', () => {
    SUI_WALLETS.forEach(wallet => {
      expect(wallet).toHaveProperty('id');
      expect(wallet).toHaveProperty('name');
      expect(wallet).toHaveProperty('icon');
      expect(wallet).toHaveProperty('downloadUrl');
    });
  });

  it('includes known wallets by id', () => {
    const ids = SUI_WALLETS.map(w => w.id);
    expect(ids).toContain('sui-wallet');
    expect(ids).toContain('suiet');
    expect(ids).toContain('ethos');
    expect(ids).toContain('martian');
  });
});

/* ── VERSION ────────────────────────────────────────────────────── */

describe('VERSION', () => {
  it('is a non-empty string', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });
});

/* ── SuiChainAdapter ───────────────────────────────────────────── */

describe('SuiChainAdapter', () => {
  let adapter: SuiChainAdapter;

  beforeEach(() => {
    adapter = new SuiChainAdapter();
  });

  it('creates with default properties', () => {
    expect(adapter.id).toBe('sui');
    expect(adapter.name).toBe('Sui Chain Adapter');
  });

  it('is not connected by default', () => {
    expect(adapter.isConnected()).toBe(false);
  });

  it('returns null for getAddress when not connected', () => {
    expect(adapter.getAddress()).toBe(null);
  });

  it('defaults to mainnet network', () => {
    expect(adapter.getNetwork()).toBe('mainnet');
  });

  it('has the mainnet RPC URL by default', () => {
    expect(adapter.getRpcUrl()).toBe('https://fullnode.mainnet.sui.io:443');
  });

  it('returns 4 default connectors', () => {
    const connectors = adapter.getConnectors();
    expect(connectors).toHaveLength(4);
  });

  it('getAvailableConnectors returns empty when no wallet is installed', () => {
    // In node environment, no browser wallet extensions are available
    const available = adapter.getAvailableConnectors();
    expect(available).toHaveLength(0);
  });

  it('registerConnector adds a new connector without duplicates', () => {
    const mockConnector: SuiConnector = {
      id: 'test-connector',
      name: 'Test Wallet',
      icon: 'test.svg',
      platforms: ['browser'],
      supportedFeatures: ['sui:connect'],
      connect: vi.fn(),
      disconnect: vi.fn(),
      isAvailable: vi.fn().mockReturnValue(false),
      getAddress: vi.fn().mockReturnValue(null),
      getProvider: vi.fn().mockReturnValue(null),
      signTransaction: vi.fn(),
      signAndExecuteTransaction: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    adapter.registerConnector(mockConnector);
    expect(adapter.getConnectors()).toHaveLength(5);
    // Register again — should not add duplicate
    adapter.registerConnector(mockConnector);
    expect(adapter.getConnectors()).toHaveLength(5);
  });

  it('switchChain with network name string updates network and RPC URL', async () => {
    await adapter.switchChain('testnet');
    expect(adapter.getNetwork()).toBe('testnet');
    expect(adapter.getRpcUrl()).toBe('https://fullnode.testnet.sui.io:443');
  });

  it('switchChain with "sui:" prefixed string updates network', async () => {
    await adapter.switchChain('sui:devnet');
    expect(adapter.getNetwork()).toBe('devnet');
    expect(adapter.getRpcUrl()).toBe('https://fullnode.devnet.sui.io:443');
  });

  it('switchChain with numeric ID maps to network', async () => {
    await adapter.switchChain(1); // maps to testnet
    expect(adapter.getNetwork()).toBe('testnet');
  });

  it('switchChain throws for unknown network', async () => {
    await expect(adapter.switchChain('unknownnet')).rejects.toThrow('Unknown Sui network');
  });

  it('throws when connecting without available wallets', async () => {
    await expect(adapter.connect()).rejects.toThrow('No Sui wallet found');
  });

  it('throws when connecting with unknown walletId', async () => {
    await expect(adapter.connect('unknown-wallet')).rejects.toThrow('Unknown Sui wallet connector');
  });

  it('disconnect is safe when not connected', async () => {
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('getBalance throws for invalid address', async () => {
    await expect(adapter.getBalance('invalid')).rejects.toThrow('Invalid Sui address');
  });

  it('getBalance throws for too-short address', async () => {
    await expect(adapter.getBalance('0xabc')).rejects.toThrow('Invalid Sui address');
  });

  it('signMessage throws when not connected', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('No provider connected');
  });

  it('signTransaction throws when not connected', async () => {
    await expect(adapter.signTransaction('tx')).rejects.toThrow('No provider connected');
  });

  it('executeTransaction throws when not connected', async () => {
    await expect(adapter.executeTransaction('tx')).rejects.toThrow('No provider connected');
  });

  it('transferSui throws for invalid recipient', async () => {
    await expect(adapter.transferSui({ recipient: 'invalid', amount: 100n }))
      .rejects.toThrow('Invalid recipient address');
  });

  it('transferSui throws when not connected', async () => {
    await expect(adapter.transferSui({ recipient: '0x' + 'a'.repeat(64), amount: 100n }))
      .rejects.toThrow('No provider connected');
  });

  it('setConnector is a no-op (deprecated shim)', () => {
    const mockConnector: SuiConnector = {
      id: 'mock',
      name: 'Mock Wallet',
      icon: 'mock.svg',
      platforms: ['browser'],
      supportedFeatures: ['sui:connect'],
      connect: vi.fn().mockResolvedValue({ accounts: [] }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isAvailable: vi.fn().mockReturnValue(false),
      getAddress: vi.fn().mockReturnValue(null),
      getProvider: vi.fn().mockReturnValue(null),
      signTransaction: vi.fn(),
      signAndExecuteTransaction: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    expect(() => adapter.setConnector(mockConnector as unknown as Connector)).not.toThrow();
  });

  it('findChain returns mainnet for any numeric chainId', () => {
    const chain = adapter.findChain(1);
    expect(chain).toBeDefined();
    expect(chain?.id).toBe('sui:mainnet');
  });
});
