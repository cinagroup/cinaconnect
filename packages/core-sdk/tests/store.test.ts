/**
 * Tests for Zustand store state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCinacoinStore, initializeStore } from '../src/store.js';

describe('createCinacoinStore', () => {
  it('should initialize with disconnected status', () => {
    const store = createCinacoinStore();
    const state = store.getState();
    expect(state.status).toBe('disconnected');
    expect(state.accounts).toEqual([]);
    expect(state.chainId).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.connectorId).toBeNull();
    expect(state.error).toBeNull();
  });

  it('should set connection state', () => {
    const store = createCinacoinStore();
    store.getState().setConnection({
      accounts: ['0xabc'],
      chainId: 1,
      sessionId: 'session-1',
      connectorId: 'mock',
    });
    const state = store.getState();
    expect(state.status).toBe('connected');
    expect(state.accounts).toEqual(['0xabc']);
    expect(state.chainId).toBe(1);
    expect(state.sessionId).toBe('session-1');
    expect(state.connectorId).toBe('mock');
    expect(state.error).toBeNull();
  });

  it('should set error state', () => {
    const store = createCinacoinStore();
    const err = new Error('Test error');
    store.getState().setError(err);
    const state = store.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe(err);
  });

  it('should set status and clear error', () => {
    const store = createCinacoinStore();
    store.getState().setError(new Error('Test'));
    store.getState().setStatus('disconnected');
    const state = store.getState();
    expect(state.status).toBe('disconnected');
    expect(state.error).toBeNull();
  });

  it('should set and retrieve chains', () => {
    const store = createCinacoinStore();
    const chains = [
      { id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' },
      { id: '137', name: 'Polygon', rpcUrl: 'https://polygon.rpc' },
    ];
    store.getState().setChains(chains);
    expect(store.getState().chains).toEqual(chains);
  });

  it('should set active chain', () => {
    const store = createCinacoinStore();
    const chain = { id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' };
    store.getState().setActiveChain(chain);
    expect(store.getState().activeChain).toEqual(chain);
  });

  it('should add pairings and set active pairing', () => {
    const store = createCinacoinStore();
    const pairing = {
      topic: 'topic-1',
      uri: 'wc:uri',
      active: true,
      expiry: Date.now() + 3600000,
    };
    store.getState().addPairing(pairing);
    const state = store.getState();
    expect(state.pairings).toHaveLength(1);
    expect(state.activePairing).toEqual(pairing);
  });

  it('should set relay URL and project ID', () => {
    const store = createCinacoinStore();
    store.getState().setRelayUrl('wss://relay.example.com');
    store.getState().setProjectId('project-123');
    const state = store.getState();
    expect(state.relayUrl).toBe('wss://relay.example.com');
    expect(state.projectId).toBe('project-123');
  });

  it('should disconnect and reset all fields', () => {
    const store = createCinacoinStore();
    // Set some state
    store.getState().setConnection({
      accounts: ['0xabc'],
      chainId: 1,
      sessionId: 's1',
      connectorId: 'mock',
    });
    store.getState().setActivePairing({
      topic: 't1',
      uri: 'wc:uri',
      active: true,
      expiry: Date.now() + 3600000,
    });

    store.getState().disconnect();
    const state = store.getState();
    expect(state.status).toBe('disconnected');
    expect(state.accounts).toEqual([]);
    expect(state.chainId).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.connectorId).toBeNull();
    expect(state.activePairing).toBeNull();
  });
});

describe('initializeStore', () => {
  it('should create store with config values', () => {
    const store = initializeStore({
      relayUrl: 'wss://relay.example.com',
      projectId: 'proj-123',
      chains: [{ id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' }],
    });

    const state = store.getState();
    expect(state.relayUrl).toBe('wss://relay.example.com');
    expect(state.projectId).toBe('proj-123');
    expect(state.chains).toHaveLength(1);
    expect(state.chains[0].name).toBe('Ethereum');
  });

  it('should start with disconnected status after initialization', () => {
    const store = initializeStore({
      relayUrl: 'wss://relay.example.com',
      projectId: 'proj-123',
      chains: [],
    });
    expect(store.getState().status).toBe('disconnected');
  });
});
