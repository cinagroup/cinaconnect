/**
 * Tests for @cinacoin/custom-connectors — connector implementations and types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectorFactory } from '../ConnectorFactory.js';
import { InjectedConnector } from '../connectors/injected.js';
import { QRConnector } from '../connectors/qr.js';
import { WalletConnectConnector } from '../connectors/walletconnect.js';
import type { ConnectorConfig, ConnectionResult, ConnectorEvents } from '../types.js';

describe('InjectedConnector', () => {
  it('should have correct metadata', () => {
    const connector = new InjectedConnector();
    expect(connector.id).toBe('injected');
    expect(connector.name).toBe('Injected Wallet');
    expect(connector.type).toBe('injected');
    expect(connector.icon).toContain('data:image/svg+xml');
  });

  it('should return false for isAvailable in node environment', () => {
    const connector = new InjectedConnector();
    expect(connector.isAvailable()).toBe(false);
  });

  it('should throw when connecting without provider', async () => {
    const connector = new InjectedConnector();
    await expect(connector.connect()).rejects.toThrow('No injected provider found');
  });

  it('should throw when requesting without provider', async () => {
    const connector = new InjectedConnector();
    await expect(connector.request({ method: 'eth_accounts' })).rejects.toThrow('No injected provider found');
  });

  it('should throw when getting accounts without provider', async () => {
    const connector = new InjectedConnector();
    await expect(connector.getAccounts()).rejects.toThrow('No injected provider found');
  });

  it('should throw when getting chainId without provider', async () => {
    const connector = new InjectedConnector();
    await expect(connector.getChainId()).rejects.toThrow('No injected provider found');
  });

  it('should initialize without error in node environment', async () => {
    const connector = new InjectedConnector();
    await expect(connector.init()).resolves.not.toThrow();
  });

  it('should register and unregister event handlers', () => {
    const connector = new InjectedConnector();
    const handler = vi.fn();
    connector.on('accountsChanged', handler);
    connector.off('accountsChanged', handler);
  });

  it('should have disconnect method', async () => {
    const connector = new InjectedConnector();
    await expect(connector.disconnect()).resolves.not.toThrow();
  });
});

describe('QRConnector', () => {
  it('should have correct metadata', () => {
    const connector = new QRConnector();
    expect(connector.id).toBe('qr');
    expect(connector.name).toBe('Scan QR Code');
    expect(connector.type).toBe('qr');
    expect(connector.icon).toContain('data:image/svg+xml');
  });

  it('should implement ConnectorConfig interface', () => {
    const connector = new QRConnector();
    expect(typeof connector.init).toBe('function');
    expect(typeof connector.connect).toBe('function');
    expect(typeof connector.disconnect).toBe('function');
    expect(typeof connector.request).toBe('function');
    expect(typeof connector.getAccounts).toBe('function');
    expect(typeof connector.getChainId).toBe('function');
    expect(typeof connector.isAvailable).toBe('function');
    expect(typeof connector.on).toBe('function');
    expect(typeof connector.off).toBe('function');
  });

  it('should throw when connecting without session', async () => {
    const connector = new QRConnector();
    await expect(connector.connect()).rejects.toThrow();
  });
});

describe('WalletConnectConnector', () => {
  it('should have correct metadata', () => {
    const connector = new WalletConnectConnector();
    expect(connector.id).toBe('walletconnect');
    expect(connector.name).toBe('WalletConnect');
    expect(connector.type).toBe('walletconnect');
    expect(connector.icon).toContain('data:image/svg+xml');
  });

  it('should implement ConnectorConfig interface', () => {
    const connector = new WalletConnectConnector();
    expect(typeof connector.init).toBe('function');
    expect(typeof connector.connect).toBe('function');
    expect(typeof connector.disconnect).toBe('function');
    expect(typeof connector.request).toBe('function');
    expect(typeof connector.getAccounts).toBe('function');
    expect(typeof connector.getChainId).toBe('function');
    expect(typeof connector.isAvailable).toBe('function');
    expect(typeof connector.on).toBe('function');
    expect(typeof connector.off).toBe('function');
  });

  it('should throw when connecting without session', async () => {
    const connector = new WalletConnectConnector();
    await expect(connector.connect()).rejects.toThrow();
  });
});

describe('ConnectorConfig type contracts', () => {
  it('should allow creating a custom connector implementation', () => {
    const custom: ConnectorConfig = {
      id: 'custom-test',
      name: 'Custom Test',
      icon: 'data:image/png;base64,test',
      type: 'custom',
      init: async () => {},
      connect: async () => ({ accounts: ['0xabc'], chainId: '0x1' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => ['0xabc'],
      getChainId: async () => '0x1',
      isAvailable: () => true,
      on: () => {},
      off: () => {},
    };

    expect(custom.id).toBe('custom-test');
    expect(custom.type).toBe('custom');
  });

  it('should support all connector types', () => {
    const types: Array<ConnectorConfig['type']> = ['injected', 'qr', 'walletconnect', 'custom'];
    expect(types).toHaveLength(4);
  });

  it('ConnectionResult should have required fields', () => {
    const result: ConnectionResult = {
      accounts: ['0x1234', '0x5678'],
      chainId: '0x1',
    };
    expect(result.accounts).toHaveLength(2);
    expect(result.chainId).toBe('0x1');
  });

  it('ConnectorEvents should have standard events', () => {
    const events: (keyof ConnectorEvents)[] = [
      'accountsChanged',
      'chainChanged',
      'disconnect',
      'stateChange',
    ];
    expect(events).toHaveLength(4);
  });
});

describe('ConnectorFactory integration with connectors', () => {
  beforeEach(() => {
    ConnectorFactory.clearAll();
  });

  it('should register InjectedConnector', () => {
    const connector = new InjectedConnector();
    ConnectorFactory.registerConnector(connector);
    const retrieved = ConnectorFactory.getConnector('injected');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Injected Wallet');
  });

  it('should register QRConnector', () => {
    const connector = new QRConnector();
    ConnectorFactory.registerConnector(connector);
    const retrieved = ConnectorFactory.getConnector('qr');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Scan QR Code');
  });

  it('should register WalletConnectConnector', () => {
    const connector = new WalletConnectConnector();
    ConnectorFactory.registerConnector(connector);
    const retrieved = ConnectorFactory.getConnector('walletconnect');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('WalletConnect');
  });

  it('should list all registered connectors', () => {
    ConnectorFactory.registerConnector(new InjectedConnector());
    ConnectorFactory.registerConnector(new QRConnector());
    const all = ConnectorFactory.getAllConnectors();
    const ids = all.map(c => c.id);
    expect(ids).toContain('injected');
    expect(ids).toContain('qr');
  });

  it('should prevent duplicate registration', () => {
    ConnectorFactory.registerConnector(new InjectedConnector());
    expect(() => ConnectorFactory.registerConnector(new InjectedConnector())).toThrow('already registered');
  });

  it('should unregister connectors', () => {
    ConnectorFactory.registerConnector(new InjectedConnector());
    const removed = ConnectorFactory.unregisterConnector('injected');
    expect(removed).toBe(true);
    expect(ConnectorFactory.getConnector('injected')).toBeUndefined();
  });
});
