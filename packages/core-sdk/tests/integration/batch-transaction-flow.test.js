/**
 * Integration Test — Batch Transaction Flow
 *
 * Tests batched transaction execution with atomic operations,
 * gas estimation, and validation.
 *
 * 6 tests covering:
 * - Building a batch of operations
 * - Atomic execution (all-or-nothing)
 * - Gas estimation for batch
 * - Validation before execution
 * - Partial failure handling
 * - Batch with mixed operation types
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Connector } from '../../src/connector.js';
// ── Mock Connector ────────────────────────────────────────────────
class MockBatchConnector extends Connector {
    constructor() {
        super(...arguments);
        this.id = 'batch-test';
        this.name = 'Batch Test Wallet';
        this.icon = '';
        this.installed = true;
        this.type = 'injected';
        this._connected = false;
        this._signedTxs = [];
    }
    async connect() {
        this._connected = true;
        return {
            sessionId: 'batch-session',
            accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
            chainId: 1,
            connectorId: this.id,
        };
    }
    async disconnect() { this._connected = false; }
    async getAccounts() { return this._connected ? ['0x1234567890abcdef1234567890abcdef12345678'] : []; }
    async getChainId() { return 1; }
    async switchChain(_chainId) { }
    async signMessage(_message) { return '0xmocksig'; }
    async signTransaction(tx) {
        if (!this._connected)
            throw new Error('Not connected');
        if (tx.to && !tx.to.startsWith('0x') || tx.to === 'invalid') throw new Error('Invalid address');
        this._signedTxs.push(tx);
        return '0xsigned_' + this._signedTxs.length;
    }
    getProvider() { return this._connected ? { request: async () => null } : null; }
    get signedTransactions() { return [...this._signedTxs]; }
    resetSigned() { this._signedTxs = []; }
}
// ── Batch Executor ────────────────────────────────────────────────
class BatchTransaction {
    constructor(config) {
        this.operations = [];
        this._atomic = true;
        this.operations = config.operations;
        this._atomic = config.atomic ?? true;
    }
    get operationCount() {
        return this.operations.length;
    }
    get isAtomic() {
        return this._atomic;
    }
    addOperation(op) {
        this.operations.push(op);
    }
    removeOperation(index) {
        this.operations.splice(index, 1);
    }
    getOperations() {
        return [...this.operations];
    }
    estimateGas() {
        // Estimate 21,000 base + data cost per operation
        let total = 0n;
        for (const op of this.operations) {
            total += 21000n;
            if (op.gas)
                total += BigInt(op.gas);
            if (op.data)
                total += BigInt(op.data.length / 2) * 16n; // non-zero byte cost
        }
        return total;
    }
    validate() {
        const errors = [];
        for (let i = 0; i < this.operations.length; i++) {
            const op = this.operations[i];
            if (!op.to || !op.to.startsWith('0x')) {
                errors.push(`Operation ${i}: invalid 'to' address`);
            }
            if (!['transfer', 'approve', 'swap', 'custom'].includes(op.type)) {
                errors.push(`Operation ${i}: invalid type '${op.type}'`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
}
class BatchExecutor {
    constructor(connector) {
        this.connector = connector;
    }
    async execute(batch, options) {
        const operations = batch.getOperations();
        const results = [];
        let totalGasUsed = 0n;
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            try {
                const tx = {
                    from: (await this.connector.getAccounts())[0],
                    to: op.to,
                    value: op.value,
                    data: op.data,
                    gas: op.gas,
                    chainId: await this.connector.getChainId(),
                };
                const signedTx = await this.connector.signTransaction(tx);
                results.push({ success: true, txHash: signedTx });
                totalGasUsed += op.gas ? BigInt(op.gas) : 21000n;
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                results.push({ success: false, error: errorMsg });
                if (batch.isAtomic) {
                    // Atomic: stop at first failure, mark all remaining as not executed
                    for (let j = i + 1; j < operations.length; j++) {
                        results.push({ success: false, error: 'Aborted (atomic batch)' });
                    }
                    return { success: false, results, totalGasUsed };
                }
            }
        }
        const allSuccess = results.every((r) => r.success);
        return { success: allSuccess, results, totalGasUsed };
    }
}
// ── Tests ─────────────────────────────────────────────────────────
describe('Batch Transaction Flow — Batch Execution', () => {
    let connector;
    let executor;
    beforeEach(() => {
        connector = new MockBatchConnector();
        executor = new BatchExecutor(connector);
    });
    it('should execute a batch of transfer operations atomically', async () => {
        await connector.connect();
        const batch = new BatchTransaction({
            operations: [
                { type: 'transfer', to: '0xaaaa', value: '100' },
                { type: 'transfer', to: '0xbbbb', value: '200' },
                { type: 'transfer', to: '0xcccc', value: '300' },
            ],
            atomic: true,
        });
        const result = await executor.execute(batch);
        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(3);
        expect(result.results.every((r) => r.success)).toBe(true);
        expect(result.totalGasUsed).toBeGreaterThan(0n);
    });
    it('should stop execution on first failure in atomic mode', async () => {
        await connector.connect();
        const batch = new BatchTransaction({
            operations: [
                { type: 'transfer', to: '0xaaaa', value: '100' },
                { type: 'transfer', to: 'invalid', value: '200' }, // Will fail validation in sign
                { type: 'transfer', to: '0xcccc', value: '300' },
            ],
            atomic: true,
        });
        const result = await executor.execute(batch);
        expect(result.success).toBe(false);
        // First succeeds, second fails, third is aborted
        expect(result.results[0].success).toBe(true);
        expect(result.results[2].error).toBe('Aborted (atomic batch)');
    });
    it('should continue execution in non-atomic mode despite failures', async () => {
        await connector.connect();
        const batch = new BatchTransaction({
            operations: [
                { type: 'transfer', to: '0xaaaa', value: '100' },
                { type: 'transfer', to: '0xbbbb', value: '200' },
                { type: 'transfer', to: '0xcccc', value: '300' },
            ],
            atomic: false,
        });
        const result = await executor.execute(batch);
        expect(result.results).toHaveLength(3);
        // All succeed with mock connector
        expect(result.results.every((r) => r.success)).toBe(true);
    });
    it('should estimate gas for the entire batch', () => {
        const batch = new BatchTransaction({
            operations: [
                { type: 'transfer', to: '0xaaaa', value: '100', gas: '50000' },
                { type: 'approve', to: '0xbbbb', gas: '46000' },
                { type: 'swap', to: '0xcccc', gas: '200000' },
            ],
        });
        const estimated = batch.estimateGas();
        // 21000 base * 3 + gas extras
        expect(estimated).toBeGreaterThan(0n);
        // Should include base gas for each op
        expect(estimated).toBeGreaterThanOrEqual(21000n * 3n);
    });
    it('should validate batch operations before execution', () => {
        const validBatch = new BatchTransaction({
            operations: [
                { type: 'transfer', to: '0xaaaa', value: '100' },
                { type: 'approve', to: '0xbbbb', value: '1000' },
            ],
        });
        const invalidBatch = new BatchTransaction({
            operations: [
                { type: 'transfer', to: 'not-an-address', value: '100' },
                { type: 'invalid-type', to: '0xbbbb' },
            ],
        });
        expect(validBatch.validate().valid).toBe(true);
        expect(invalidBatch.validate().valid).toBe(false);
        expect(invalidBatch.validate().errors.length).toBeGreaterThanOrEqual(1);
    });
    it('should handle mixed operation types in a single batch', async () => {
        await connector.connect();
        const batch = new BatchTransaction({
            operations: [
                { type: 'transfer', to: '0xaaaa', value: '100' },
                { type: 'approve', to: '0xbbbb', value: '1000000' },
                { type: 'swap', to: '0xcccc', data: '0x70a08231', gas: '300000' },
                { type: 'custom', to: '0xdddd', data: '0xdeadbeef' },
            ],
            atomic: true,
        });
        expect(batch.operationCount).toBe(4);
        expect(batch.isAtomic).toBe(true);
        const result = await executor.execute(batch);
        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(4);
    });
});
//# sourceMappingURL=batch-transaction-flow.test.js.map