/**
 * @vitest-environment jsdom
 * Security unit tests for session hardening in @cinacoin/core-sdk.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../src/session';

describe('SessionManager — Security Hardening', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists connected state with expiry and integrity hash', async () => {
    const connector = {
      id: 'test-connector',
      connect: async () => ({
        sessionId: 'sess-1',
        accounts: ['0xabc123'],
        chainId: 1,
      }),
      disconnect: async () => {},
    };

    const sm = new SessionManager();
    await sm.initiate(connector as any);
    await new Promise(r => setTimeout(r, 100));

    const stored = localStorage.getItem('cinacoin_session');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.status).toBe('connected');
    expect(parsed.expiresAt).toBeDefined();
    expect(parsed.expiresAt).toBeGreaterThan(Date.now());
    expect(parsed._integrity).toBeDefined();
    expect(typeof parsed._integrity).toBe('string');
  });

  it('rejects expired sessions on restore', async () => {
    const expired = {
      status: 'connected',
      accounts: ['0xabc'],
      chainId: 1,
      sessionId: 'old-session',
      connectorId: 'test',
      expiresAt: Date.now() - 1000,
    };
    localStorage.setItem('cinacoin_session', JSON.stringify(expired));

    const sm = new SessionManager();
    const state = await sm.restore();

    expect(state.status).toBe('disconnected');
  });

  it('rejects tampered sessions (integrity mismatch)', async () => {
    const tampered = {
      status: 'connected',
      accounts: ['0xdef'],
      chainId: 1,
      sessionId: 'tampered',
      connectorId: 'evil',
      expiresAt: Date.now() + 86400000,
      _integrity: 'not-the-right-hash',
    };
    localStorage.setItem('cinacoin_session', JSON.stringify(tampered));

    const sm = new SessionManager();
    const state = await sm.restore();

    expect(state.status).toBe('disconnected');
  });

  it('clears expired session from localStorage', async () => {
    const expired = {
      status: 'connected',
      accounts: ['0xabc'],
      chainId: 1,
      sessionId: 'old',
      connectorId: 'test',
      expiresAt: Date.now() - 1000,
    };
    localStorage.setItem('cinacoin_session', JSON.stringify(expired));

    const sm = new SessionManager();
    await sm.restore();

    expect(localStorage.getItem('cinacoin_session')).toBeNull();
  });

  it('clears tampered session from localStorage', async () => {
    const tampered = {
      status: 'connected',
      accounts: ['0xdef'],
      chainId: 1,
      sessionId: 'bad',
      connectorId: 'evil',
      expiresAt: Date.now() + 86400000,
      _integrity: 'wrong',
    };
    localStorage.setItem('cinacoin_session', JSON.stringify(tampered));

    const sm = new SessionManager();
    await sm.restore();

    expect(localStorage.getItem('cinacoin_session')).toBeNull();
  });

  it('terminates session and clears localStorage', async () => {
    localStorage.setItem('cinacoin_session', JSON.stringify({
      status: 'connected',
      accounts: ['0xabc'],
      chainId: 1,
      sessionId: 'sess-1',
      connectorId: 'test',
      expiresAt: Date.now() + 86400000,
    }));

    const sm = new SessionManager();
    await sm.restore();
    expect(sm.getState().status).toBe('connected');

    await sm.terminate();

    expect(localStorage.getItem('cinacoin_session')).toBeNull();
    expect(sm.getState().status).toBe('disconnected');
  });
});
