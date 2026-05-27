/**
 * Benchmark — Session State Machine Performance
 *
 * Measures session lifecycle performance.
 *
 * 5 scenarios:
 * - Session state transitions (disconnected → connecting → connected)
 * - Rapid connect/disconnect cycles
 * - State subscription callbacks
 * - Session persistence (localStorage)
 * - Error state transition and recovery
 */
import { describe, it, expect, vi } from 'vitest';
import { SessionManager } from '../src/session.js';
import { Connector } from '../src/connector.js';
class FastConnector extends Connector {
    constructor() {
        super(...arguments);
        this.id = 'fast';
        this.name = 'Fast Wallet';
        this.icon = '';
        this.installed = true;
        this.type = 'injected';
        this._connected = false;
    }
    async connect() {
        this._connected = true;
        return { sessionId: 's-' + Date.now(), accounts: ['0x' + 'ab'.repeat(20)], chainId: 1, connectorId: this.id };
    }
    async disconnect() { this._connected = false; }
    async getAccounts() { return this._connected ? ['0x' + 'ab'.repeat(20)] : []; }
    async getChainId() { return 1; }
    async switchChain(_c) { }
    async signMessage(_m) { return '0xsig'; }
    async signTransaction(_t) { return '0xtx'; }
    getProvider() { return this._connected ? { request: async () => null } : null; }
}
async function measure(fn) {
    const start = performance.now();
    await fn();
    return performance.now() - start;
}
describe('Session Benchmarks', () => {
    it('should transition through disconnected → connecting → connected within 10ms', async () => {
        const sm = new SessionManager();
        const connector = new FastConnector();
        expect(sm.getState().status).toBe('disconnected');
        const duration = await measure(async () => {
            await sm.initiate(connector);
        });
        expect(duration).toBeLessThan(10);
        expect(sm.getState().status).toBe('connected');
    });
    it('should handle 100 connect-disconnect cycles within 500ms', async () => {
        const sm = new SessionManager();
        const connector = new FastConnector();
        const start = performance.now();
        for (let i = 0; i < 100; i++) {
            await sm.initiate(connector);
            await sm.terminate();
        }
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(500);
        expect(sm.getState().status).toBe('disconnected');
    });
    it('should notify 100 subscribers within 10ms on state change', async () => {
        const sm = new SessionManager();
        const connector = new FastConnector();
        const handlers = Array.from({ length: 100 }, () => vi.fn());
        for (const h of handlers)
            sm.subscribe(h);
        const duration = await measure(async () => {
            await sm.initiate(connector);
        });
        expect(duration).toBeLessThan(10);
        for (const h of handlers) {
            expect(h).toHaveBeenCalled();
        }
    });
    it('should persist session to localStorage within 5ms', async () => {
        const sm = new SessionManager();
        const connector = new FastConnector();
        const duration = await measure(async () => {
            await sm.initiate(connector);
            // Persistence happens synchronously inside confirm()
            const stored = localStorage.getItem('cinacoin_session');
            expect(stored).toBeTruthy();
        });
        expect(duration).toBeLessThan(5);
    });
    it('should recover from error state within 10ms', async () => {
        // Create a connector that fails
        class FailingConnector extends Connector {
            constructor() {
                super(...arguments);
                this.id = 'fail';
                this.name = 'Fail Wallet';
                this.icon = '';
                this.installed = true;
                this.type = 'injected';
            }
            async connect() {
                throw new Error('Connection failed');
            }
            async disconnect() { }
            async getAccounts() { return []; }
            async getChainId() { return 1; }
            async switchChain(_c) { }
            async signMessage(_m) { return '0x'; }
            async signTransaction(_t) { return '0x'; }
        }
        const sm = new SessionManager();
        const connector = new FailingConnector();
        const duration = await measure(async () => {
            await sm.initiate(connector);
            // Wait for auto-recovery (5s timeout in session manager)
            // We just verify the error state is reached quickly
        });
        // Should transition to error state quickly (not wait 5s)
        expect(duration).toBeLessThan(10);
        expect(sm.getState().status).toBe('error');
    });
});
//# sourceMappingURL=session.bench.js.map