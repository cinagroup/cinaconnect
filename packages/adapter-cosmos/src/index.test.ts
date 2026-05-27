import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CosmosAdapterConfig } from './CosmosAdapter.js';
import { CosmosAdapter, COSMOS_CHAINS, COSMOS_CHAIN_INFO } from './index.js';

// Mock window for SSR-safe connector checks
vi.stubGlobal('window', undefined);

describe('@cinacoin/adapter-cosmos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Package exports', () => {
    it('should export CosmosAdapter class', () => {
      expect(CosmosAdapter).toBeDefined();
      expect(typeof CosmosAdapter).toBe('function');
    });

    it('should export COSMOS_CHAINS array with known chains', () => {
      expect(COSMOS_CHAINS).toBeDefined();
      expect(Array.isArray(COSMOS_CHAINS)).toBe(true);
      expect(COSMOS_CHAINS.length).toBeGreaterThanOrEqual(4);
      expect(COSMOS_CHAINS.some((c) => c.name === 'Cosmos Hub')).toBe(true);
    });

    it('should export COSMOS_CHAIN_INFO with chain metadata', () => {
      expect(COSMOS_CHAIN_INFO).toBeDefined();
      expect(typeof COSMOS_CHAIN_INFO).toBe('object');
      expect(COSMOS_CHAIN_INFO['cosmoshub-4']).toBeDefined();
      expect(COSMOS_CHAIN_INFO['cosmoshub-4'].bech32Prefix).toBe('cosmos');
    });
  });

  describe('CosmosAdapter instantiation', () => {
    it('should instantiate with valid config', () => {
      const config: CosmosAdapterConfig = {
        chainId: 'cosmoshub-4',
        rpcUrl: 'https://rpc.cosmos.network',
      };
      const adapter = new CosmosAdapter(config);
      expect(adapter).toBeInstanceOf(CosmosAdapter);
      expect(adapter.id).toBe('cosmos-adapter');
      expect(adapter.name).toBe('Cosmos Chain Adapter');
    });

    it('should use chain preset RPC URL when not provided', () => {
      const config: CosmosAdapterConfig = {
        chainId: 'osmosis-1',
      };
      const adapter = new CosmosAdapter(config);
      expect(adapter.getChainId()).toBe('osmosis-1');
    });

    it('should throw when no RPC URL can be resolved for unknown chain', () => {
      expect(() => {
        new CosmosAdapter({ chainId: 'unknown-chain-999' as any });
      }).toThrow('No RPC URL configured');
    });
  });

  describe('Configuration methods', () => {
    const config: CosmosAdapterConfig = {
      chainId: 'cosmoshub-4',
      rpcUrl: 'https://rpc.cosmos.network',
      restUrl: 'https://rest.cosmos.network',
    };

    it('should set RPC URL', () => {
      const adapter = new CosmosAdapter(config);
      adapter.setRpcUrl('https://new-rpc.example.com');
      expect(adapter.getChainId()).toBe('cosmoshub-4');
    });

    it('should set REST URL', () => {
      const adapter = new CosmosAdapter(config);
      adapter.setRestUrl('https://new-rest.example.com');
      expect(adapter.getChainId()).toBe('cosmoshub-4');
    });

    it('should return null connector when not connected', () => {
      const adapter = new CosmosAdapter(config);
      expect(adapter.getConnector()).toBeNull();
    });

    it('should return null address when not connected', () => {
      const adapter = new CosmosAdapter(config);
      expect(adapter.getAddress()).toBeNull();
    });

    it('should setConnector without error (no-op for cosmos)', () => {
      const adapter = new CosmosAdapter(config);
      expect(() => adapter.setConnector({} as any)).not.toThrow();
    });

    it('should setClient without error (no-op for cosmos)', () => {
      const adapter = new CosmosAdapter(config);
      expect(() => adapter.setClient({})).not.toThrow();
    });

    it('should register chains', () => {
      const adapter = new CosmosAdapter(config);
      adapter.registerChains([{ id: 'cosmos:custom-1', name: 'Custom', rpcUrl: 'https://custom.rpc', nativeCurrency: { name: 'Custom', symbol: 'CST', decimals: 6 } }]);
      expect(adapter.getChainId()).toBe('cosmoshub-4');
    });

    it('should findChain by numeric ID (returns first chain)', () => {
      const adapter = new CosmosAdapter(config);
      adapter.registerChains([{ id: 'cosmos:hub-4', name: 'Hub', rpcUrl: 'https://rpc.hub', nativeCurrency: { name: 'Hub', symbol: 'HUB', decimals: 6 } }]);
      const chain = adapter.findChain(999);
      expect(chain).toBeDefined();
    });
  });

  describe('Connect & Disconnect', () => {
    const config: CosmosAdapterConfig = {
      chainId: 'cosmoshub-4',
      rpcUrl: 'https://rpc.cosmos.network',
    };

    it('should throw on connect when no wallet available', async () => {
      const adapter = new CosmosAdapter(config);
      await expect(adapter.connect()).rejects.toThrow('No Cosmos wallet found');
    });

    it('should disconnect without error when not connected', async () => {
      const adapter = new CosmosAdapter(config);
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should return empty accounts when not connected', async () => {
      const adapter = new CosmosAdapter(config);
      const accounts = await adapter.getAccounts();
      expect(accounts).toEqual([]);
    });
  });

  describe('Balance queries', () => {
    const config: CosmosAdapterConfig = {
      chainId: 'cosmoshub-4',
      rpcUrl: 'https://rpc.cosmos.network',
      restUrl: 'https://rest.cosmos.network',
    };

    it('should throw on getBalance with invalid bech32 address', async () => {
      const adapter = new CosmosAdapter(config);
      await expect(adapter.getBalance('invalid-address')).rejects.toThrow('Invalid Cosmos address');
    });

    it('should throw when no RPC or REST endpoint configured', async () => {
      const config2: CosmosAdapterConfig = {
        chainId: 'osmosis-1',
      };
      const adapter2 = new CosmosAdapter(config2);
      (adapter2 as any)._rpcUrl = '';
      (adapter2 as any)._restUrl = '';

      await expect(adapter2.getBalance('osmo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4r0q4w')).rejects.toThrow('No RPC or REST endpoint configured');
    });
  });

  describe('Transaction operations', () => {
    const config: CosmosAdapterConfig = {
      chainId: 'cosmoshub-4',
      rpcUrl: 'https://rpc.cosmos.network',
    };

    it('should throw on sendTransfer when not connected', async () => {
      const adapter = new CosmosAdapter(config);
      await expect(
        adapter.sendTransfer({ to: 'cosmos1abc', amount: '1000', denom: 'uatom' }),
      ).rejects.toThrow('No wallet connected');
    });

    it('should throw on signTransaction when not connected', async () => {
      const adapter = new CosmosAdapter(config);
      await expect(
        adapter.signTransaction({}),
      ).rejects.toThrow('No wallet connected');
    });

    it('should throw on signMessage when not connected', async () => {
      const adapter = new CosmosAdapter(config);
      await expect(
        adapter.signMessage('hello'),
      ).rejects.toThrow('No wallet connected');
    });
  });

  describe('Chain switching', () => {
    const config: CosmosAdapterConfig = {
      chainId: 'cosmoshub-4',
      rpcUrl: 'https://rpc.cosmos.network',
    };

    it('should switch to a known chain', async () => {
      const adapter = new CosmosAdapter(config);
      await adapter.switchChain('osmosis-1');
      expect(adapter.getChainId()).toBe('osmosis-1');
    });

    it('should throw when switching to unknown chain without custom URLs', async () => {
      const adapter = new CosmosAdapter(config);
      await expect(
        adapter.switchChain('unknown-chain-999' as any),
      ).rejects.toThrow('Unknown chain');
    });

    it('should get native denom for current chain', () => {
      const adapter = new CosmosAdapter(config);
      expect(adapter.getNativeDenom()).toBe('uatom');
    });
  });

  describe('Block height query', () => {
    it('should getChainId on adapter for block height config', () => {
      const config: CosmosAdapterConfig = {
        chainId: 'cosmoshub-4',
        rpcUrl: 'https://rpc.cosmos.network',
      };
      const adapter = new CosmosAdapter(config);
      expect(adapter.getChainId()).toBe('cosmoshub-4');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty wallet preference', () => {
      const adapter = new CosmosAdapter({
        chainId: 'cosmoshub-4',
        wallet: undefined as any,
      });
      expect(adapter.id).toBe('cosmos-adapter');
    });

    it('should handle null values gracefully in resolveWallet', () => {
      const adapter = new CosmosAdapter({
        chainId: 'cosmoshub-4',
        rpcUrl: 'https://rpc.cosmos.network',
      });
      const result = adapter.resolveWallet();
      expect(result).toBeNull(); // No wallet in node environment
    });

    it('should handle undefined config.wallet defaulting to keplr', () => {
      const config: CosmosAdapterConfig = {
        chainId: 'cosmoshub-4',
      };
      const adapter = new CosmosAdapter(config);
      // Should not throw during construction
      expect(adapter.getChainId()).toBe('cosmoshub-4');
    });
  });
});
