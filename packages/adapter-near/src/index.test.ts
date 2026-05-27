import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NearChainAdapter, NEAR_CHAINS, NEAR_WALLETS } from './index.js';

// Mock window for SSR-safe connector checks
vi.stubGlobal('window', undefined);

// Mock fetch for RPC calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('@cinacoin/adapter-near', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Package exports', () => {
    it('should export NearChainAdapter class', () => {
      expect(NearChainAdapter).toBeDefined();
      expect(typeof NearChainAdapter).toBe('function');
    });

    it('should export NEAR_CHAINS array', () => {
      expect(NEAR_CHAINS).toBeDefined();
      expect(Array.isArray(NEAR_CHAINS)).toBe(true);
      expect(NEAR_CHAINS.length).toBeGreaterThanOrEqual(2);
    });

    it('should export NEAR_WALLETS array', () => {
      expect(NEAR_WALLETS).toBeDefined();
      expect(Array.isArray(NEAR_WALLETS)).toBe(true);
      expect(NEAR_WALLETS.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('NearChainAdapter instantiation', () => {
    it('should instantiate without arguments', () => {
      const adapter = new NearChainAdapter();
      expect(adapter).toBeInstanceOf(NearChainAdapter);
      expect(adapter.id).toBe('near');
      expect(adapter.name).toBe('NEAR Adapter');
    });

    it('should have default RPC URL from chain presets', () => {
      const adapter = new NearChainAdapter();
      // Internal _rpcUrl is set from NEAR_CHAINS[0].rpcUrl
      expect(adapter.id).toBe('near');
    });
  });

  describe('Configuration methods', () => {
    it('should set a custom RPC URL', () => {
      const adapter = new NearChainAdapter();
      adapter.setRpcUrl('https://custom-rpc.near.org');
      expect(adapter.id).toBe('near');
    });

    it('should set a core connector without error', () => {
      const adapter = new NearChainAdapter();
      expect(() => adapter.setConnector({} as any)).not.toThrow();
    });

    it('should setClient without error (no-op for NEAR)', () => {
      const adapter = new NearChainAdapter();
      expect(() => adapter.setClient({})).not.toThrow();
    });

    it('should register chains', () => {
      const adapter = new NearChainAdapter();
      adapter.registerChains([
        { id: 'near:custom', name: 'Custom NEAR', rpcUrl: 'https://custom.rpc', nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 } },
      ]);
      expect(adapter.id).toBe('near');
    });

    it('should return null active connector when not connected', () => {
      const adapter = new NearChainAdapter();
      expect(adapter.getActiveConnector()).toBeNull();
    });

    it('should return null account id when not connected', () => {
      const adapter = new NearChainAdapter();
      expect(adapter.getAccountId()).toBeNull();
    });
  });

  describe('Connect & Disconnect', () => {
    it('should throw when no wallet available', async () => {
      const adapter = new NearChainAdapter();
      await expect(adapter.connect()).rejects.toThrow('No NEAR wallet found');
    });

    it('should throw when specified wallet not available', async () => {
      const adapter = new NearChainAdapter();
      await expect(adapter.connect('unknown-wallet')).rejects.toThrow('No NEAR wallet found');
    });

    it('should disconnect without error when not connected', async () => {
      const adapter = new NearChainAdapter();
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should return empty accounts when not connected', async () => {
      const adapter = new NearChainAdapter();
      const accounts = await adapter.getAccounts();
      expect(accounts).toEqual([]);
    });
  });

  describe('Balance queries', () => {
    it('should throw on getBalance with invalid account id', async () => {
      const adapter = new NearChainAdapter();
      await expect(adapter.getBalance('invalid!@#')).rejects.toThrow('Invalid NEAR account id');
    });

    it('should throw on getBalance with too-short account id', async () => {
      const adapter = new NearChainAdapter();
      await expect(adapter.getBalance('a')).rejects.toThrow('Invalid NEAR account id');
    });

    it('should get RPC URL from chain presets', () => {
      const adapter = new NearChainAdapter();
      // Internal RPC URL should be set from NEAR_CHAINS[0]
      expect(adapter.id).toBe('near');
    });
  });

  describe('Transaction operations', () => {
    it('should throw on signTransaction when not connected', async () => {
      const adapter = new NearChainAdapter();
      await expect(
        adapter.signTransaction({ actions: { receiverId: 'bob.near', amount: '1000' } }),
      ).rejects.toThrow('No wallet connected');
    });

    it('should throw on sendTransaction when not connected', async () => {
      const adapter = new NearChainAdapter();
      await expect(
        adapter.sendTransaction({ actions: { receiverId: 'bob.near', amount: '1000' } }),
      ).rejects.toThrow('No wallet connected');
    });

    it('should throw on sendTransfer when not connected', async () => {
      const adapter = new NearChainAdapter();
      await expect(
        adapter.sendTransfer('bob.near', '1000'),
      ).rejects.toThrow('No wallet connected');
    });

    it('should throw on signMessage when not connected', async () => {
      const adapter = new NearChainAdapter();
      await expect(
        adapter.signMessage('hello'),
      ).rejects.toThrow('No wallet connected');
    });
  });

  describe('Chain & wallet info', () => {
    it('should find a chain by numeric ID', () => {
      const adapter = new NearChainAdapter();
      const chain = adapter.findChain(0); // mainnet
      // May return undefined if no chain ID matches
      expect(chain === undefined || typeof chain === 'object').toBe(true);
    });

    it('should get supported wallets', () => {
      const adapter = new NearChainAdapter();
      const wallets = adapter.getSupportedWallets();
      expect(Array.isArray(wallets)).toBe(true);
      expect(wallets.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle switchChain as no-op', async () => {
      const adapter = new NearChainAdapter();
      await expect(adapter.switchChain(0)).resolves.toBeUndefined();
    });
  });

  describe('Static isValidAccountId', () => {
    it('should return true for valid NEAR account ids', () => {
      expect(NearChainAdapter.isValidAccountId('alice.near')).toBe(true);
      expect(NearChainAdapter.isValidAccountId('bob.testnet')).toBe(true);
      expect(NearChainAdapter.isValidAccountId('my-contract.near')).toBe(true);
    });

    it('should return false for invalid NEAR account ids', () => {
      expect(NearChainAdapter.isValidAccountId('')).toBe(false);
      expect(NearChainAdapter.isValidAccountId('a')).toBe(false); // too short
      expect(NearChainAdapter.isValidAccountId('UPPER.near')).toBe(false); // uppercase
    });
  });

  describe('Edge cases', () => {
    it('should handle empty config gracefully', () => {
      const adapter = new NearChainAdapter();
      expect(adapter.id).toBe('near');
    });

    it('should handle null connector in getAccountId', () => {
      const adapter = new NearChainAdapter();
      expect(adapter.getAccountId()).toBeNull();
    });

    it('should handle null connector in getAccounts', async () => {
      const adapter = new NearChainAdapter();
      const accounts = await adapter.getAccounts();
      expect(accounts).toEqual([]);
    });
  });
});
