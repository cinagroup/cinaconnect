/**
 * Tests for on-chain batch execution with mock WalletClient.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address, Hex, WalletClient, PublicClient } from 'viem';
import { BatchTransaction } from '../src/batch.js';
import { BatchExecutor } from '../src/executor.js';
import { createTransferOperation } from '../src/operations/transfer.js';
import { createApproveOperation } from '../src/operations/approve.js';
import { createCustomOperation } from '../src/operations/custom.js';
import {
  encodeMultiSendCall,
  encodeMultiSendBatch,
  buildMultiSendCalldata,
  operationToMultiSendCall,
  operationsToMultiSendCalldata,
  getMultiSendAddress,
  MULTI_SEND_ABI,
} from '../src/multisend.js';

// ---------------------------------------------------------------------------
// Mock WalletClient factory
// ---------------------------------------------------------------------------

function createMockWalletClient(
  overrides: {
    account?: Address;
    sendTxHash?: Hex;
    sendTxError?: Error;
    requestResult?: unknown;
    requestError?: Error;
  } = {},
): WalletClient {
  const account: Address = overrides.account ?? '0x1234567890123456789012345678901234567890';

  return {
    account,
    chain: undefined as any,
    transport: undefined as any,
    sendTransaction: vi.fn().mockImplementation(async () => {
      if (overrides.sendTxError) {
        throw overrides.sendTxError;
      }
      return overrides.sendTxHash ?? '0xmocktxhash123';
    }),
    request: vi.fn().mockImplementation(async ({ method }: { method: string }) => {
      if (overrides.requestError) {
        throw overrides.requestError;
      }
      if (method === 'wallet_sendCalls') {
        return overrides.requestResult ?? { id: '0xmockBatchId' };
      }
      if (method === 'wallet_getCapabilities') {
        return {};
      }
      throw new Error(`Unsupported RPC method: ${method}`);
    }),
  } as unknown as WalletClient;
}

function createMockPublicClient(
  overrides: {
    estimateGasResult?: bigint;
    estimateGasError?: Error;
  } = {},
): PublicClient {
  return {
    estimateGas: vi.fn().mockImplementation(async () => {
      if (overrides.estimateGasError) {
        throw overrides.estimateGasError;
      }
      return overrides.estimateGasResult ?? 500000n;
    }),
  } as unknown as PublicClient;
}

// ---------------------------------------------------------------------------
// MultiSend Encoding Tests
// ---------------------------------------------------------------------------

describe('MultiSend Encoding', () => {
  it('should encode a single native transfer call', () => {
    const call = {
      operationType: 0 as const,
      to: '0x1234567890123456789012345678901234567890' as Address,
      value: 1000000000000000000n, // 1 ETH
      data: '0x' as Hex,
    };

    const encoded = encodeMultiSendCall(call);
    // Should start with operation type (00)
    expect(encoded.startsWith('0x00')).toBe(true);
    // Should be longer than just the address
    expect(encoded.length).toBeGreaterThan(42);
  });

  it('should encode a contract call with data', () => {
    const call = {
      operationType: 0 as const,
      to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address,
      value: 0n,
      data: '0xa9059cbb' as Hex, // transfer selector
    };

    const encoded = encodeMultiSendCall(call);
    expect(encoded).toBeDefined();
    expect(encoded.startsWith('0x00')).toBe(true);
  });

  it('should encode multiple calls into a single batch', () => {
    const calls = [
      {
        operationType: 0 as const,
        to: '0x1234567890123456789012345678901234567890' as Address,
        value: 100n,
        data: '0x' as Hex,
      },
      {
        operationType: 0 as const,
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address,
        value: 0n,
        data: '0xa9059cbb' as Hex,
      },
    ];

    const encoded = encodeMultiSendBatch(calls);
    expect(encoded).toBeDefined();
    expect(encoded.length).toBeGreaterThan(4);
  });

  it('should build MultiSend execute calldata', () => {
    const calls = [
      {
        operationType: 0 as const,
        to: '0x1234567890123456789012345678901234567890' as Address,
        value: 100n,
        data: '0x' as Hex,
      },
    ];

    const calldata = buildMultiSendCalldata(calls);
    // Should start with execute(bytes) selector 0x8d80ff0a
    expect(calldata.startsWith('0x8d80ff0a')).toBe(true);
  });

  it('should reject empty batch encoding', () => {
    expect(() => encodeMultiSendBatch([])).toThrow('at least one call');
  });

  it('should convert transfer operations to MultiSend calls', () => {
    // Native ETH transfer
    const nativeOp = createTransferOperation({
      chainId: 1,
      from: '0x0000000000000000000000000000000000001234',
      to: '0x0000000000000000000000000000000000005678',
      value: 1000n,
    });
    const nativeCall = operationToMultiSendCall(nativeOp);
    expect(nativeCall.to).toBe('0x0000000000000000000000000000000000005678' as Address);
    expect(nativeCall.value).toBe(1000n);
    expect(nativeCall.data).toBe('0x');

    // ERC-20 transfer
    const erc20Op = createTransferOperation({
      chainId: 1,
      from: '0x0000000000000000000000000000000000001234',
      to: '0x0000000000000000000000000000000000005678',
      value: 500n,
      tokenAddress: '0x0000000000000000000000000000000000000001',
    });
    const erc20Call = operationToMultiSendCall(erc20Op);
    expect(erc20Call.to).toBe('0x0000000000000000000000000000000000000001' as Address);
    expect(erc20Call.data).toMatch(/^0xa9059cbb/); // transfer selector
  });

  it('should convert approve operations to MultiSend calls', () => {
    const op = createApproveOperation({
      chainId: 1,
      from: '0x0000000000000000000000000000000000001234',
      tokenAddress: '0x0000000000000000000000000000000000000001',
      spender: '0x0000000000000000000000000000000000000002',
      amount: 1000n,
    });
    const call = operationToMultiSendCall(op);
    expect(call.to).toBe('0x0000000000000000000000000000000000000001' as Address);
    expect(call.data).toMatch(/^0x095ea7b3/); // approve selector
  });

  it('should convert custom operations to MultiSend calls', () => {
    const op = createCustomOperation({
      chainId: 1,
      from: '0x0000000000000000000000000000000000001234',
      to: '0x0000000000000000000000000000000000000003',
      data: '0xabcdef01',
      value: 100n,
    });
    const call = operationToMultiSendCall(op);
    expect(call.to).toBe('0x0000000000000000000000000000000000000003' as Address);
    expect(call.data).toBe('0xabcdef01' as Hex);
    expect(call.value).toBe(100n);
  });

  it('should convert swap operations to MultiSend calls (with routeData)', () => {
    const op = {
      type: 'swap' as const,
      chainId: 1,
      from: '0x0000000000000000000000000000000000001234',
      fromToken: '0xtokenA',
      toToken: '0xtokenB',
      fromAmount: 1000n,
      minToAmount: 900n,
      routerAddress: '0x0000000000000000000000000000000000000004',
      routeData: '0xabcdef',
    };
    const call = operationToMultiSendCall(op);
    expect(call.to).toBe('0x0000000000000000000000000000000000000004' as Address);
    expect(call.data).toBe('0xabcdef' as Hex);
  });

  it('should reject swap operations without routeData', () => {
    const op = {
      type: 'swap' as const,
      chainId: 1,
      from: '0x0000000000000000000000000000000000001234',
      fromToken: '0xtokenA',
      toToken: '0xtokenB',
      fromAmount: 1000n,
      minToAmount: 900n,
    };
    expect(() => operationToMultiSendCall(op)).toThrow('routeData');
  });

  it('should convert an array of operations to MultiSend calldata', () => {
    const ops = [
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
      createApproveOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', tokenAddress: '0x0000000000000000000000000000000000000001', spender: '0x0000000000000000000000000000000000000002', amount: 1000n,
      }),
    ];
    const calldata = operationsToMultiSendCalldata(ops);
    expect(calldata.startsWith('0x8d80ff0a')).toBe(true);
  });

  it('should return known MultiSend addresses for supported chains', () => {
    expect(getMultiSendAddress(1)).toBeDefined();
    expect(getMultiSendAddress(11155111)).toBeDefined();
    expect(getMultiSendAddress(137)).toBeDefined();
    expect(getMultiSendAddress(42161)).toBeDefined();
  });

  it('should return undefined for unsupported chains', () => {
    expect(getMultiSendAddress(999999)).toBeUndefined();
  });

  it('should export MULTI_SEND_ABI', () => {
    expect(MULTI_SEND_ABI).toBeDefined();
    expect(MULTI_SEND_ABI.length).toBe(1);
    expect(MULTI_SEND_ABI[0].name).toBe('execute');
  });
});

// ---------------------------------------------------------------------------
// On-Chain Executor Tests (with mock WalletClient)
// ---------------------------------------------------------------------------

describe('BatchExecutor On-Chain', () => {
  let executor: BatchExecutor;

  beforeEach(() => {
    executor = new BatchExecutor({ atomic: true });
  });

  it('should execute via EIP-5792 with mock wallet', async () => {
    const walletClient = createMockWalletClient({
      requestResult: { id: '0xmockBatchId123' },
    });

    const ops = [
      createTransferOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
    ];

    const result = await executor.executeOnChain(ops, {
      walletClient,
      strategy: { mode: 'eip5792' },
    });

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('eip5792');
    expect(result.eip5792BatchId).toBe('0xmockBatchId123');
    expect(result.atomic).toBe(true);
    expect(result.results.length).toBe(1);
    expect(result.results[0].success).toBe(true);
  });

  it('should execute via MultiSend with mock wallet', async () => {
    const walletClient = createMockWalletClient({
      sendTxHash: '0xmultisend_tx_hash',
    });

    const ops = [
      createTransferOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
      createApproveOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        tokenAddress: '0x0000000000000000000000000000000000000001',
        spender: '0x0000000000000000000000000000000000000002',
        amount: 1000n,
      }),
    ];

    const result = await executor.executeOnChain(ops, {
      walletClient,
      strategy: { mode: 'multisend' },
    });

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('multisend');
    expect(result.transactionHash).toBe('0xmultisend_tx_hash');
    expect(result.batchTxHash).toBe('0xmultisend_tx_hash');
    expect(result.atomic).toBe(true);
    expect(result.results.length).toBe(2);
  });

  it('should execute sequentially with mock wallet', async () => {
    const walletClient = createMockWalletClient({
      sendTxHash: '0xseq_tx_hash',
    });

    const ops = [
      createTransferOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
      createCustomOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000003',
        data: '0xabcdef',
      }),
    ];

    const result = await executor.executeOnChain(ops, {
      walletClient,
      strategy: { mode: 'sequential' },
      atomic: false,
    });

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('sequential');
    expect(result.atomic).toBe(false);
    expect(result.results.length).toBe(2);
  });

  it('should handle EIP-5792 failure gracefully', async () => {
    const walletClient = createMockWalletClient({
      requestError: { code: -32601, message: 'Method not found' } as any,
    });

    const ops = [
      createTransferOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
    ];

    // Should fall back to multisend since chain 1 is supported
    const result = await executor.executeOnChain(ops, {
      walletClient,
      strategy: { mode: 'eip5792' },
    });

    // EIP-5792 fails, but it should fall back
    expect(result.strategy === 'eip5792' || result.strategy === 'multisend').toBe(true);
  });

  it('should handle transaction send failure', async () => {
    const walletClient = createMockWalletClient({
      sendTxError: new Error('Transaction reverted'),
    });

    const ops = [
      createTransferOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
    ];

    const result = await executor.executeOnChain(ops, {
      walletClient,
      strategy: { mode: 'multisend' },
    });

    expect(result.success).toBe(false);
    expect(result.strategy).toBe('multisend');
    expect(result.error).toContain('Transaction reverted');
    expect(result.results.every((r) => !r.success)).toBe(true);
  });

  it('should throw when no account is connected', async () => {
    const walletClient = {
      account: null,
      chain: undefined,
      transport: undefined,
      sendTransaction: vi.fn(),
      request: vi.fn(),
    } as unknown as WalletClient;

    const ops = [
      createTransferOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
    ];

    await expect(
      executor.executeOnChain(ops, {
        walletClient,
        strategy: { mode: 'multisend' },
      }),
    ).rejects.toThrow('requires a connected wallet account');
  });

  it('should throw when MultiSend address is unknown', async () => {
    const walletClient = createMockWalletClient();

    const ops = [
      createTransferOperation({
        chainId: 999999, // Unsupported chain
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
    ];

    await expect(
      executor.executeOnChain(ops, {
        walletClient,
        strategy: { mode: 'multisend' },
      }),
    ).rejects.toThrow('No MultiSend contract address known');
  });

  it('should use custom multisend address override', async () => {
    const walletClient = createMockWalletClient({
      sendTxHash: '0xoverride_tx_hash',
    });

    const ops = [
      createTransferOperation({
        chainId: 999999,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
    ];

    const result = await executor.executeOnChain(ops, {
      walletClient,
      strategy: { mode: 'multisend' },
      multisendAddress: '0xCustomMultiSend0000000000000000000000000000',
    });

    expect(result.success).toBe(true);
    expect(result.transactionHash).toBe('0xoverride_tx_hash');
  });

  it('should pass gas overrides to sendTransaction', async () => {
    const walletClient = createMockWalletClient({
      sendTxHash: '0xgas_override_tx',
    });

    const ops = [
      createTransferOperation({
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
      }),
    ];

    const result = await executor.executeOnChain(ops, {
      walletClient,
      strategy: { mode: 'multisend' },
      gasPrice: 20000000000n,
      maxFeePerGas: 25000000000n,
      maxPriorityFeePerGas: 2000000000n,
    });

    expect(result.success).toBe(true);
    expect(walletClient.sendTransaction).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// BatchTransaction executeOnChain Tests
// ---------------------------------------------------------------------------

describe('BatchTransaction executeOnChain', () => {
  it('should execute a batch on-chain via MultiSend', async () => {
    const walletClient = createMockWalletClient({
      sendTxHash: '0xbatch_tx_hash',
    });

    const batch = new BatchTransaction({ chainId: 1, atomic: true });
    batch.add(
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
    );
    batch.add(
      createApproveOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', tokenAddress: '0x0000000000000000000000000000000000000001', spender: '0x0000000000000000000000000000000000000002', amount: 1000n,
      }),
    );

    const result = await batch.executeOnChain({
      walletClient,
      strategy: { mode: 'multisend' },
    });

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('multisend');
    expect(result.results.length).toBe(2);
  });

  it('should execute a batch on-chain via EIP-5792', async () => {
    const walletClient = createMockWalletClient({
      requestResult: { id: '0x5792_batch_id' },
    });

    const batch = new BatchTransaction({ chainId: 1, atomic: true });
    batch.add(
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
    );

    const result = await batch.executeOnChain({
      walletClient,
      strategy: { mode: 'eip5792' },
    });

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('eip5792');
    expect(result.eip5792BatchId).toBe('0x5792_batch_id');
  });

  it('should reject invalid batch on-chain', async () => {
    const walletClient = createMockWalletClient();

    const batch = new BatchTransaction({ chainId: 1, atomic: true });
    // Empty batch - no operations added

    const result = await batch.executeOnChain({
      walletClient,
      strategy: { mode: 'multisend' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject batch exceeding max gas', async () => {
    const walletClient = createMockWalletClient();

    const batch = new BatchTransaction({
      chainId: 1,
      atomic: true,
      maxGas: 1000n, // Very low
    });
    batch.add(
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
    );

    const result = await batch.executeOnChain({
      walletClient,
      strategy: { mode: 'multisend' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds max');
  });

  it('should estimate gas with breakdown', async () => {
    const batch = new BatchTransaction({ chainId: 1 });
    batch.add(
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
    );
    batch.add(
      createApproveOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', tokenAddress: '0x0000000000000000000000000000000000000001', spender: '0x0000000000000000000000000000000000000002', amount: 1000n,
      }),
    );

    const estimate = await batch.estimateWithBreakdown();
    expect(estimate.baseGas).toBeGreaterThan(0n);
    expect(estimate.totalGas).toBeGreaterThanOrEqual(estimate.baseGas);
    expect(estimate.perOperation.length).toBe(2);
    expect(estimate.perOperation[0].type).toBe('transfer');
    expect(estimate.perOperation[1].type).toBe('approve');
  });

  it('should estimate with publicClient override', async () => {
    const publicClient = createMockPublicClient({
      estimateGasResult: 800000n,
    });

    const batch = new BatchTransaction({ chainId: 1 });
    batch.add(
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
    );

    const estimate = await batch.estimateWithBreakdown(publicClient);
    expect(estimate.totalGas).toBe(800000n); // On-chain estimate
  });
});

// ---------------------------------------------------------------------------
// Gas Estimation Tests
// ---------------------------------------------------------------------------

describe('BatchGasEstimate', () => {
  it('should calculate base gas with defaults', async () => {
    const executor = new BatchExecutor();
    const ops = [
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
      createApproveOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', tokenAddress: '0x0000000000000000000000000000000000000001', spender: '0x0000000000000000000000000000000000000002', amount: 1000n,
      }),
    ];

    const estimate = await executor.estimateBatchGas(ops);
    // transfer: 65000, approve: 46000 = 111000 base
    expect(estimate.baseGas).toBe(111000n);
    expect(estimate.overheadGas).toBe(11100n); // 10%
    expect(estimate.totalGas).toBe(122100n);
    expect(estimate.perOperation.length).toBe(2);
  });

  it('should use custom gasEstimate from operations', async () => {
    const executor = new BatchExecutor();
    const ops = [
      {
        type: 'transfer' as const,
        chainId: 1,
        from: '0x0000000000000000000000000000000000000010',
        to: '0x0000000000000000000000000000000000000020',
        value: 100n,
        gasEstimate: 100000n,
      },
    ];

    const estimate = await executor.estimateBatchGas(ops);
    expect(estimate.baseGas).toBe(100000n);
  });

  it('should use on-chain estimation when publicClient is available', async () => {
    const publicClient = createMockPublicClient({
      estimateGasResult: 500000n,
    });

    const executor = new BatchExecutor();
    const ops = [
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
    ];

    const estimate = await executor.estimateBatchGas(ops, publicClient);
    expect(estimate.totalGas).toBe(500000n);
  });

  it('should fall back to calculated estimate when on-chain estimation fails', async () => {
    const publicClient = createMockPublicClient({
      estimateGasError: new Error('RPC error'),
    });

    const executor = new BatchExecutor();
    const ops = [
      createTransferOperation({
        chainId: 1, from: '0x0000000000000000000000000000000000000010', to: '0x0000000000000000000000000000000000000020', value: 100n,
      }),
    ];

    const estimate = await executor.estimateBatchGas(ops, publicClient);
    // Should fall back to calculated (65000 + 10% = 71500)
    expect(estimate.totalGas).toBe(71500n);
  });
});
