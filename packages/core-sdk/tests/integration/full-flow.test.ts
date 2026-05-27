/**
 * Core SDK integration tests.
 *
 * Tests:
 * - Full flow: Connect → Sign → Send TX → Disconnect
 * - Multi-chain: Switch chains mid-session
 * - Error handling: Network errors, wallet rejection
 * - Event propagation through connector chain
 * - Session state consistency
 * - Store integration with connector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Connector } from '../../src/connector.js';
import { SessionManager } from '../../src/session.js';
import { createCinacoinStore } from '../../src/store.js';
import type { ConnectParams, ConnectionResult, TransactionRequest } from '../../src/types.js';

/**
 * MockConnector that simulates a complete wallet connection lifecycle.
 */
class MockConnector extends Connector {
  readonly id = 'mock-integration';
  readonly name = 'Mock Integration Wallet';
  readonly icon = '';
  readonly installed = true;
  readonly type = 'injected';

  private _connected = false;
  private _accounts: string[] = [];
  private _chainId = 1;
  private _failOn: string | null = null;

  failOn(method: string) { this._failOn = method; }

  async connect(params?: ConnectParams): Promise<ConnectionResult> {
    if (this._failOn === 'connect') throw new Error('User rejected connection');
    if (this._connected) throw new Error('Already connected');

    this._connected = true;
    this._accounts = ['0x1234567890abcdef1234567890abcdef12345678'];
    this._chainId = params?.chains?.[0] ?? 1;

    this.emit('connect', { accounts: this._accounts, chainId: this._chainId });

    return {
      sessionId: 'mock-session-' + Date.now(),
      accounts: this._accounts,
      chainId: this._chainId,
      connectorId: this.id,
    };
  }

  async disconnect(): Promise<void> {
    if (this._failOn === 'disconnect') throw new Error('Disconnect failed');
    this._connected = false;
    this._accounts = [];
    this.emit('disconnect');
  }

  async getAccounts(): Promise<string[]> {
    if (this._failOn === 'getAccounts') throw new Error('Network error');
    return this._connected ? [...this._accounts] : [];
  }

  async getChainId(): Promise<number> {
    return this._chainId;
  }

  async switchChain(chainId: number): Promise<void> {
    if (this._failOn === 'switchChain') throw new Error('Chain switch rejected');
    if (!this._connected) throw new Error('Not connected');
    this._chainId = chainId;
    this.emit('chainChanged', chainId);
  }

  async signMessage(message: string): Promise<string> {
    if (this._failOn === 'signMessage') throw new Error('User rejected signing');
    if (!this._connected) throw new Error('Not connected');
    return '0xmocksig_' + message;
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    if (this._failOn === 'signTransaction') throw new Error('TX signing rejected');
    if (!this._connected) throw new Error('Not connected');
    return '0xmocksignedtx_' + JSON.stringify(tx);
  }

  get isConnected(): boolean {
    return this._connected;
  }
}

describe('Full Flow: Connect → Sign → Send → Disconnect', () => {
  let connector: MockConnector;
  let sessionManager: SessionManager;

  beforeEach(() => {
    connector = new MockConnector();
    sessionManager = new SessionManager();
  });

  it('should connect and return a valid connection result', async () => {
    const result = await connector.connect();
    expect(result.sessionId).toBeDefined();
    expect(result.accounts).toHaveLength(1);
    expect(result.chainId).toBe(1);
    expect(result.connectorId).toBe('mock-integration');
  });

  it('should sign a message after connecting', async () => {
    await connector.connect();
    const sig = await connector.signMessage('Hello, World!');
    expect(sig).toBe('0xmocksig_Hello, World!');
  });

  it('should sign a transaction after connecting', async () => {
    await connector.connect();
    const tx: TransactionRequest = {
      from: '0xabc',
      to: '0xdef',
      value: '0x1',
    };
    const signed = await connector.signTransaction(tx);
    expect(signed).toContain('0xmocksignedtx');
  });

  it('should disconnect and clear state', async () => {
    await connector.connect();
    expect(connector.isConnected).toBe(true);

    await connector.disconnect();
    expect(connector.isConnected).toBe(false);
    expect(await connector.getAccounts()).toEqual([]);
  });

  it('should track session state through the flow', async () => {
    // Connect via SessionManager (it calls connector.connect() internally)
    await sessionManager.initiate(connector);
    expect(sessionManager.getState().status).toBe('connected');

    // Sign
    const sig = await connector.signMessage('test');
    expect(sig).toBeDefined();

    // Disconnect
    await connector.disconnect();
    await sessionManager.terminate();
    expect(sessionManager.getState().status).toBe('disconnected');
  });

  it('should emit events through the flow', async () => {
    const events: string[] = [];
    connector.on('connect', () => events.push('connect'));
    connector.on('disconnect', () => events.push('disconnect'));
    connector.on('chainChanged', () => events.push('chainChanged'));

    await connector.connect();
    expect(events).toContain('connect');

    await connector.disconnect();
    expect(events).toContain('disconnect');
  });

  it('should prevent signing when disconnected', async () => {
    await expect(connector.signMessage('test')).rejects.toThrow('Not connected');
  });

  it('should prevent switching chain when disconnected', async () => {
    await expect(connector.switchChain(137)).rejects.toThrow('Not connected');
  });
});

