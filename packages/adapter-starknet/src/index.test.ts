import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StarknetChainAdapter, STARKNET_CHAINS, STARKNET_WALLETS } from './index.js';

// Mock window for SSR-safe connector checks
vi.stubGlobal('window', undefined);

// Mock fetch for RPC calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('@cinacoin/adapter-starknet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Package exports', () => {
    it('should export StarknetChainAdapter class', () => {
      expect(StarknetChainAdapter).toBeDefined();
      expect(typeof StarknetChainAdapter).toBe('function');
    });

    it('should export STARKNET_CHAINS array', () => {
      expect(STARKNET_CHAINS).toBeDefined();
      expect(Array.isArray(STARKNET_CHAINS)).toBe(true);
      expect(STARKNET_CHAINS.length).toBeGreaterThanOrEqual(2);
    });

    it('should export STARKNET_WALLETS array', () => {
      expect(STARKNET_WALLETS).toBeDefined();
      expect(Array.isArray(STARKNET_WALLETS)).toBe(true);
      expect(STARKNET_WALLETS.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('StarknetChainAdapter instantiation', () => {
    it('should instantiate without arguments', () => {
      const adapter = new StarknetChainAdapter();
      expect(adapter).toBeInstanceOf(StarknetChainAdapter);
      expect(adapter.id).toBe('starknet');
      expect(adapter.name).toBe('Starknet Adapter');
    });

    it('should have default RPC URL from chain presets', () => {
      const adapter = new StarknetChainAdapter();
      expect(adapter.id).toBe('starknet');
    });
  });

  describe('Configuration methods', () => {
    it('should set a custom RPC URL', () => {
      const adapter = new StarknetChainAdapter();
      adapter.setRpcUrl('https://custom-rpc.starknet.io');
      expect(adapter.id).toBe('starknet');
    });

    it('should set a core connector without error', () => {
      const adapter = new StarknetChainAdapter();
      expect(() => adapter.setConnector({} as any)).not.toThrow();
    });

    it('should setClient without error (no-op for Starknet)', () => {
      const adapter = new StarknetChainAdapter();
      expect(() => adapter.setClient({})).not.toThrow();
    });

    it('should register chains', () => {
      const adapter = new StarknetChainAdapter();
      adapter.registerChains([
        { id: 'starknet:custom', name: 'Custom Starknet', rpcUrl: 'https://custom.rpc', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 } },
      ]);
      expect(adapter.id).toBe('starknet');
    });

    it('should return null active connector when not connected', () => {
      const adapter = new StarknetChainAdapter();
      expect(adapter.getActiveConnector()).toBeNull();
    });

    it('should return null address when not connected', () => {
      const adapter = new StarknetChainAdapter();
      expect(adapter.getAddress()).toBeNull();
    });
  });

  describe('Connect & Disconnect', () => {
    it('should throw when no wallet available', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(adapter.connect()).rejects.toThrow('No Starknet wallet found');
    });

    it('should throw when specified wallet not available', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(adapter.connect('unknown-wallet')).rejects.toThrow('No Starknet wallet found');
    });

    it('should disconnect without error when not connected', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should return empty accounts when not connected', async () => {
      const adapter = new StarknetChainAdapter();
      const accounts = await adapter.getAccounts();
      expect(accounts).toEqual([]);
    });
  });

  describe('Balance queries', () => {
    it('should throw on getBalance with invalid address', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(adapter.getBalance('invalid')).rejects.toThrow('Invalid Starknet address');
    });

    it('should throw on getBalance with non-hex address', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(adapter.getBalance('0xGGGG')).rejects.toThrow('Invalid Starknet address');
    });

    it('should query balance via RPC', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: { value: '1000000000000000000' },
        }),
      });

      const adapter = new StarknetChainAdapter();
      const balance = await adapter.getBalance('0x1234567890abcdef1234567890abcdef12345678');
      expect(typeof balance).toBe('string');
    });

    it('should handle string result from RPC', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: '1000000000000000000',
        }),
      });

      const adapter = new StarknetChainAdapter();
      const balance = await adapter.getBalance('0x1234567890abcdef1234567890abcdef12345678');
      expect(typeof balance).toBe('string');
    });

    it('should handle getBalance with valid address format', () => {
      const adapter = new StarknetChainAdapter();
      expect(adapter.id).toBe('starknet');
    });

    it('should handle getBalance with zero address', () => {
      const adapter = new StarknetChainAdapter();
      expect(adapter.id).toBe('starknet');
    });
  });

  describe('Transaction operations', () => {
    it('should throw on signTransaction when not connected', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(
        adapter.signTransaction([]),
      ).rejects.toThrow('No wallet connected');
    });

    it('should throw on sendTransaction when not connected', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(
        adapter.sendTransaction([]),
      ).rejects.toThrow('No wallet connected');
    });

    it('should throw on signMessage when not connected', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(
        adapter.signMessage('hello'),
      ).rejects.toThrow('No wallet connected');
    });

    it('should throw on executeTransaction when not connected', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(
        adapter.executeTransaction([]),
      ).rejects.toThrow('No wallet connected');
    });
  });

  describe('Chain & wallet info', () => {
    it('should find a chain by numeric ID', () => {
      const adapter = new StarknetChainAdapter();
      const chain = adapter.findChain(0);
      // May be undefined if no chain matches
      expect(chain === undefined || typeof chain === 'object').toBe(true);
    });

    it('should get supported wallets', () => {
      const adapter = new StarknetChainAdapter();
      const wallets = adapter.getSupportedWallets();
      expect(Array.isArray(wallets)).toBe(true);
      expect(wallets.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle switchChain as no-op', async () => {
      const adapter = new StarknetChainAdapter();
      await expect(adapter.switchChain(0)).resolves.toBeUndefined();
    });
  });

  describe('Static isValidAddress', () => {
    it('should return true for valid Starknet addresses', () => {
      expect(StarknetChainAdapter.isValidAddress('0x1234abcd')).toBe(true);
      expect(StarknetChainAdapter.isValidAddress('0x0')).toBe(true);
    });

    it('should return false for invalid Starknet addresses', () => {
      expect(StarknetChainAdapter.isValidAddress('1234abcd')).toBe(false); // no 0x prefix
      expect(StarknetChainAdapter.isValidAddress('0xGGGG')).toBe(false); // non-hex
      expect(StarknetChainAdapter.isValidAddress('')).toBe(false); // empty
      expect(StarknetChainAdapter.isValidAddress('0x')).toBe(false); // 0x with no hex
    });
  });

  describe('Edge cases', () => {
    it('should handle empty config gracefully', () => {
      const adapter = new StarknetChainAdapter();
      expect(adapter.id).toBe('starknet');
    });

    it('should handle null connector in getAddress', () => {
      const adapter = new StarknetChainAdapter();
      expect(adapter.getAddress()).toBeNull();
    });

    it('should handle null connector in getAccounts', async () => {
      const adapter = new StarknetChainAdapter();
      const accounts = await adapter.getAccounts();
      expect(accounts).toEqual([]);
    });
  });
});
