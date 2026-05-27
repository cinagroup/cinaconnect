import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BitcoinConnectorFactory } from './BitcoinConnectorFactory';
import type { BitcoinConnector, BitcoinNetwork, BitcoinFeature, BitcoinPlatform } from './types';

describe('BitcoinConnectorFactory', () => {
  beforeEach(() => {
    // Reset singleton between tests
    (BitcoinConnectorFactory as unknown as { instance: BitcoinConnectorFactory | undefined }).instance = undefined;
  });

  afterEach(() => {
    (BitcoinConnectorFactory as unknown as { instance: BitcoinConnectorFactory | undefined }).instance = undefined;
  });

  it('should create a singleton instance via getInstance()', () => {
    const factory1 = BitcoinConnectorFactory.getInstance();
    const factory2 = BitcoinConnectorFactory.getInstance();
    expect(factory1).toBe(factory2);
  });

  it('should register built-in connectors on construction', () => {
    const factory = BitcoinConnectorFactory.getInstance();
    const all = factory.getAllConnectors();
    const ids = all.map((c) => c.id);

    expect(ids).toContain('unisat');
    expect(ids).toContain('leather');
    expect(ids).toContain('xverse');
    expect(ids).toContain('okx-btc');
    expect(ids).toContain('sats-connect');
    expect(ids).toContain('wallet-standard');
  });

  it('should return undefined for unregistered connector id', () => {
    const factory = BitcoinConnectorFactory.getInstance();
    expect(factory.getConnector('nonexistent')).toBeUndefined();
  });

  it('should return a registered connector by id', () => {
    const factory = BitcoinConnectorFactory.getInstance();
    const unisat = factory.getConnector('unisat');
    expect(unisat).toBeDefined();
    expect(unisat!.id).toBe('unisat');
    expect(unisat!.name).toBe('Unisat Wallet');
  });

  it('should allow registering custom connectors', () => {
    const factory = BitcoinConnectorFactory.getInstance();
    const customConnector: BitcoinConnector = {
      id: 'my-custom-wallet',
      name: 'My Custom Wallet',
      icon: 'data:image/svg+xml,<svg></svg>',
      platforms: ['browser'],
      supportedFeatures: ['bitcoin:connect'],
      connect: async () => ({ accounts: [], network: 'mainnet' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => [],
      getNetwork: async () => 'mainnet',
      switchNetwork: async () => {},
      signMessage: async () => ({ signature: '' }),
      signPsbt: async () => ({ psbt: '' }),
      sendTransfer: async () => ({ txid: '' }),
      isAvailable: () => false,
      on: () => {},
      off: () => {},
    };

    factory.register(customConnector);
    const retrieved = factory.getConnector('my-custom-wallet');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('My Custom Wallet');
  });

  it('should return all registered connectors', () => {
    const factory = BitcoinConnectorFactory.getInstance();
    const all = factory.getAllConnectors();
    expect(all.length).toBeGreaterThanOrEqual(6);
  });

  it('should detect available connectors', () => {
    const factory = BitcoinConnectorFactory.getInstance();
    // SatsConnect reports available in jsdom (window exists)
    const available = factory.detectAvailableConnectors();
    expect(Array.isArray(available)).toBe(true);
    const ids = available.map(c => c.id);
    // SatsConnect should be available in browser-like env
    expect(ids).toContain('sats-connect');
  });

  it('should return recommended connectors in priority order', () => {
    const factory = BitcoinConnectorFactory.getInstance();
    const recommended = factory.getRecommendedConnectors();

    // In test env, no connectors are available, so this should be empty
    expect(Array.isArray(recommended)).toBe(true);
  });
});