describe('Multi-chain: Switch chains mid-session', () => {
  let connector: MockConnector;

  beforeEach(() => {
    connector = new MockConnector();
  });

  it('should connect on default chain (1)', async () => {
    const result = await connector.connect();
    expect(result.chainId).toBe(1);
  });

  it('should connect on specified chain', async () => {
    const result = await connector.connect({ chains: [137] });
    expect(result.chainId).toBe(137);
  });

  it('should switch chain after connection', async () => {
    await connector.connect({ chains: [1] });
    expect(await connector.getChainId()).toBe(1);

    await connector.switchChain(137);
    expect(await connector.getChainId()).toBe(137);
  });

  it('should emit chainChanged on switch', async () => {
    const handler = vi.fn();
    connector.on('chainChanged', handler);

    await connector.connect({ chains: [1] });
    await connector.switchChain(10);

    expect(handler).toHaveBeenCalledWith(10);
  });

  it('should maintain accounts after chain switch', async () => {
    await connector.connect();
    const accountsBefore = await connector.getAccounts();

    await connector.switchChain(137);
    const accountsAfter = await connector.getAccounts();

    expect(accountsAfter).toEqual(accountsBefore);
  });

  it('should support multiple chain switches', async () => {
    await connector.connect({ chains: [1] });
    await connector.switchChain(137);
    await connector.switchChain(10);
    await connector.switchChain(42161);

    expect(await connector.getChainId()).toBe(42161);
  });
});

describe('Error Handling', () => {
  let connector: MockConnector;

  beforeEach(() => {
    connector = new MockConnector();
  });

  it('should handle connection rejection', async () => {
    connector.failOn('connect');
    await expect(connector.connect()).rejects.toThrow('User rejected connection');
    expect(connector.isConnected).toBe(false);
  });

  it('should handle sign message rejection', async () => {
    connector.failOn('signMessage');
    await connector.connect();
    await expect(connector.signMessage('test')).rejects.toThrow('User rejected signing');
  });

  it('should handle transaction signing rejection', async () => {
    connector.failOn('signTransaction');
    await connector.connect();
    await expect(connector.signTransaction({ from: '0xabc', to: '0xdef' })).rejects.toThrow('TX signing rejected');
  });

  it('should handle chain switch rejection', async () => {
    connector.failOn('switchChain');
    await connector.connect();
    await expect(connector.switchChain(137)).rejects.toThrow('Chain switch rejected');
    // Chain should remain at original value
    expect(await connector.getChainId()).toBe(1);
  });

  it('should handle network errors on getAccounts', async () => {
    connector.failOn('getAccounts');
    await connector.connect();
    await expect(connector.getAccounts()).rejects.toThrow('Network error');
  });

  it('should recover after error (connector still usable)', async () => {
    // Fail on sign
    connector.failOn('signMessage');
    await connector.connect();
    await expect(connector.signMessage('test')).rejects.toThrow();

    // Reset and try again
    connector.failOn(null);
    const sig = await connector.signMessage('test');
    expect(sig).toBe('0xmocksig_test');
  });

  it('should handle disconnect errors gracefully', async () => {
    connector.failOn('disconnect');
    await connector.connect();
    await expect(connector.disconnect()).rejects.toThrow('Disconnect failed');
  });

  it('should handle double connection attempt', async () => {
    await connector.connect();
    await expect(connector.connect()).rejects.toThrow('Already connected');
  });
});
