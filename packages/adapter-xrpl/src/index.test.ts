import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XrplAdapter, announceXrplProviders } from './index.js';
import type { XrplConnector, XrplNetwork, XrplConnectionResult } from './types.js';

// Mock window for SSR-safe connector checks
vi.stubGlobal('window', undefined);

describe('@cinacoin/adapter-xrpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Package exports', () => {
    it('should export XrplAdapter class', () => {
      expect(XrplAdapter).toBeDefined();
      expect(typeof XrplAdapter).toBe('function');
    });

    it('should export announceXrplProviders function', () => {
      expect(announceXrplProviders).toBeDefined();
      expect(typeof announceXrplProviders).toBe('function');
    });
  });

  describe('XrplAdapter instantiation', () => {
    it('should instantiate without arguments', () => {
      const adapter = new XrplAdapter();
      expect(adapter).toBeInstanceOf(XrplAdapter);
      expect(adapter.id).toBe('xrpl');
      expect(adapter.name).toBe('XRP Ledger');
    });

    it('should register built-in connectors on construction', () => {
      const adapter = new XrplAdapter();
      const connectors = adapter.getAllConnectors();
      expect(connectors.length).toBeGreaterThanOrEqual(1); // xaman
    });

    it('should have correct platform support', () => {
      const adapter = new XrplAdapter();
      expect(adapter.platforms).toContain('browser');
      expect(adapter.platforms).toContain('mobile');
      expect(adapter.platforms).toContain('extension');
      expect(adapter.platforms).toContain('hardware');
    });

    it('should have an icon defined', () => {
      const adapter = new XrplAdapter();
      expect(adapter.icon).toBeDefined();
      expect(typeof adapter.icon).toBe('string');
    });
  });

  describe('Connector registry', () => {
    it('should return undefined for unknown connector id', () => {
      const adapter = new XrplAdapter();
      const connector = adapter.getConnector('unknown');
      expect(connector).toBeUndefined();
    });

    it('should get all registered connectors', () => {
      const adapter = new XrplAdapter();
      const all = adapter.getAllConnectors();
      expect(all.length).toBeGreaterThanOrEqual(1);
      expect(all.every(c => typeof c.id === 'string')).toBe(true);
    });

    it('should register a custom connector', () => {
      const adapter = new XrplAdapter();
      const mockConnector: XrplConnector = {
        id: 'custom',
        name: 'Custom XRPL Wallet',
        icon: 'icon.svg',
        platforms: ['browser'],
        supportedFeatures: ['xrpl:connect'],
        connect: vi.fn().mockResolvedValue({ accounts: ['rCustomWallet'], network: 'mainnet' }),
        disconnect: vi.fn().mockResolvedValue(undefined),
        request: vi.fn(),
        getAccounts: vi.fn().mockResolvedValue(['rCustomWallet']),
        getNetwork: vi.fn().mockResolvedValue('mainnet'),
        switchNetwork: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true),
        signTransaction: vi.fn(),
        sendXRP: vi.fn(),
        getBalance: vi.fn(),
        updateAccountSettings: vi.fn(),
        setTrustLine: vi.fn(),
        mintNFT: vi.fn(),
        burnNFT: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };
      adapter.registerConnector(mockConnector);
      const found = adapter.getConnector('custom');
      expect(found).toBe(mockConnector);
    });
  });

  describe('Connect & Disconnect', () => {
    it('should throw when no wallet available for auto-connect', async () => {
      const adapter = new XrplAdapter();
      await expect(adapter.connect()).rejects.toThrow('No XRPL wallet found');
    });

    it('should throw when specified connector not found', async () => {
      const adapter = new XrplAdapter();
      await expect(
        adapter.connect({ connectorId: 'nonexistent' }),
      ).rejects.toThrow('Connector "nonexistent" not found');
    });

    it('should disconnect without error when not connected', async () => {
      const adapter = new XrplAdapter();
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should connect with a mocked connector', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        accounts: ['rTestAddress'],
        network: 'testnet' as XrplNetwork,
      });
      const mockConnector: XrplConnector = {
        id: 'mocked',
        name: 'Mocked XRPL',
        icon: 'icon.svg',
        platforms: ['browser'],
        supportedFeatures: ['xrpl:connect'],
        connect: mockConnect,
        disconnect: vi.fn().mockResolvedValue(undefined),
        request: vi.fn(),
        getAccounts: vi.fn().mockResolvedValue(['rTestAddress']),
        getNetwork: vi.fn().mockResolvedValue('testnet'),
        switchNetwork: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true),
        signTransaction: vi.fn(),
        sendXRP: vi.fn(),
        getBalance: vi.fn(),
        updateAccountSettings: vi.fn(),
        setTrustLine: vi.fn(),
        mintNFT: vi.fn(),
        burnNFT: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };

      const adapter = new XrplAdapter();
      adapter.registerConnector(mockConnector);

      const result = await adapter.connect({ connectorId: 'mocked' });
      expect(result.accounts).toEqual(['rTestAddress']);
      expect(result.network).toBe('testnet');
    });
  });

  describe('Core operations (require connection)', () => {
    const adapter = new XrplAdapter();

    it('should throw on getAccounts when not connected', async () => {
      await expect(adapter.getAccounts()).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on getNetwork when not connected', async () => {
      await expect(adapter.getNetwork()).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on switchNetwork when not connected', async () => {
      await expect(adapter.switchNetwork('mainnet')).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on signTransaction when not connected', async () => {
      await expect(
        adapter.signTransaction({ transaction: {} }),
      ).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on sendXRP when not connected', async () => {
      await expect(
        adapter.sendXRP({ destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDH', amount: '1000000' }),
      ).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on getBalance when not connected', async () => {
      await expect(adapter.getBalance()).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on updateAccountSettings when not connected', async () => {
      await expect(
        adapter.updateAccountSettings({ requireDestTag: true }),
      ).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on setTrustLine when not connected', async () => {
      await expect(
        adapter.setTrustLine({ counterparty: 'rABC', currency: 'USD', limit: '1000' }),
      ).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on mintNFT when not connected', async () => {
      await expect(
        adapter.mintNFT({ tokenTaxon: 0 }),
      ).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on burnNFT when not connected', async () => {
      await expect(
        adapter.burnNFT({ nftId: '0008000000000000' }),
      ).rejects.toThrow('No XRPL wallet connected');
    });

    it('should throw on request when not connected', async () => {
      await expect(
        adapter.request({ method: 'test' }),
      ).rejects.toThrow('No XRPL wallet connected');
    });
  });

  describe('Supported features', () => {
    it('should return default features when no connector active', () => {
      const adapter = new XrplAdapter();
      const features = adapter.supportedFeatures;
      expect(features).toContain('xrpl:connect');
      expect(features).toContain('xrpl:sendXRP');
      expect(features).toContain('xrpl:nftMint');
    });

    it('should detect available connectors', () => {
      const adapter = new XrplAdapter();
      const available = adapter.detectAvailableConnectors();
      expect(Array.isArray(available)).toBe(true);
    });

    it('should get recommended connectors', () => {
      const adapter = new XrplAdapter();
      const recommended = adapter.getRecommendedConnectors();
      expect(Array.isArray(recommended)).toBe(true);
    });
  });

  describe('Event handling', () => {
    it('should register and unregister event handlers', () => {
      const adapter = new XrplAdapter();
      const handler = vi.fn();
      adapter.on('accountsChanged', handler);
      adapter.off('accountsChanged', handler);
    });

    it('should handle disconnect event', () => {
      const adapter = new XrplAdapter();
      const handler = vi.fn();
      adapter.on('disconnect', handler);
      adapter.off('disconnect', handler);
    });
  });

  describe('Edge cases', () => {
    it('should handle isAvailable returning false in Node.js', () => {
      const adapter = new XrplAdapter();
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should handle setConnector without error', () => {
      const adapter = new XrplAdapter();
      expect(() => adapter.setConnector({} as any)).not.toThrow();
    });

    it('should return empty recommended connectors when none available', () => {
      const adapter = new XrplAdapter();
      const recommended = adapter.getRecommendedConnectors();
      expect(recommended).toEqual([]);
    });
  });
});
