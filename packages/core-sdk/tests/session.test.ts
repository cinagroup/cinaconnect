/**
 * Tests for SessionManager state machine transitions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../src/session';
import { Connector } from '../../src/connector';
import type { ConnectParams, ConnectionResult, TransactionRequest, EventHandler } from '../../src/types';

class TestConnector extends Connector {
  readonly id = 'test-connector';
  readonly name = 'Test Wallet';
  readonly icon = '';
  readonly installed = true;
  readonly type = 'injected';
  private shouldFail = false;

  setFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async connect(params?: ConnectParams): Promise<ConnectionResult> {
    if (this.shouldFail) throw new Error('Connection failed');
    return {
      sessionId: 'session-001',
      accounts: ['0xabcdef1234567890abcdef1234567890abcdef12'],
      chainId: 1,
      connectorId: this.id,
    };
  }

  async disconnect(): Promise<void> {}
  async getAccounts(): Promise<string[]> { return []; }
  async getChainId(): Promise<number> { return 1; }
  async switchChain(chainId: number): Promise<void> {}
  async signMessage(message: string): Promise<string> { return '0xsig'; }
  async signTransaction(tx: TransactionRequest): Promise<string> { return '0xsigned'; }
}

describe('SessionManager state transitions', () => {
  let manager: SessionManager;
  let connector: TestConnector;

  beforeEach(() => {
    vi.useFakeTimers();
    // Clear localStorage
    localStorage.clear();
    manager = new SessionManager();
    connector = new TestConnector();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in disconnected state', () => {
    expect(manager.getState()).toEqual({ status: 'disconnected' });
  });

  it('should transition from disconnected to connecting on initiate', async () => {
    await manager.initiate(connector);
    const state = manager.getState();
    expect(state.status).toBe('connecting');
    if (state.status === 'connecting') {
      expect(state.connectorId).toBe('test-connector');
    }
  });

  it('should transition from connecting to connected on successful connect', async () => {
    await manager.initiate(connector);
    await vi.runAllTimersAsync();
    const state = manager.getState();
    expect(state.status).toBe('connected');
    if (state.status === 'connected') {
      expect(state.accounts).toEqual(['0xabcdef1234567890abcdef1234567890abcdef12']);
      expect(state.chainId).toBe(1);
      expect(state.sessionId).toBe('session-001');
    }
  });

  it('should transition to error then disconnected on failed connect', async () => {
    connector.setFail(true);
    await manager.initiate(connector);
    await vi.runAllTimersAsync();

    // After error and timeout, should end up disconnected
    const state = manager.getState();
    expect(state.status).toBe('disconnected');
  });

  it('should throw if initiate is called while already connecting', async () => {
    const conn2 = new TestConnector();
    // Initiate and don't await - leave it in connecting state
    const promise = manager.initiate(connector);
    await expect(manager.initiate(conn2)).rejects.toThrow('Connection already in progress');
    await promise;
  });

  it('should transition from connected to disconnected on terminate', async () => {
    await manager.initiate(connector);
    await vi.runAllTimersAsync();
    expect(manager.getState().status).toBe('connected');

    await manager.terminate();
    expect(manager.getState()).toEqual({ status: 'disconnected' });
  });

  it('should emit stateChange events on transitions', async () => {
    const states: string[] = [];
    manager.subscribe((state) => states.push(state.status));

    await manager.initiate(connector);
    await vi.runAllTimersAsync();
    await manager.terminate();

    expect(states).toContain('connecting');
    expect(states).toContain('connected');
    expect(states).toContain('disconnected');
  });

  it('should persist session to localStorage on connect', async () => {
    await manager.initiate(connector);
    await vi.runAllTimersAsync();

    const stored = localStorage.getItem('onchainux_session');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.status).toBe('connected');
    expect(parsed.sessionId).toBe('session-001');
  });

  it('should restore session from localStorage', async () => {
    const sessionData = JSON.stringify({
      status: 'connected',
      accounts: ['0xrestored'],
      chainId: 137,
      sessionId: 'restored-session',
      connectorId: 'test-connector',
    });
    localStorage.setItem('onchainux_session', sessionData);

    const freshManager = new SessionManager();
    await freshManager.restore();
    const state = freshManager.getState();
    expect(state.status).toBe('connected');
    if (state.status === 'connected') {
      expect(state.accounts).toEqual(['0xrestored']);
      expect(state.chainId).toBe(137);
    }
  });

  it('should handle corrupted localStorage gracefully', async () => {
    localStorage.setItem('onchainux_session', 'not-json');
    const freshManager = new SessionManager();
    const state = await freshManager.restore();
    expect(state.status).toBe('disconnected');
  });

  it('should clear localStorage on terminate', async () => {
    await manager.initiate(connector);
    await vi.runAllTimersAsync();
    expect(localStorage.getItem('onchainux_session')).not.toBeNull();

    await manager.terminate();
    expect(localStorage.getItem('onchainux_session')).toBeNull();
  });

  it('should throw on confirm without initiate', async () => {
    const mgr = new SessionManager();
    await expect(mgr.confirm('sid', ['0xabc'], 1)).rejects.toThrow('No connector set');
  });
});
