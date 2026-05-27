/**
 * Multi-chain integration tests for the Cinacoin Core SDK.
 *
 * Tests chain switching mid-session across different EVM networks.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Connector } from '../../src/connector.js';
// ============================================================
// Mock Multi-Chain Connector
// ============================================================
const SUPPORTED_CHAINS = [1, 137, 10, 42161, 8453]; // ETH, POLYGON, OP, ARB, BASE
class MultiChainConnector extends Connector {
    constructor() {
        super(...arguments);
        this.id = 'test-multi-chain';
        this.name = 'Multi-Chain Wallet';
        this.icon = '';
        this.installed = true;
        this.type = 'injected';
        this._accounts = ['0xabcdef1234567890abcdef1234567890abcdef12'];
        this._chainId = 1;
        this._connected = false;
        this._chainSwitchHistory = [];
    }
    async connect(params) {
        this._connected = true;
        this._chainId = params?.chains?.[0] ?? 1;
        this._chainSwitchHistory = [this._chainId];
        return {
            sessionId: 'multi-chain-session',
            accounts: [...this._accounts],
            chainId: this._chainId,
            connectorId: this.id,
        };
    }
    async disconnect() {
        this._connected = false;
        this._chainSwitchHistory = [];
    }
    async getAccounts() {
        return this._connected ? [...this._accounts] : [];
    }
    async getChainId() {
        if (!this._connected)
            throw new Error('Not connected');
        return this._chainId;
    }
    async switchChain(chainId) {
        if (!this._connected)
            throw new Error('Not connected');
        if (!SUPPORTED_CHAINS.includes(chainId)) {
            throw new Error(`Chain ${chainId} not supported`);
        }
        this._chainId = chainId;
        this._chainSwitchHistory.push(chainId);
    }
    async signMessage(_message) {
        if (!this._connected)
            throw new Error('Not connected');
        return '0xmocksig';
    }
    async signTransaction(_tx) {
        if (!this._connected)
            throw new Error('Not connected');
        return '0xmocktx';
    }
    getChainSwitchHistory() {
        return [...this._chainSwitchHistory];
    }
}
// ============================================================
// Tests
// ============================================================
describe('Multi-chain switching', () => {
    let connector;
    beforeEach(() => {
        connector = new MultiChainConnector();
    });
    it('connects on default chain 1', async () => {
        const result = await connector.connect();
        expect(result.chainId).toBe(1);
    });
    it('connects on specified chain', async () => {
        const result = await connector.connect({ chains: [137] });
        expect(result.chainId).toBe(137);
    });
    it('switches from ETH to Polygon', async () => {
        await connector.connect({ chains: [1] });
        await connector.switchChain(137);
        expect(await connector.getChainId()).toBe(137);
    });
    it('switches through multiple chains', async () => {
        await connector.connect({ chains: [1] });
        await connector.switchChain(137);
        await connector.switchChain(10);
        await connector.switchChain(42161);
        expect(await connector.getChainId()).toBe(42161);
        expect(connector.getChainSwitchHistory()).toEqual([1, 137, 10, 42161]);
    });
    it('rejects switching to unsupported chain', async () => {
        await connector.connect({ chains: [1] });
        await expect(connector.switchChain(999)).rejects.toThrow('Chain 999 not supported');
    });
    it('rejects switching when not connected', async () => {
        await expect(connector.switchChain(137)).rejects.toThrow('Not connected');
    });
});
//# sourceMappingURL=multi-chain.test.js.map