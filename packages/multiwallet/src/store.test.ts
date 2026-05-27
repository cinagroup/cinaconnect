import { describe, it, expect, beforeEach } from 'vitest';
import { MultiwalletStore } from './store';

describe('MultiwalletStore', () => {
  let store: MultiwalletStore;

  beforeEach(() => {
    store = new MultiwalletStore();
  });

  it('creates with empty connections for all 3 namespaces', () => {
    const state = store.getState();
    expect(state.connections.eip155).toEqual([]);
    expect(state.connections.solana).toEqual([]);
    expect(state.connections.bip122).toEqual([]);
  });

  it('starts at version 0', () => {
    expect(store.getState().version).toBe(0);
  });

  /* ── addConnection ────────────────────────────────────────────── */

  it('adds a connection and returns a record', () => {
    const record = store.addConnection(
      'metamask',
      'MetaMask',
      'eip155',
      '0xabc',
      {},
      null,
    );
    expect(record.walletId).toBe('metamask');
    expect(record.isActive).toBe(true);
    expect(record.connectedAt).toBeInstanceOf(Date);
  });

  it('first connection in a namespace is automatically active', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    const active = store.getActiveConnection('eip155');
    expect(active?.walletId).toBe('metamask');
    expect(active?.isActive).toBe(true);
  });

  it('prevents duplicate walletId in same namespace by updating in place', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    const updated = store.addConnection('metamask', 'MetaMask', 'eip155', '0xdef', {}, null);
    expect(updated.address).toBe('0xdef');

    const connections = store.getConnections();
    expect(connections.eip155).toHaveLength(1);
  });

  it('increments version on addConnection', () => {
    expect(store.getState().version).toBe(0);
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    expect(store.getState().version).toBe(1);
  });

  it('stores multiple connections in different namespaces', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    store.addConnection('phantom', 'Phantom', 'solana', 'sol123', {}, null);
    store.addConnection('uniswap', 'Uniswap Wallet', 'eip155', '0xdef', {}, null);

    const connections = store.getConnections();
    expect(connections.eip155).toHaveLength(2);
    expect(connections.solana).toHaveLength(1);
    expect(connections.bip122).toHaveLength(0);
  });

  /* ── removeConnection ─────────────────────────────────────────── */

  it('removes a connection by walletId and namespace', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    const removed = store.removeConnection('metamask', 'eip155');
    expect(removed).toBe(true);
    expect(store.getConnections().eip155).toEqual([]);
  });

  it('returns false when removing non-existent connection', () => {
    const removed = store.removeConnection('nonexistent', 'eip155');
    expect(removed).toBe(false);
  });

  it('promotes next connection to active when active is removed', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    store.addConnection('walletconnect', 'WalletConnect', 'eip155', '0xdef', {}, null);

    // First is active
    expect(store.getActiveConnection('eip155')?.walletId).toBe('metamask');

    // Remove the active one
    store.removeConnection('metamask', 'eip155');

    // Second should now be active
    expect(store.getActiveConnection('eip155')?.walletId).toBe('walletconnect');
    expect(store.getActiveConnection('eip155')?.isActive).toBe(true);
  });

  /* ── setActiveConnection ──────────────────────────────────────── */

  it('activates a specific wallet in a namespace', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    store.addConnection('walletconnect', 'WalletConnect', 'eip155', '0xdef', {}, null);

    const activated = store.setActiveConnection('walletconnect', 'eip155');
    expect(activated?.walletId).toBe('walletconnect');

    const active = store.getActiveConnection('eip155');
    expect(active?.walletId).toBe('walletconnect');
  });

  it('returns null when wallet not found', () => {
    const result = store.setActiveConnection('nonexistent', 'eip155');
    expect(result).toBeNull();
  });

  it('deactivates previous active connection when switching', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    store.addConnection('walletconnect', 'WalletConnect', 'eip155', '0xdef', {}, null);

    store.setActiveConnection('walletconnect', 'eip155');

    const connections = store.getConnections();
    const metamask = connections.eip155.find(r => r.walletId === 'metamask');
    expect(metamask?.isActive).toBe(false);
  });

  /* ── swapConnection ───────────────────────────────────────────── */

  it('swaps active connection from one wallet to another', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    store.addConnection('walletconnect', 'WalletConnect', 'eip155', '0xdef', {}, null);

    const swapped = store.swapConnection('eip155', 'metamask', 'walletconnect');
    expect(swapped).toBe(true);
    expect(store.getActiveConnection('eip155')?.walletId).toBe('walletconnect');
  });

  it('returns false when from wallet is not active', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    store.addConnection('walletconnect', 'WalletConnect', 'eip155', '0xdef', {}, null);

    // walletconnect is NOT active (metamask is)
    const swapped = store.swapConnection('eip155', 'walletconnect', 'metamask');
    expect(swapped).toBe(false);
    expect(store.getActiveConnection('eip155')?.walletId).toBe('metamask');
  });

  it('returns false when from wallet does not exist', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    const swapped = store.swapConnection('eip155', 'nonexistent', 'metamask');
    expect(swapped).toBe(false);
  });

  it('returns false when to wallet does not exist', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    const swapped = store.swapConnection('eip155', 'metamask', 'nonexistent');
    expect(swapped).toBe(false);
  });

  /* ── subscribe / bump ─────────────────────────────────────────── */

  it('subscribes and fires on state changes', () => {
    const listener = vi.fn();
    store.subscribe(listener);

    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    expect(listener).toHaveBeenCalledTimes(1);

    store.removeConnection('metamask', 'eip155');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe stops receiving notifications', () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    store.addConnection('walletconnect', 'WalletConnect', 'eip155', '0xdef', {}, null);
    expect(listener).toHaveBeenCalledTimes(1); // Still 1
  });

  /* ── analyzeConnections ───────────────────────────────────────── */

  it('returns analytics summary', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    store.addConnection('phantom', 'Phantom', 'solana', 'sol123', {}, null);

    const analytics = store.analyzeConnections();
    expect(analytics.totalConnections).toBe(2);
    expect(analytics.walletsByNamespace.eip155).toBe(1);
    expect(analytics.walletsByNamespace.solana).toBe(1);
    expect(analytics.lastConnected).toBeInstanceOf(Date);
  });

  it('identifies most used wallet', () => {
    // "Most used" here means the wallet that appears most in connection records
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xdef', {}, null); // update, not new

    const analytics = store.analyzeConnections();
    expect(analytics.mostUsedWallet).toBe('metamask:eip155');
  });

  it('returns empty analysis when no connections', () => {
    const analytics = store.analyzeConnections();
    expect(analytics.totalConnections).toBe(0);
    expect(analytics.mostUsedWallet).toBeNull();
    expect(analytics.lastConnected).toBeNull();
  });

  /* ── getState ─────────────────────────────────────────────────── */

  it('returns full state with connections and activeConnections', () => {
    store.addConnection('metamask', 'MetaMask', 'eip155', '0xabc', {}, null);
    const state = store.getState();

    expect(state.connections).toHaveProperty('eip155');
    expect(state.connections).toHaveProperty('solana');
    expect(state.connections).toHaveProperty('bip122');
    expect(state.activeConnections).toHaveProperty('eip155');
    expect(state.activeConnections.eip155?.walletId).toBe('metamask');
  });
});
