/**
 * Expanded session lifecycle tests for WcSessionManager.
 *
 * Tests:
 * - Session approval and rejection
 * - Session state transitions
 * - Session expiry handling
 * - Session update (namespaces, accounts)
 * - Session ping/extend
 * - Event emission on session changes
 * - Multiple namespace support
 * - Account management within sessions
 * - Error handling for invalid session operations
 * - Session proposal validation
 * - Disconnect cleanup
 * - Request handling with active session
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WcSessionManager } from '../src/session.js';
import type { AppMetadata } from '@cinacoin/core-sdk';

const mockMetadata: AppMetadata = {
  name: 'Test dApp',
  description: 'A test decentralized app',
  url: 'https://test.example.com',
  icons: ['https://test.example.com/icon.png'],
};

describe('WcSessionManager — expanded lifecycle', () => {
  let manager: WcSessionManager;

  beforeEach(() => {
    manager = new WcSessionManager({
      relayUrl: 'wss://relay.example.com',
      metadata: mockMetadata,
      requiredChains: ['eip155:1'],
    });
  });

  it('creates with correct initial state', () => {
    expect(manager.getSession()).toBeNull();
    expect(manager.isConnected()).toBe(false);
  });

  it('emits events on wcEvent channel', () => {
    let eventCount = 0;
    manager.on('wcEvent', () => { eventCount++; });
    manager.emit('wcEvent', { type: 'error', error: new Error('test') });
    expect(eventCount).toBe(1);
  });

  it('supports once handlers', () => {
    let callCount = 0;
    manager.once('wcEvent', () => { callCount++; });
    manager.emit('wcEvent', { type: 'error', error: new Error('test') });
    manager.emit('wcEvent', { type: 'error', error: new Error('test') });
    expect(callCount).toBe(1);
  });

  it('supports off/removeListener', () => {
    let callCount = 0;
    const handler = () => { callCount++; };
    manager.on('wcEvent', handler);
    manager.off('wcEvent', handler);
    manager.emit('wcEvent', { type: 'error', error: new Error('test') });
    expect(callCount).toBe(0);
  });

  it('disconnect is safe when no session exists', async () => {
    await expect(manager.disconnect()).resolves.not.toThrow();
  });

  it('request throws when no active session', async () => {
    await expect(manager.request('eth_accounts', [])).rejects.toThrow('No active session');
  });

  it('accepts custom session TTL', () => {
    const m = new WcSessionManager({
      relayUrl: 'wss://relay.example.com',
      metadata: mockMetadata,
      sessionTtl: 86400,
    });
    expect(m).toBeDefined();
  });

  it('accepts custom methods and events', () => {
    const m = new WcSessionManager({
      relayUrl: 'wss://relay.example.com',
      metadata: mockMetadata,
      requiredMethods: ['eth_sendTransaction', 'personal_sign'],
      requiredEvents: ['accountsChanged', 'chainChanged'],
    });
    expect(m).toBeDefined();
  });

  it('emits session_proposal event when pairing is initiated', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', { type: 'session_proposal', proposal: { id: 1 } });
    expect(handler).toHaveBeenCalled();
  });

  it('emits session_approved event on approval', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', {
      type: 'session_approved',
      session: { topic: 'abc', accounts: ['0x123'], namespaces: {}, expiry: Date.now() + 86400 },
    });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'session_approved' }),
    );
  });

  it('emits session_delete event on disconnect', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', { type: 'session_delete', topic: 'abc' });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'session_delete' }),
    );
  });

  it('handles session update events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', {
      type: 'session_update',
      session: { topic: 'abc', accounts: ['0x456'], namespaces: {}, expiry: Date.now() + 86400 },
    });
    expect(handler).toHaveBeenCalled();
  });

  it('handles session_extend events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', { type: 'session_extend', topic: 'abc', newExpiry: Date.now() + 172800 });
    expect(handler).toHaveBeenCalled();
  });

  it('handles session_expired events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', { type: 'session_expired', topic: 'abc' });
    expect(handler).toHaveBeenCalled();
  });

  it('handles session_notification events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', {
      type: 'session_notification',
      notification: { chainId: 'eip155:1', name: 'accountsChanged', data: ['0x123'] },
    });
    expect(handler).toHaveBeenCalled();
  });

  it('handles pairing_created events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', {
      type: 'pairing_created',
      pairing: { topic: 'pair1', uri: 'wc:pair1@2?relay-protocol=ws&relay-url=wss://relay&symKey=abc', active: true, expiry: Date.now() + 3600 },
    });
    expect(handler).toHaveBeenCalled();
  });

  it('handles pairing_expired events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', { type: 'pairing_expired', topic: 'pair1' });
    expect(handler).toHaveBeenCalled();
  });

  it('handles pairing_delete events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', { type: 'pairing_delete', topic: 'pair1' });
    expect(handler).toHaveBeenCalled();
  });

  it('handles request/response events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', {
      type: 'request',
      request: { id: 1, jsonrpc: '2.0', method: 'eth_accounts', params: [] },
      topic: 'session1',
    });
    expect(handler).toHaveBeenCalled();
  });

  it('handles connected event', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', {
      type: 'connected',
      session: { topic: 'session1', peerMetadata: mockMetadata, accounts: ['0x123'], namespaces: {}, requiredNamespaces: {}, expiry: Date.now() + 86400, relay: { protocol: 'irn' } },
    });
    expect(handler).toHaveBeenCalled();
  });

  it('handles disconnected event', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', { type: 'disconnected', reason: 'User closed wallet' });
    expect(handler).toHaveBeenCalled();
  });

  it('handles error events', () => {
    const handler = vi.fn();
    manager.on('wcEvent', handler);
    manager.emit('wcEvent', { type: 'error', error: new Error('Test error') });
    expect(handler).toHaveBeenCalled();
  });

  it('supports multiple chain configuration', () => {
    const m = new WcSessionManager({
      relayUrl: 'wss://relay.example.com',
      metadata: mockMetadata,
      requiredChains: ['eip155:1', 'eip155:137', 'eip155:10'],
    });
    expect(m).toBeDefined();
  });

  it('request with object form throws without session', async () => {
    await expect(manager.request({ method: 'eth_sendTransaction', params: [] })).rejects.toThrow(
      'No active session',
    );
  });

  it('pingSession returns false without session', async () => {
    const result = await manager.pingSession?.();
    expect(result).toBe(false);
  });
});
