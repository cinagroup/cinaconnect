import { describe, it, expect, beforeEach } from 'vitest';
import { MultiwalletManager } from './MultiwalletManager';
import type { Namespace } from './types';

describe('MultiwalletManager', () => {
  let manager: MultiwalletManager;

  beforeEach(() => {
    manager = new MultiwalletManager();
  });

  it('should create with an empty store', () => {
    const state = manager.getStore().getState();
    expect(state.connections.eip155).toEqual([]);
    expect(state.connections.solana).toEqual([]);
    expect(state.connections.bip122).toEqual([]);
    expect(state.version).toBe(0);
  });

  it('should connect a wallet', async () => {
    const record = await manager.connect('metamask', 'eip155', 'MetaMask', '0xabc');
    expect(record.walletId).toBe('metamask');
    expect(record.namespace).toBe('eip155');
    expect(record.walletName).toBe('MetaMask');
    expect(record.address).toBe('0xabc');
    expect(record.isActive).toBe(true);
  });

  it('should connect wallets in different namespaces', async () => {
    const record1 = await manager.connect('metamask', 'eip155', 'MetaMask', '0xabc');
    const record2 = await manager.connect('phantom', 'solana', 'Phantom', 'sol123');

    expect(record1.namespace).toBe('eip155');
    expect(record2.namespace).toBe('solana');
    expect(record1.isActive).toBe(true);
    expect(record2.isActive).toBe(true);
  });

  it('should disconnect a wallet', async () => {
    await manager.connect('metamask', 'eip155', 'MetaMask', '0xabc');
    const removed = manager.disconnect('metamask', 'eip155');
    expect(removed).toBe(true);

    const connections = manager.getStore().getConnections();
    expect(connections.eip155).toEqual([]);
  });

  it('should return false when disconnecting non-existent wallet', async () => {
    const removed = manager.disconnect('nonexistent', 'eip155');
    expect(removed).toBe(false);
  });

  it('should switch active wallet in a namespace', async () => {
    await manager.connect('metamask', 'eip155', 'MetaMask', '0xabc');
    await manager.connect('walletconnect', 'eip155', 'WalletConnect', '0xdef');

    const state1 = manager.getStore().getState();
    expect(state1.activeConnections.eip155?.walletId).toBe('metamask');

    const switched = manager.switchWallet('eip155', 'walletconnect');
    expect(switched).toBe(true);

    const state2 = manager.getStore().getState();
    expect(state2.activeConnections.eip155?.walletId).toBe('walletconnect');
  });

  it('should fire onConnectionAdded callback', async () => {
    const callback = vi.fn();
    manager.onConnectionAdded(callback);

    await manager.connect('metamask', 'eip155', 'MetaMask', '0xabc');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].walletId).toBe('metamask');
  });

  it('should fire onConnectionRemoved callback', async () => {
    const callback = vi.fn();
    manager.onConnectionRemoved(callback);

    await manager.connect('metamask', 'eip155', 'MetaMask', '0xabc');
    manager.disconnect('metamask', 'eip155');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].walletId).toBe('metamask');
  });

  it('should unsubscribe from callbacks', async () => {
    const callback = vi.fn();
    const unsubscribe = manager.onConnectionAdded(callback);

    await manager.connect('metamask', 'eip155', 'MetaMask', '0xabc');
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();

    await manager.connect('walletconnect', 'eip155', 'WalletConnect', '0xdef');
    expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  it('should return the underlying store', () => {
    const store = manager.getStore();
    expect(store).toBeDefined();
    expect(typeof store.getConnections).toBe('function');
    expect(typeof store.getState).toBe('function');
    expect(typeof store.addConnection).toBe('function');
  });

  it('should accept custom store instance', async () => {
    const { MultiwalletStore } = await import('./store');
    const customStore = new MultiwalletStore();
    const customManager = new MultiwalletManager(customStore);
    expect(customManager.getStore()).toBe(customStore);
  });
});
