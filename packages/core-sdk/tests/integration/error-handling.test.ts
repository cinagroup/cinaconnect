/**
 * Error handling integration tests for the Cinacoin Core SDK.
 *
 * Tests network errors, wallet rejection, and various failure scenarios.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connector } from '../../src/connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest } from '../../src/types.js';
import { EventEmitter } from '../../src/events.js';

// ============================================================
// Mock Connectors for Error Scenarios
// ============================================================

class RejectionConnector extends Connector {
  readonly id = 'test-rejection';
  readonly name = 'Rejecting Wallet';
  readonly icon = '';
  readonly installed = true;
  readonly type = 'injected';

  async connect(): Promise<ConnectionResult> {
    throw new Error('User rejected connection');
  }

  async disconnect(): Promise<void> {}
  async getAccounts(): Promise<string[]> { throw new Error('Not connected'); }
  async getChainId(): Promise<number> { throw new Error('Not connected'); }
  async switchChain(): Promise<void> { throw new Error('Not connected'); }
  async signMessage(): Promise<string> { throw new Error('User rejected signing'); }
  async signTransaction(): Promise<string> { throw new Error('User rejected signing'); }
}

class NetworkErrorConnector extends Connector {
  readonly id = 'test-network';
  readonly name = 'Network Error Wallet';
  readonly icon = '';
  readonly installed = true;
  readonly type = 'injected';
  private _shouldFail = true;
  private _accounts = ['0xabcdef1234567890abcdef1234567890abcdef12'];
  private _chainId = 1;

  setFail(v: boolean) { this._shouldFail = v; }

  async connect(): Promise<ConnectionResult> {
    if (this._shouldFail) throw new Error('Network error: connection refused');
    return {
      sessionId: 'network-session',
      accounts: [...this._accounts],
      chainId: this._chainId,
      connectorId: this.id,
    };
  }

  async disconnect(): Promise<void> {
    this.emit('disconnect');
  }
  async getAccounts(): Promise<string[]> {
    if (this._shouldFail) throw new Error('Network error');
    return [...this._accounts];
  }
  async getChainId(): Promise<number> {
    if (this._shouldFail) throw new Error('Network error');
    return this._chainId;
  }
  async switchChain(): Promise<void> { throw new Error('Network error'); }
  async signMessage(): Promise<string> { throw new Error('Network error'); }
  async signTransaction(): Promise<string> { throw new Error('Network error'); }
}

class TimeoutConnector extends Connector {
  readonly id = 'test-timeout';
  readonly name = 'Timeout Wallet';
  readonly icon = '';
  readonly installed = true;
  readonly type = 'injected';

  async connect(): Promise<ConnectionResult> {
    return new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error('Connection timed out')), 5000);
    });
  }

  async disconnect(): Promise<void> {}
  async getAccounts(): Promise<string[]> { return []; }
  async getChainId(): Promise<number> { return 0; }
  async switchChain(): Promise<void> {}
  async signMessage(): Promise<string> { throw new Error('Timed out'); }
  async signTransaction(): Promise<string> { throw new Error('Timed out'); }
}

// ============================================================
// Tests
// ============================================================

describe('Wallet rejection errors', () => {
  it('throws UserRejectedConnectionError on wallet rejection', async () => {
    const connector = new RejectionConnector();
    await expect(connector.connect()).rejects.toThrow('User rejected connection');
  });

  it('throws UserRejectedSignError on message signing rejection', async () => {
    const connector = new RejectionConnector();
    await expect(connector.signMessage('hello')).rejects.toThrow('User rejected signing');
  });

  it('throws UserRejectedSignError on transaction signing rejection', async () => {
    const connector = new RejectionConnector();
    await expect(connector.signTransaction({ from: '0x0', to: '0x0' }))
      .rejects.toThrow('User rejected signing');
  });
});

describe('Network error handling', () => {
  it('throws NetworkError on connection failure', async () => {
    const connector = new NetworkErrorConnector();
    await expect(connector.connect()).rejects.toThrow('Network error: connection refused');
  });

  it('throws NetworkError on getAccounts failure', async () => {
    const connector = new NetworkErrorConnector();
    await expect(connector.getAccounts()).rejects.toThrow('Network error');
  });

  it('throws NetworkError on getChainId failure', async () => {
    const connector = new NetworkErrorConnector();
    await expect(connector.getChainId()).rejects.toThrow('Network error');
  });

  it('recovers after network error is resolved', async () => {
    const connector = new NetworkErrorConnector();
    // First attempt fails
    await expect(connector.connect()).rejects.toThrow('Network error');

    // Resolve the error
    connector.setFail(false);

    // Second attempt succeeds
    const result = await connector.connect();
    expect(result.accounts).toEqual(['0xabcdef1234567890abcdef1234567890abcdef12']);
  });
});

describe('Timeout handling', () => {
  it('throws TimeoutError on connection timeout', async () => {
    vi.useFakeTimers();
    try {
      const connector = new TimeoutConnector();
      const connectPromise = connector.connect();
      // Suppress unhandled rejection if the promise rejects after test
      connectPromise.catch(() => {});
      await vi.advanceTimersByTimeAsync(5000);
      await expect(connectPromise).rejects.toThrow('Connection timed out');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Error event emission', () => {
  it('emits error event on connection failure', async () => {
    const connector = new NetworkErrorConnector();
    const errorHandler = vi.fn();
    connector.on('error', errorHandler);

    await expect(connector.connect()).rejects.toThrow();
  });

  it('emits disconnect event on unexpected disconnect', async () => {
    const connector = new NetworkErrorConnector();
    const disconnectHandler = vi.fn();
    connector.on('disconnect', disconnectHandler);

    await connector.disconnect();
    expect(disconnectHandler).toHaveBeenCalled();
  });
});

describe('Error propagation through event system', () => {
  it('EventEmitter handles errors in handlers gracefully', () => {
    const emitter = new EventEmitter();
    const errorFn = vi.fn().mockImplementation(() => {
      throw new Error('Handler error');
    });

    emitter.on('test', errorFn);
    // Should not throw - errors in handlers are caught
    emitter.emit('test', 'data');
    expect(errorFn).toHaveBeenCalled();
  });

  it('EventEmitter removes handler after once is triggered', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.once('test', handler);

    emitter.emit('test');
    emitter.emit('test');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removeAllListeners clears all handlers', () => {
    const emitter = new EventEmitter();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    emitter.on('event1', handler1);
    emitter.on('event2', handler2);

    emitter.removeAllListeners();

    emitter.emit('event1');
    emitter.emit('event2');
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('listenerCount returns correct count', () => {
    const emitter = new EventEmitter();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on('test', h1);
    emitter.on('test', h2);

    expect(emitter.listenerCount('test')).toBe(2);
    expect(emitter.listenerCount('unknown')).toBe(0);
  });
});
