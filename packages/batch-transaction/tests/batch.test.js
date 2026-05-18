import { describe, it, expect, beforeEach } from 'vitest';
import { BatchTransaction } from '../src/batch.js';
import { createTransferOperation } from '../src/operations/transfer.js';
import { createApproveOperation } from '../src/operations/approve.js';
import { createSwapOperation } from '../src/operations/swap.js';
describe('BatchTransaction', () => {
    let batch;
    beforeEach(() => {
        batch = new BatchTransaction({ chainId: 1 });
    });
    it('should start empty', () => {
        expect(batch.size()).toBe(0);
        expect(batch.getOperations()).toEqual([]);
    });
    it('should add a transfer operation', () => {
        const op = createTransferOperation({
            chainId: 1,
            from: '0x1',
            to: '0x2',
            value: 100n,
        });
        batch.add(op);
        expect(batch.size()).toBe(1);
    });
    it('should add multiple operations', () => {
        batch
            .add(createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n }))
            .add(createApproveOperation({ chainId: 1, from: '0x1', tokenAddress: '0xtoken', spender: '0xspender', amount: 1000n }));
        expect(batch.size()).toBe(2);
    });
    it('should reject operations on different chains', () => {
        const op = createTransferOperation({ chainId: 137, from: '0x1', to: '0x2', value: 100n });
        expect(() => batch.add(op)).toThrow('chain');
    });
    it('should remove an operation by index', () => {
        const op = createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n });
        batch.add(op);
        const removed = batch.removeAt(0);
        expect(removed).toBe(op);
        expect(batch.size()).toBe(0);
    });
    it('should clear all operations', () => {
        batch
            .add(createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n }))
            .add(createTransferOperation({ chainId: 1, from: '0x1', to: '0x3', value: 200n }));
        batch.clear();
        expect(batch.size()).toBe(0);
    });
    it('should validate empty batch', () => {
        const result = batch.validate();
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });
    it('should validate a correct batch', () => {
        batch.add(createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n }));
        const result = batch.validate();
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });
    it('should estimate gas for the batch', () => {
        batch
            .add(createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n }))
            .add(createSwapOperation({
            chainId: 1, from: '0x1', fromToken: '0xtokenA', toToken: '0xtokenB',
            fromAmount: 1000n, minToAmount: 900n,
        }));
        const gas = batch.estimate();
        expect(gas).toBeGreaterThan(0n);
        // transfer(65000) + swap(150000) = 215000
        expect(gas).toBe(215000n);
    });
    it('should produce a valid summary', () => {
        batch.add(createTransferOperation({ chainId: 1, from: '0x1', to: '0x2', value: 100n }));
        const summary = batch.summary();
        expect(summary.operationCount).toBe(1);
        expect(summary.valid).toBe(true);
        expect(summary.estimatedGas).toBeGreaterThan(0n);
    });
});
