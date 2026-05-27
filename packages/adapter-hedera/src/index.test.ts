import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HederaAdapter, announceHederaProviders } from './index.js';
import type { HederaConnector, HederaNetwork, HederaConnectionResult } from './types.js';

// Mock window for SSR-safe connector checks
vi.stubGlobal('window', undefined);

describe('@cinacoin/adapter-hedera', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Package exports', () => {
    it('should export HederaAdapter class', () => {
      expect(HederaAdapter).toBeDefined();
      expect(typeof HederaAdapter).toBe('function');
    });

    it('should export announceHederaProviders function', () => {
      expect(announceHederaProviders).toBeDefined();
      expect(typeof announceHederaProviders).toBe('function');
    });
  });

  describe('HederaAdapter instantiation', () => {
    it('should instantiate without arguments', () => {
      const adapter = new HederaAdapter();
      expect(adapter).toBeInstanceOf(HederaAdapter);
      expect(adapter.id).toBe('hedera');
      expect(adapter.name).toBe('Hedera Hashgraph');
    });

    it('should register built-in connectors on construction', () => {
      const adapter = new HederaAdapter();
      const connectors = adapter.getAllConnectors();
      expect(connectors.length).toBeGreaterThanOrEqual(3); // hashpack, blade, kantara
    });

    it('should have correct platform support', () => {
      const adapter = new HederaAdapter();
      expect(adapter.platforms).toContain('browser');
      expect(adapter.platforms).toContain('mobile');
      expect(adapter.platforms).toContain('extension');
    });

    it('should have an icon defined', () => {
      const adapter = new HederaAdapter();
      expect(adapter.icon).toBeDefined();
      expect(typeof adapter.icon).toBe('string');
    });
  });

  describe('Connector registry', () => {
    it('should return undefined for unknown connector id', () => {
      const adapter = new HederaAdapter();
      const connector = adapter.getConnector('unknown');
      expect(connector).toBeUndefined();
    });

    it('should get all registered connectors', () => {
      const adapter = new HederaAdapter();
      const all = adapter.getAllConnectors();
      expect(all.length).toBeGreaterThanOrEqual(3);
      expect(all.every(c => typeof c.id === 'string')).toBe(true);
    });

    it('should register a custom connector', () => {
      const adapter = new HederaAdapter();
      const customConnector: HederaConnector = {
        id: 'custom',
        name: 'Custom Wallet',
        icon: 'icon.svg',
        platforms: ['browser'],
        supportedFeatures: ['hedera:connect'],
        connect: vi.fn().mockResolvedValue({ accounts: ['0.0.99999'], network: 'testnet' }),
        disconnect: vi.fn().mockResolvedValue(undefined),
        request: vi.fn(),
        getAccounts: vi.fn().mockResolvedValue(['0.0.99999']),
        getNetwork: vi.fn().mockResolvedValue('testnet'),
        switchNetwork: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true),
        signTransaction: vi.fn(),
        executeTransaction: vi.fn(),
        getBalance: vi.fn(),
        transferHbar: vi.fn(),
        transferToken: vi.fn(),
        contractCall: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };
      adapter.registerConnector(customConnector);
      const found = adapter.getConnector('custom');
      expect(found).toBe(customConnector);
    });
  });

  describe('Connect & Disconnect', () => {
    it('should throw when no wallet available for auto-connect', async () => {
      const adapter = new HederaAdapter();
      await expect(adapter.connect()).rejects.toThrow('No Hedera wallet found');
    });

    it('should throw when specified connector not found', async () => {
      const adapter = new HederaAdapter();
      await expect(
        adapter.connect({ connectorId: 'nonexistent' }),
      ).rejects.toThrow('Connector "nonexistent" not found');
    });

    it('should disconnect without error when not connected', async () => {
      const adapter = new HederaAdapter();
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should connect with a mocked connector', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        accounts: ['0.0.12345'],
        network: 'testnet' as HederaNetwork,
      });
      const mockConnector: HederaConnector = {
        id: 'mocked',
        name: 'Mocked',
        icon: 'icon.svg',
        platforms: ['browser'],
        supportedFeatures: ['hedera:connect'],
        connect: mockConnect,
        disconnect: vi.fn().mockResolvedValue(undefined),
        request: vi.fn(),
        getAccounts: vi.fn().mockResolvedValue(['0.0.12345']),
        getNetwork: vi.fn().mockResolvedValue('testnet'),
        switchNetwork: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true),
        signTransaction: vi.fn(),
        executeTransaction: vi.fn(),
        getBalance: vi.fn(),
        transferHbar: vi.fn(),
        transferToken: vi.fn(),
        contractCall: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };

      const adapter = new HederaAdapter();
      adapter.registerConnector(mockConnector);

      const result = await adapter.connect({ connectorId: 'mocked' });
      expect(result.accounts).toEqual(['0.0.12345']);
      expect(result.network).toBe('testnet');
    });
  });

  describe('Core operations (require connection)', () => {
    const adapter = new HederaAdapter();

    it('should throw on getAccounts when not connected', async () => {
      await expect(adapter.getAccounts()).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on getNetwork when not connected', async () => {
      await expect(adapter.getNetwork()).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on switchNetwork when not connected', async () => {
      await expect(adapter.switchNetwork('mainnet')).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on signTransaction when not connected', async () => {
      await expect(
        adapter.signTransaction({ transaction: 'abc' }),
      ).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on executeTransaction when not connected', async () => {
      await expect(
        adapter.executeTransaction({ transaction: 'abc' }),
      ).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on getBalance when not connected', async () => {
      await expect(adapter.getBalance()).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on transferHbar when not connected', async () => {
      await expect(
        adapter.transferHbar({ recipient: '0.0.12345', amount: '1000000' }),
      ).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on transferToken when not connected', async () => {
      await expect(
        adapter.transferToken({ tokenId: '0.0.999', recipient: '0.0.12345', amount: '1000' }),
      ).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on contractCall when not connected', async () => {
      await expect(
        adapter.contractCall({ contractId: '0.0.789', functionParameters: '0x' }),
      ).rejects.toThrow('No Hedera wallet connected');
    });

    it('should throw on request when not connected', async () => {
      await expect(
        adapter.request({ method: 'test' }),
      ).rejects.toThrow('No Hedera wallet connected');
    });
  });

  describe('Supported features', () => {
    it('should return default features when no connector active', () => {
      const adapter = new HederaAdapter();
      const features = adapter.supportedFeatures;
      expect(features).toContain('hedera:connect');
      expect(features).toContain('hedera:transferHbar');
    });

    it('should detect available connectors', () => {
      const adapter = new HederaAdapter();
      const available = adapter.detectAvailableConnectors();
      // In Node.js without wallet extensions, should be empty
      expect(Array.isArray(available)).toBe(true);
    });

    it('should get recommended connectors', () => {
      const adapter = new HederaAdapter();
      const recommended = adapter.getRecommendedConnectors();
      expect(Array.isArray(recommended)).toBe(true);
    });
  });

  describe('Event handling', () => {
    it('should register and unregister event handlers', () => {
      const adapter = new HederaAdapter();
      const handler = vi.fn();
      adapter.on('accountsChanged', handler);
      adapter.off('accountsChanged', handler);
      // No error expected
    });

    it('should handle disconnect event', () => {
      const adapter = new HederaAdapter();
      const handler = vi.fn();
      adapter.on('disconnect', handler);
      adapter.off('disconnect', handler);
    });
  });

  describe('Edge cases', () => {
    it('should handle isAvailable returning false in Node.js', () => {
      const adapter = new HederaAdapter();
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should handle setConnector without error', () => {
      const adapter = new HederaAdapter();
      expect(() => adapter.setConnector({} as any)).not.toThrow();
    });

    it('should return empty recommended connectors when none available', () => {
      const adapter = new HederaAdapter();
      const recommended = adapter.getRecommendedConnectors();
      expect(recommended).toEqual([]);
    });
  });
});
