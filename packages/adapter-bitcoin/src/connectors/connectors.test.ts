/**
 * Tests for @cinacoin/adapter-bitcoin — connector types and utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnisatConnector } from './unisat';
import { LeatherConnector } from './leather';
import { OKXBitcoinConnector } from './okx';
import { SatsConnectConnector } from './sats-connect';
import { WalletStandardConnector } from './wallet-standard';
import { XverseConnector } from './xverse';
import { announceUnisatEIP6963 } from './unisat';

describe('UnisatConnector', () => {
  it('should have correct connector metadata', () => {
    const connector = new UnisatConnector();
    expect(connector.id).toBe('unisat');
    expect(connector.name).toBe('Unisat Wallet');
    expect(connector.platforms).toContain('browser');
    expect(connector.platforms).toContain('extension');
    expect(connector.supportedFeatures).toContain('bitcoin:connect');
    expect(connector.supportedFeatures).toContain('bitcoin:signPsbt');
    expect(connector.supportedFeatures).toContain('bitcoin:sendBitcoin');
  });

  it('should return false for isAvailable when no window.unisat', () => {
    const connector = new UnisatConnector();
    expect(connector.isAvailable()).toBe(false);
  });

  it('should throw error when connecting without provider', async () => {
    const connector = new UnisatConnector();
    await expect(connector.connect()).rejects.toThrow('Unisat Wallet not found');
  });

  it('should throw error on request without provider', async () => {
    const connector = new UnisatConnector();
    await expect(connector.request({ method: 'wallet_getAccounts' })).rejects.toThrow('Unisat Wallet not found');
  });

  it('should throw error on signMessage without provider', async () => {
    const connector = new UnisatConnector();
    await expect(connector.signMessage({ message: 'test', address: 'bc1qtest' })).rejects.toThrow('Unisat Wallet not found');
  });

  it('should throw error on signPsbt without provider', async () => {
    const connector = new UnisatConnector();
    await expect(connector.signPsbt({ psbt: 'base64psbt' })).rejects.toThrow('Unisat Wallet not found');
  });

  it('should throw error on sendTransfer without provider', async () => {
    const connector = new UnisatConnector();
    await expect(connector.sendTransfer({ recipient: 'bc1qtest', amount: 1000 })).rejects.toThrow('Unisat Wallet not found');
  });

  it('should have icon as data URI', () => {
    const connector = new UnisatConnector();
    expect(connector.icon).toMatch(/^data:image\/svg\+/);
  });

  it('should register and unregister event handlers', () => {
    const connector = new UnisatConnector();
    const handler = vi.fn();
    connector.on('accountsChanged', handler);
    connector.off('accountsChanged', handler);
    // No error means success
  });
});

describe('LeatherConnector', () => {
  it('should have correct connector metadata', () => {
    const connector = new LeatherConnector();
    expect(connector.id).toBe('leather');
    expect(connector.name).toBe('Leather Wallet');
    expect(connector.platforms).toContain('browser');
    expect(connector.supportedFeatures).toContain('bitcoin:connect');
  });

  it('should return false for isAvailable when no provider', () => {
    const connector = new LeatherConnector();
    expect(connector.isAvailable()).toBe(false);
  });

  it('should throw error when connecting without provider', async () => {
    const connector = new LeatherConnector();
    await expect(connector.connect()).rejects.toThrow('Leather');
  });

  it('should have icon as data URI', () => {
    const connector = new LeatherConnector();
    expect(connector.icon).toMatch(/^data:image\/svg\+/);
  });
});

describe('OKXBitcoinConnector', () => {
  it('should have correct connector metadata', () => {
    const connector = new OKXBitcoinConnector();
    expect(connector.id).toBe('okx-btc');
    expect(connector.name).toBe('OKX Wallet (Bitcoin)');
    expect(connector.platforms).toContain('browser');
  });

  it('should return false for isAvailable when no provider', () => {
    const connector = new OKXBitcoinConnector();
    expect(connector.isAvailable()).toBe(false);
  });

  it('should throw error when connecting without provider', async () => {
    const connector = new OKXBitcoinConnector();
    await expect(connector.connect()).rejects.toThrow('OKX');
  });

  it('should have icon as data URI', () => {
    const connector = new OKXBitcoinConnector();
    expect(connector.icon).toMatch(/^data:image\/svg\+/);
  });
});

describe('SatsConnectConnector', () => {
  it('should have correct connector metadata', () => {
    const connector = new SatsConnectConnector();
    expect(connector.id).toBe('sats-connect');
    expect(connector.name).toBe('SatsConnect');
  });

  it('should return true for isAvailable in browser (jsdom has window)', () => {
    const connector = new SatsConnectConnector();
    // SatsConnect considers itself available whenever window exists
    expect(connector.isAvailable()).toBe(true);
  });

  it('should throw error when connecting without provider', async () => {
    const connector = new SatsConnectConnector();
    await expect(connector.connect()).rejects.toThrow();
  });

  it('should have icon as data URI', () => {
    const connector = new SatsConnectConnector();
    expect(connector.icon).toMatch(/^data:image\/svg\+/);
  });
});

describe('WalletStandardConnector', () => {
  it('should have correct connector metadata', () => {
    const connector = new WalletStandardConnector();
    expect(connector.id).toBe('wallet-standard');
    expect(connector.name).toBe('Wallet Standard');
  });

  it('should return false for isAvailable when no provider', () => {
    const connector = new WalletStandardConnector();
    expect(connector.isAvailable()).toBe(false);
  });

  it('should throw error when connecting without provider', async () => {
    const connector = new WalletStandardConnector();
    await expect(connector.connect()).rejects.toThrow();
  });
});

describe('XverseConnector', () => {
  it('should have correct connector metadata', () => {
    const connector = new XverseConnector();
    expect(connector.id).toBe('xverse');
    expect(connector.name).toBe('Xverse Wallet');
    expect(connector.platforms).toContain('browser');
    expect(connector.supportedFeatures).toContain('bitcoin:connect');
  });

  it('should return false for isAvailable when no provider', () => {
    const connector = new XverseConnector();
    expect(connector.isAvailable()).toBe(false);
  });

  it('should throw error when connecting without provider', async () => {
    const connector = new XverseConnector();
    await expect(connector.connect()).rejects.toThrow('Xverse');
  });

  it('should have icon as data URI', () => {
    const connector = new XverseConnector();
    expect(connector.icon).toMatch(/^data:image\/svg\+/);
  });
});

describe('announceUnisatEIP6963', () => {
  it('should not throw in server environment (no window)', () => {
    expect(() => announceUnisatEIP6963()).not.toThrow();
  });
});
