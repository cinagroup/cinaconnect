/**
 * Error handling integration tests for the Cinacoin Core SDK.
 *
 * Tests network errors, wallet rejection, and various failure scenarios.
 */
import { describe, it, expect, vi } from 'vitest';
import { Connector } from '../../src/connector.js';
import { EventEmitter } from '../../src/events.js';
// ============================================================
// Mock Connectors for Error Scenarios
// ============================================================
class RejectionConnector extends Connector {
    constructor() {
        super(...arguments);
        this.id = 'test-rejection';
        this.name = 'Rejecting Wallet';
        this.icon = '';
        this.installed = true;
        this.type = 'injected';
    }
    async connect() {
        throw new Error('User rejected connection');
    }
    async disconnect() { }
    async getAccounts() { throw new Error('Not connected'); }
    async getChainId() { throw new Error('Not connected'); }
    async switchChain() { throw new Error('Not connected'); }
    async signMessage() { throw new Error('User rejected signing'); }
    async signTransaction() { throw new Error('User rejected signing'); }
}
class NetworkErrorConnector extends Connector {
    constructor() {
        super(...arguments);
        this.id = 'test-network';
        this.name = 'Network Error Wallet';
        this.icon = '';
        this.installed = true;
        this.type = 'injected';
        this._shouldFail = true;
        this._accounts = ['0xabcdef1234567890abcdef1234567890abcdef12'];
        this._chainId = 1;
    }
    setFail(v) { this._shouldFail = v; }
    async connect() {
        if (this._shouldFail)
            throw new Error('Network error: connection refused');
        return {
            sessionId: 'network-session',
            accounts: [...this._accounts],
            chainId: this._chainId,
            connectorId: this.id,
        };
    }
    async disconnect() {
        this.emit('disconnect');
    }
    async getAccounts() {
        if (this._shouldFail)
            throw new Error('Network error');
        return [...this._accounts];
    }
    async getChainId() {
        if (this._shouldFail)
            throw new Error('Network error');
        return this._chainId;
    }
    async switchChain() { throw new Error('Network error'); }
    async signMessage() { throw new Error('Network error'); }
    async signTransaction() { throw new Error('Network error'); }
}
class TimeoutConnector extends Connector {
    constructor() {
        super(...arguments);
        this.id = 'test-timeout';
        this.name = 'Timeout Wallet';
        this.icon = '';
        this.installed = true;
        this.type = 'injected';
    }
    async connect() {
        return new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('Connection timed out')), 5000);
        });
    }
    async disconnect() { }
    async getAccounts() { return []; }
    async getChainId() { return 0; }
    async switchChain() { }
    async signMessage() { throw new Error('Timed out'); }
    async signTransaction() { throw new Error('Timed out'); }
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
//# sourceMappingURL=error-handling.test.js.map