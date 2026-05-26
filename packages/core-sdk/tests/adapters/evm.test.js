/**
 * Tests for EVM adapter chain switching, address validation, and RPC methods.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EvmAdapter } from '../../src/adapters/evm.js';
import { Connector } from '../../src/connector.js';
class MockConnector extends Connector {
    constructor(provider) {
        super();
        this.id = 'evm-test';
        this.name = 'EVM Test Wallet';
        this.icon = '';
        this.installed = true;
        this.type = 'injected';
        this._provider = provider;
    }
    async connect(params) {
        return { sessionId: 's1', accounts: ['0x123'], chainId: 1, connectorId: this.id };
    }
    async disconnect() { }
    async getAccounts() { return []; }
    async getChainId() { return 1; }
    async switchChain(chainId) { }
    async signMessage(message) { return '0xsig'; }
    async signTransaction(tx) { return '0xsigned'; }
    getProvider() {
        return this._provider;
    }
}
describe('EvmAdapter', () => {
    let adapter;
    beforeEach(() => {
        adapter = new EvmAdapter();
    });
    it('should throw when no connector is set', async () => {
        await expect(adapter.getBalance('0xabc')).rejects.toThrow('No connector set');
    });
    it('should throw when connector has no provider', async () => {
        const connector = new MockConnector({});
        adapter.setConnector(connector);
        await expect(adapter.getBalance('0xabc')).rejects.toThrow();
    });
    it('should register and find chains', () => {
        adapter.registerChains([
            { id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' },
            { id: '89', name: 'Polygon', rpcUrl: 'https://polygon.rpc' },
        ]);
        const eth = adapter.findChain(1);
        expect(eth).toBeDefined();
        expect(eth.name).toBe('Ethereum');
        const polygon = adapter.findChain(137);
        expect(polygon).toBeDefined();
        expect(polygon.name).toBe('Polygon');
    });
    it('should find chain by hex ID', () => {
        adapter.registerChains([
            { id: '0x1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' },
        ]);
        const eth = adapter.findChain(1);
        expect(eth).toBeDefined();
        expect(eth.name).toBe('Ethereum');
    });
    it('should return undefined for unknown chain', () => {
        adapter.registerChains([{ id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' }]);
        expect(adapter.findChain(999)).toBeUndefined();
    });
    it('should get balance via eth_getBalance', async () => {
        const connector = new MockConnector({
            request: async ({ method, params }) => {
                if (method === 'eth_getBalance')
                    return '0x1234';
                return null;
            },
        });
        adapter.setConnector(connector);
        const balance = await adapter.getBalance('0xabc');
        expect(balance).toBe('0x1234');
    });
    it('should get gas price via eth_gasPrice', async () => {
        const connector = new MockConnector({
            request: async ({ method }) => {
                if (method === 'eth_gasPrice')
                    return '0x5f5e100';
                return null;
            },
        });
        adapter.setConnector(connector);
        const price = await adapter.getGasPrice();
        expect(price).toBe('0x5f5e100');
    });
    it('should get block number and convert from hex', async () => {
        const connector = new MockConnector({
            request: async ({ method }) => {
                if (method === 'eth_blockNumber')
                    return '0x1234567';
                return null;
            },
        });
        adapter.setConnector(connector);
        const block = await adapter.getBlockNumber();
        expect(block).toBe(19088743);
    });
    it('should format transaction with all fields', () => {
        const tx = {
            from: '0xabc',
            to: '0xdef',
            value: '0x100',
            data: '0x',
            gas: '0x5208',
            nonce: '0x1',
            chainId: 1,
            maxFeePerGas: '0x3b9aca00',
            maxPriorityFeePerGas: '0x77359400',
        };
        const formatted = adapter.formatTransaction(tx);
        expect(formatted.from).toBe('0xabc');
        expect(formatted.to).toBe('0xdef');
        expect(formatted.value).toBe('0x100');
        expect(formatted.chainId).toBe('0x1');
        expect(formatted.gas).toBe('0x5208');
    });
    it('should format transaction with only required fields', () => {
        const tx = {
            from: '0xabc',
            to: '0xdef',
        };
        const formatted = adapter.formatTransaction(tx);
        expect(formatted.from).toBe('0xabc');
        expect(formatted.to).toBe('0xdef');
        expect(formatted.chainId).toBeUndefined();
        expect(formatted.gas).toBeUndefined();
    });
    it('should get token balance with encoded calldata', async () => {
        let capturedData = '';
        const connector = new MockConnector({
            request: async ({ method, params }) => {
                if (method === 'eth_call') {
                    capturedData = params[0].data;
                    return '0x00000000000000000000000000000000000000000000000000000000000003e8';
                }
                return null;
            },
        });
        adapter.setConnector(connector);
        const balance = await adapter.getTokenBalance('0xTokenAddr', '0xUserAddr');
        expect(balance).toBe('0x00000000000000000000000000000000000000000000000000000000000003e8');
        // ERC-20 balanceOf selector
        expect(capturedData.startsWith('0x70a08231')).toBe(true);
    });
    it('should get and set connector', () => {
        const connector = new MockConnector({});
        expect(adapter.getConnector()).toBeNull();
        adapter.setConnector(connector);
        expect(adapter.getConnector()).toBe(connector);
    });
});
//# sourceMappingURL=evm.test.js.map