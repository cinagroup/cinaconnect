import { describe, it, expect, beforeEach } from 'vitest';
import { BatchExecutor } from '../src/executor.js';
import { createTransferOperation } from '../src/operations/transfer.js';
import { createApproveOperation } from '../src/operations/approve.js';
import { createSwapOperation } from '../src/operations/swap.js';
import { createCustomOperation } from '../src/operations/custom.js';
describe('BatchExecutor', () => {
    let executor;
    beforeEach(() => {
        executor = new BatchExecutor({ atomic: true });
    });
    it('should execute a single operation successfully', async () => {
        const op = createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n });
        const result = await executor.execute([op]);
        expect(result.success).toBe(true);
        expect(result.results.length).toBe(1);
        expect(result.results[0].success).toBe(true);
    });
    it('should execute multiple operations atomically', async () => {
        const ops = [
            createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n }),
            createTransferOperation({ chainId: 1, from: '0x1', to: '0x3', value: 200n }),
        ];
        const result = await executor.execute(ops, { atomic: true });
        expect(result.success).toBe(true);
        expect(result.atomic).toBe(true);
        expect(result.results.length).toBe(2);
    });
    it('should fail atomically when an operation is invalid', async () => {
        const ops = [
            createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n }),
            // Invalid transfer: no recipient
            { type: 'transfer', chainId: 1, from: '0x1', to: '', value: 50n },
            createTransferOperation({ chainId: 1, from: '0x1', to: '0x4', value: 300n }),
        ];
        const result = await executor.execute(ops, { atomic: true });
        expect(result.success).toBe(false);
        // Third operation should be skipped
        expect(result.results[2].success).toBe(false);
    });
    it('should execute non-atomically when configured', async () => {
        const ops = [
            createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n }),
            { type: 'transfer', chainId: 1, from: '0x1', to: '', value: 50n },
            createTransferOperation({ chainId: 1, from: '0x1', to: '0x3', value: 200n }),
        ];
        const result = await executor.execute(ops, { atomic: false });
        // First and third should succeed, second should fail
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
        expect(result.results[2].success).toBe(true);
    });
    it('should simulate execution without errors', async () => {
        const op = createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n });
        const result = await executor.execute([op], { simulate: true });
        expect(result.success).toBe(true);
        expect(result.results[0].success).toBe(true);
    });
    it('should validate transfer operations', async () => {
        const executor = new BatchExecutor();
        const op = createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n });
        const result = await executor.execute([op]);
        expect(result.success).toBe(true);
    });
    it('should validate approve operations', async () => {
        const executor = new BatchExecutor();
        const op = createApproveOperation({
            chainId: 1, from: '0x1', tokenAddress: '0xtoken', spender: '0xspender', amount: 1000n,
        });
        const result = await executor.execute([op]);
        expect(result.success).toBe(true);
    });
    it('should validate swap operations', async () => {
        const executor = new BatchExecutor();
        const op = createSwapOperation({
            chainId: 1, from: '0x1', fromToken: '0xa', toToken: '0xb',
            fromAmount: 1000n, minToAmount: 900n,
        });
        const result = await executor.execute([op]);
        expect(result.success).toBe(true);
    });
    it('should validate custom operations', async () => {
        const executor = new BatchExecutor();
        const op = createCustomOperation({
            chainId: 1, from: '0x1', to: '0xcontract', data: '0xabcdef',
        });
        const result = await executor.execute([op]);
        expect(result.success).toBe(true);
    });
    it('should reject custom operations without data', async () => {
        const executor = new BatchExecutor();
        const op = createCustomOperation({
            chainId: 1, from: '0x1', to: '0xcontract', data: '',
        });
        const result = await executor.execute([op]);
        expect(result.success).toBe(false);
    });
});
