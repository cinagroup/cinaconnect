import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectorFactory } from './ConnectorFactory';
import type { ConnectorConfig, ConnectionResult } from './types';

describe('ConnectorFactory', () => {
  beforeEach(() => {
    ConnectorFactory.clearAll();
  });

  afterEach(() => {
    ConnectorFactory.clearAll();
  });

  it('should start with an empty registry', () => {
    const connectors = ConnectorFactory.getAllConnectors();
    expect(connectors).toEqual([]);
  });

  it('should register a connector', () => {
    const config: ConnectorConfig = {
      id: 'test-wallet',
      name: 'Test Wallet',
      icon: 'data:image/svg+xml,<svg></svg>',
      type: 'custom',
      init: async () => {},
      connect: async () => ({ accounts: ['0x123'], chainId: '0x1' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => ['0x123'],
      getChainId: async () => '0x1',
      isAvailable: () => true,
      on: () => {},
      off: () => {},
    };

    ConnectorFactory.registerConnector(config);
    const retrieved = ConnectorFactory.getConnector('test-wallet');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('test-wallet');
    expect(retrieved!.name).toBe('Test Wallet');
  });

  it('should throw when registering a duplicate id', () => {
    const config: ConnectorConfig = {
      id: 'duplicate-wallet',
      name: 'Duplicate Wallet',
      icon: 'data:image/svg+xml,<svg></svg>',
      type: 'custom',
      init: async () => {},
      connect: async () => ({ accounts: [], chainId: '0x1' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => [],
      getChainId: async () => '0x1',
      isAvailable: () => false,
      on: () => {},
      off: () => {},
    };

    ConnectorFactory.registerConnector(config);
    expect(() => ConnectorFactory.registerConnector(config)).toThrow(
      'Connector "duplicate-wallet" is already registered'
    );
  });

  it('should return undefined for unregistered connector', () => {
    const result = ConnectorFactory.getConnector('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should return all registered connectors', () => {
    const c1: ConnectorConfig = {
      id: 'wallet-a',
      name: 'Wallet A',
      icon: '',
      type: 'custom',
      init: async () => {},
      connect: async () => ({ accounts: [], chainId: '0x1' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => [],
      getChainId: async () => '0x1',
      isAvailable: () => true,
      on: () => {},
      off: () => {},
    };

    const c2: ConnectorConfig = {
      id: 'wallet-b',
      name: 'Wallet B',
      icon: '',
      type: 'qr',
      init: async () => {},
      connect: async () => ({ accounts: [], chainId: '0x1' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => [],
      getChainId: async () => '0x1',
      isAvailable: () => true,
      on: () => {},
      off: () => {},
    };

    ConnectorFactory.registerConnector(c1);
    ConnectorFactory.registerConnector(c2);

    const all = ConnectorFactory.getAllConnectors();
    expect(all.length).toBe(2);
    const ids = all.map((c) => c.id);
    expect(ids).toContain('wallet-a');
    expect(ids).toContain('wallet-b');
  });

  it('should unregister a connector', () => {
    const config: ConnectorConfig = {
      id: 'removable-wallet',
      name: 'Removable Wallet',
      icon: '',
      type: 'custom',
      init: async () => {},
      connect: async () => ({ accounts: [], chainId: '0x1' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => [],
      getChainId: async () => '0x1',
      isAvailable: () => false,
      on: () => {},
      off: () => {},
    };

    ConnectorFactory.registerConnector(config);
    const removed = ConnectorFactory.unregisterConnector('removable-wallet');
    expect(removed).toBe(true);
    expect(ConnectorFactory.getConnector('removable-wallet')).toBeUndefined();
  });

  it('should return false when unregistering non-existent connector', () => {
    const removed = ConnectorFactory.unregisterConnector('ghost-wallet');
    expect(removed).toBe(false);
  });

  it('should clear all connectors', () => {
    const config: ConnectorConfig = {
      id: 'clear-me',
      name: 'Clear Me',
      icon: '',
      type: 'custom',
      init: async () => {},
      connect: async () => ({ accounts: [], chainId: '0x1' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => [],
      getChainId: async () => '0x1',
      isAvailable: () => false,
      on: () => {},
      off: () => {},
    };

    ConnectorFactory.registerConnector(config);
    ConnectorFactory.clearAll();
    expect(ConnectorFactory.getAllConnectors()).toEqual([]);
  });
});
