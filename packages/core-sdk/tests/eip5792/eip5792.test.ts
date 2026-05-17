/**
 * Tests for EIP-5792: Wallet Call API types and utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  WalletCapabilities,
  ChainCapabilities,
  Call,
  SendCallsParams,
  SendCallsResult,
  GetCallsStatusResult,
  AtomicBatchConfig,
  AtomicBatchResult,
} from '../../src/eip5792/index.js';
import {
  walletGetCapabilities,
  hasCapability,
  getChainCapabilities,
  getSupportedChains,
  filterByCapability,
  walletSendCalls,
  sendSingleCall,
  sendErc20Transfer,
  sendBatch,
  walletGetCallsStatus,
  waitForCallsStatus,
  allCallsSucceeded,
  getFailedReceipts,
  supportsAtomicBatch,
  buildAtomicBatch,
  createEthTransferCall,
  createContractCall,
  createErc20ApproveCall,
  createApproveAndSwapCalls,
  validateBatchConfig,
} from '../../src/eip5792/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as const;
const MOCK_ADDRESS_2 = '0xabcdef1234567890abcdef1234567890abcdef12' as const;
const MOCK_CHAIN = '0x1';

function createMockClient(overrides: Record<string, unknown> = {}) {
  return {
    account: MOCK_ADDRESS,
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method === 'wallet_getCapabilities') {
        return {
          [MOCK_CHAIN]: {
            paymasterService: { supported: true },
            sessionKeys: { supported: false },
          },
        };
      }
      if (method === 'wallet_sendCalls') {
        return { id: 'batch-123' };
      }
      if (method === 'wallet_getCallsStatus') {
        return {
          status: 'CONFIRMED',
          receipts: [
            {
              receipt: {
                status: '0x1',
                transactionHash: '0xtxhash',
              },
            },
          ],
        };
      }
      throw new Error(`Unknown method: ${method}`);
    }),
    ...overrides,
  } as any;
}

// ---------------------------------------------------------------------------
// Types validation tests
// ---------------------------------------------------------------------------

describe('EIP-5792 types', () => {
  it('should accept valid WalletCapabilities shape', () => {
    const caps: WalletCapabilities = {
      '0x1': {
        paymasterService: { supported: true },
        sessionKeys: { supported: true },
        atomicBatch: { supported: true },
      },
      '0x89': {
        paymasterService: { supported: false },
      },
    };
    expect(caps['0x1'].paymasterService?.supported).toBe(true);
    expect(caps['0x89'].paymasterService?.supported).toBe(false);
  });

  it('should accept valid Call shape', () => {
    const call: Call = {
      to: MOCK_ADDRESS,
      value: '0xde0b6b3a7640000',
      data: '0xa9059cbb',
      id: 'call-1',
    };
    expect(call.to).toBe(MOCK_ADDRESS);
    expect(call.value).toBe('0xde0b6b3a7640000');
  });

  it('should accept valid SendCallsParams shape', () => {
    const params: SendCallsParams = {
      version: '1.0.0',
      calls: [
        { to: MOCK_ADDRESS, value: '0x0' },
      ],
      chainId: '0x1',
      from: MOCK_ADDRESS,
      capabilities: {
        '0x1': { paymasterService: { supported: true } },
      },
    };
    expect(params.version).toBe('1.0.0');
    expect(params.calls).toHaveLength(1);
  });

  it('should accept valid SendCallsResult shape', () => {
    const result: SendCallsResult = { id: 'batch-abc123' };
    expect(result.id).toBe('batch-abc123');
  });

  it('should accept valid GetCallsStatusResult shape', () => {
    const result: GetCallsStatusResult = {
      status: 'PENDING',
    };
    expect(result.status).toBe('PENDING');
    expect(result.receipts).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Capabilities tests
// ---------------------------------------------------------------------------

describe('walletGetCapabilities', () => {
  it('should return capabilities from the wallet', async () => {
    const client = createMockClient();
    const result = await walletGetCapabilities(client, MOCK_ADDRESS);
    expect(result['0x1']?.paymasterService?.supported).toBe(true);
    expect(client.request).toHaveBeenCalledWith({
      method: 'wallet_getCapabilities',
      params: [MOCK_ADDRESS],
    });
  });

  it('should use client.account if no account provided', async () => {
    const client = createMockClient();
    const result = await walletGetCapabilities(client);
    expect(client.request).toHaveBeenCalledWith({
      method: 'wallet_getCapabilities',
      params: [MOCK_ADDRESS],
    });
  });

  it('should throw if no account is available', async () => {
    const client = createMockClient({ account: undefined });
    await expect(walletGetCapabilities(client)).rejects.toThrow(
      'wallet_getCapabilities requires an account address',
    );
  });

  it('should return empty object when wallet does not support EIP-5792', async () => {
    const client = createMockClient();
    client.request = vi.fn(async () => {
      const err = new Error('Method not found') as any;
      err.code = -32601;
      throw err;
    });
    const result = await walletGetCapabilities(client, MOCK_ADDRESS);
    expect(result).toEqual({});
  });

  it('should re-throw non-method-not-found errors', async () => {
    const client = createMockClient();
    client.request = vi.fn(async () => {
      throw new Error('Connection refused');
    });
    await expect(walletGetCapabilities(client, MOCK_ADDRESS)).rejects.toThrow(
      'Connection refused',
    );
  });
});

describe('hasCapability', () => {
  it('should return true when capability is supported', () => {
    const caps: WalletCapabilities = {
      '0x1': { paymasterService: { supported: true } },
    };
    expect(hasCapability(caps, '0x1', 'paymasterService')).toBe(true);
  });

  it('should return false when capability is not supported', () => {
    const caps: WalletCapabilities = {
      '0x1': { paymasterService: { supported: false } },
    };
    expect(hasCapability(caps, '0x1', 'paymasterService')).toBe(false);
  });

  it('should return false for unknown chain', () => {
    const caps: WalletCapabilities = {};
    expect(hasCapability(caps, '0x999', 'paymasterService')).toBe(false);
  });

  it('should return false when capability key is missing', () => {
    const caps: WalletCapabilities = {
      '0x1': {},
    };
    expect(hasCapability(caps, '0x1', 'atomicBatch')).toBe(false);
  });
});

describe('getChainCapabilities', () => {
  it('should return capabilities for a known chain', () => {
    const caps: WalletCapabilities = {
      '0x1': { paymasterService: { supported: true } },
    };
    const chainCaps = getChainCapabilities(caps, '0x1');
    expect(chainCaps.paymasterService?.supported).toBe(true);
  });

  it('should return empty object for unknown chain', () => {
    const caps: WalletCapabilities = {};
    expect(getChainCapabilities(caps, '0x999')).toEqual({});
  });
});

describe('getSupportedChains', () => {
  it('should return all chain IDs', () => {
    const caps: WalletCapabilities = {
      '0x1': { paymasterService: { supported: true } },
      '0x89': { paymasterService: { supported: true } },
      '0xa': { paymasterService: { supported: true } },
    };
    const chains = getSupportedChains(caps);
    expect(chains).toContain('0x1');
    expect(chains).toContain('0x89');
    expect(chains).toContain('0xa');
    expect(chains).toHaveLength(3);
  });

  it('should return empty array for no capabilities', () => {
    expect(getSupportedChains({})).toEqual([]);
  });
});

describe('filterByCapability', () => {
  it('should filter to only chains supporting the capability', () => {
    const caps: WalletCapabilities = {
      '0x1': { paymasterService: { supported: true } },
      '0x89': { paymasterService: { supported: false } },
      '0xa': { paymasterService: { supported: true } },
    };
    const filtered = filterByCapability(caps, 'paymasterService');
    expect(filtered['0x1']).toBeDefined();
    expect(filtered['0x89']).toBeUndefined();
    expect(filtered['0xa']).toBeDefined();
    expect(Object.keys(filtered)).toHaveLength(2);
  });

  it('should return empty when no chain supports the capability', () => {
    const caps: WalletCapabilities = {
      '0x1': { paymasterService: { supported: false } },
    };
    expect(filterByCapability(caps, 'paymasterService')).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Send Calls tests
// ---------------------------------------------------------------------------

describe('walletSendCalls', () => {
  it('should send calls and return batch ID', async () => {
    const client = createMockClient();
    const result = await walletSendCalls(client, {
      version: '1.0.0',
      calls: [{ to: MOCK_ADDRESS }],
      chainId: '0x1',
      from: MOCK_ADDRESS,
    });
    expect(result.id).toBe('batch-123');
    expect(client.request).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: [{
        version: '1.0.0',
        chainId: '0x1',
        from: MOCK_ADDRESS,
        calls: [{ to: MOCK_ADDRESS }],
      }],
    });
  });

  it('should include capabilities when provided', async () => {
    const client = createMockClient();
    await walletSendCalls(client, {
      version: '1.0.0',
      calls: [{ to: MOCK_ADDRESS }],
      from: MOCK_ADDRESS,
      capabilities: { '0x1': { paymasterService: { supported: true } } },
    });
    expect(client.request).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: [{
        version: '1.0.0',
        chainId: '0x1',
        from: MOCK_ADDRESS,
        calls: [{ to: MOCK_ADDRESS }],
        capabilities: { '0x1': { paymasterService: { supported: true } } },
      }],
    });
  });

  it('should use client account as fallback for from', async () => {
    const client = createMockClient();
    await walletSendCalls(client, {
      version: '1.0.0',
      calls: [{ to: MOCK_ADDRESS }],
    } as any);
    expect(client.request).toHaveBeenCalled();
  });

  it('should throw when no from address and no client account', async () => {
    const client = createMockClient({ account: undefined });
    await expect(
      walletSendCalls(client, {
        version: '1.0.0',
        calls: [{ to: MOCK_ADDRESS }],
      } as any),
    ).rejects.toThrow('wallet_sendCalls requires a "from" address');
  });

  it('should throw descriptive error when wallet does not support sendCalls', async () => {
    const client = createMockClient();
    client.request = vi.fn(async () => {
      const err = new Error('Not found') as any;
      err.code = -32601;
      throw err;
    });
    await expect(
      walletSendCalls(client, {
        version: '1.0.0',
        calls: [{ to: MOCK_ADDRESS }],
        from: MOCK_ADDRESS,
      }),
    ).rejects.toThrow('wallet_sendCalls is not supported by this wallet');
  });
});

describe('sendSingleCall', () => {
  it('should wrap a single call in walletSendCalls', async () => {
    const client = createMockClient();
    const call: Call = { to: MOCK_ADDRESS, data: '0xa9059cbb' as `0x${string}` };
    const result = await sendSingleCall(client, call, MOCK_ADDRESS, '0x1');
    expect(result.id).toBe('batch-123');
    expect(client.request).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: [{
        version: '1.0.0',
        chainId: '0x1',
        from: MOCK_ADDRESS,
        calls: [call],
      }],
    });
  });
});

describe('sendErc20Transfer', () => {
  it('should create ERC-20 transfer call', async () => {
    const client = createMockClient();
    const result = await sendErc20Transfer(
      client,
      MOCK_ADDRESS,
      MOCK_ADDRESS_2,
      1000n,
      MOCK_ADDRESS,
      '0x1',
    );
    expect(result.id).toBe('batch-123');
    expect(client.request).toHaveBeenCalled();
  });

  it('should accept string amount', async () => {
    const client = createMockClient();
    const result = await sendErc20Transfer(
      client,
      MOCK_ADDRESS,
      MOCK_ADDRESS_2,
      '0x3e8',
      MOCK_ADDRESS,
    );
    expect(result.id).toBe('batch-123');
  });
});

describe('sendBatch', () => {
  it('should send multiple calls', async () => {
    const client = createMockClient();
    const calls: Call[] = [
      { to: MOCK_ADDRESS, value: '0x0' },
      { to: MOCK_ADDRESS_2, data: '0x' },
    ];
    const result = await sendBatch(client, calls, MOCK_ADDRESS, '0x1');
    expect(result.id).toBe('batch-123');
  });

  it('should throw on empty calls array', async () => {
    const client = createMockClient();
    await expect(sendBatch(client, [], MOCK_ADDRESS)).rejects.toThrow(
      'sendBatch requires at least one call',
    );
  });
});

// ---------------------------------------------------------------------------
// Get Calls Status tests
// ---------------------------------------------------------------------------

describe('walletGetCallsStatus', () => {
  it('should return call status', async () => {
    const client = createMockClient();
    const result = await walletGetCallsStatus(client, 'batch-123');
    expect(result.status).toBe('CONFIRMED');
    expect(result.receipts).toBeDefined();
    expect(client.request).toHaveBeenCalledWith({
      method: 'wallet_getCallsStatus',
      params: ['batch-123'],
    });
  });

  it('should throw when wallet does not support getCallsStatus', async () => {
    const client = createMockClient();
    client.request = vi.fn(async () => {
      const err = new Error('Not found') as any;
      err.code = -32601;
      throw err;
    });
    await expect(walletGetCallsStatus(client, 'batch-123')).rejects.toThrow(
      'wallet_getCallsStatus is not supported by this wallet',
    );
  });
});

describe('waitForCallsStatus', () => {
  it('should resolve when status is CONFIRMED', async () => {
    const client = createMockClient();
    const result = await waitForCallsStatus(client, 'batch-123', {
      intervalMs: 100,
      timeoutMs: 1000,
    });
    expect(result.status).toBe('CONFIRMED');
  });

  it('should timeout if status stays PENDING', async () => {
    const client = createMockClient();
    client.request = vi.fn(async () => ({ status: 'PENDING' }));
    await expect(
      waitForCallsStatus(client, 'batch-123', {
        intervalMs: 50,
        timeoutMs: 200,
      }),
    ).rejects.toThrow('waitForCallsStatus timed out');
  });

  it('should respect abort signal', async () => {
    const client = createMockClient();
    client.request = vi.fn(async () => ({ status: 'PENDING' }));
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    await expect(
      waitForCallsStatus(client, 'batch-123', {
        intervalMs: 50,
        timeoutMs: 5000,
        signal: controller.signal,
      }),
    ).rejects.toThrow('waitForCallsStatus aborted');
  });
});

describe('allCallsSucceeded', () => {
  it('should return true when all calls succeed', () => {
    const result: GetCallsStatusResult = {
      status: 'CONFIRMED',
      receipts: [
        { receipt: { status: '0x1', transactionHash: '0x1' } },
        { receipt: { status: '0x1', transactionHash: '0x2' } },
      ],
    };
    expect(allCallsSucceeded(result)).toBe(true);
  });

  it('should return false when any call fails', () => {
    const result: GetCallsStatusResult = {
      status: 'CONFIRMED',
      receipts: [
        { receipt: { status: '0x1', transactionHash: '0x1' } },
        { receipt: { status: '0x0', transactionHash: '0x2' } },
      ],
    };
    expect(allCallsSucceeded(result)).toBe(false);
  });

  it('should return false when status is PENDING', () => {
    const result: GetCallsStatusResult = { status: 'PENDING' };
    expect(allCallsSucceeded(result)).toBe(false);
  });

  it('should return false when no receipts', () => {
    const result: GetCallsStatusResult = {
      status: 'CONFIRMED',
      receipts: [],
    };
    expect(allCallsSucceeded(result)).toBe(false);
  });
});

describe('getFailedReceipts', () => {
  it('should return only failed receipts', () => {
    const result: GetCallsStatusResult = {
      status: 'CONFIRMED',
      receipts: [
        { receipt: { status: '0x1', transactionHash: '0x1' } },
        { receipt: { status: '0x0', transactionHash: '0x2' } },
        { receipt: { status: '0x0', transactionHash: '0x3' } },
      ],
    };
    const failed = getFailedReceipts(result);
    expect(failed).toHaveLength(2);
    expect(failed[0].receipt.transactionHash).toBe('0x2');
    expect(failed[1].receipt.transactionHash).toBe('0x3');
  });

  it('should return empty array when all succeed', () => {
    const result: GetCallsStatusResult = {
      status: 'CONFIRMED',
      receipts: [
        { receipt: { status: '0x1', transactionHash: '0x1' } },
      ],
    };
    expect(getFailedReceipts(result)).toEqual([]);
  });

  it('should return empty array when PENDING', () => {
    const result: GetCallsStatusResult = { status: 'PENDING' };
    expect(getFailedReceipts(result)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Atomic batch tests
// ---------------------------------------------------------------------------

describe('supportsAtomicBatch', () => {
  it('should return true for known chains', () => {
    expect(supportsAtomicBatch('0x1')).toBe(true);
    expect(supportsAtomicBatch('0xaa36a7')).toBe(true);
    expect(supportsAtomicBatch('0x89')).toBe(true);
    expect(supportsAtomicBatch('0xa4b1')).toBe(true);
    expect(supportsAtomicBatch('0xa')).toBe(true);
    expect(supportsAtomicBatch('0x2105')).toBe(true);
  });

  it('should return false for unknown chains', () => {
    expect(supportsAtomicBatch('0x999')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(supportsAtomicBatch('0X1')).toBe(true);
  });
});

describe('buildAtomicBatch', () => {
  it('should build valid batch params', () => {
    const config: AtomicBatchConfig = {
      chainId: '0x1',
      from: MOCK_ADDRESS,
      calls: [{ to: MOCK_ADDRESS }],
    };
    const result = buildAtomicBatch(config);
    expect(result.params.version).toBe('1.0.0');
    expect(result.params.chainId).toBe('0x1');
    expect(result.params.from).toBe(MOCK_ADDRESS);
    expect(result.params.calls).toHaveLength(1);
    expect(result.isAtomic).toBe(true);
  });

  it('should include capabilities when provided', () => {
    const caps: WalletCapabilities = { '0x1': { paymasterService: { supported: true } } };
    const config: AtomicBatchConfig = {
      chainId: '0x1',
      from: MOCK_ADDRESS,
      calls: [{ to: MOCK_ADDRESS }],
      capabilities: caps,
    };
    const result = buildAtomicBatch(config);
    expect(result.params.capabilities).toEqual(caps);
  });

  it('should mark non-atomic chains', () => {
    const config: AtomicBatchConfig = {
      chainId: '0x999',
      from: MOCK_ADDRESS,
      calls: [{ to: MOCK_ADDRESS }],
    };
    const result = buildAtomicBatch(config);
    expect(result.isAtomic).toBe(false);
  });
});

describe('createEthTransferCall', () => {
  it('should create an ETH transfer call', () => {
    const call = createEthTransferCall(MOCK_ADDRESS, 1000000000000000000n);
    expect(call.to).toBe(MOCK_ADDRESS);
    expect(call.value).toBe('0xde0b6b3a7640000');
  });
});

describe('createContractCall', () => {
  it('should create a contract call without value', () => {
    const call = createContractCall(MOCK_ADDRESS, '0xa9059cbb');
    expect(call.to).toBe(MOCK_ADDRESS);
    expect(call.data).toBe('0xa9059cbb');
    expect(call.value).toBeUndefined();
  });

  it('should create a contract call with value', () => {
    const call = createContractCall(MOCK_ADDRESS, '0x', 100n);
    expect(call.value).toBe('0x64');
  });
});

describe('createErc20ApproveCall', () => {
  it('should create an ERC-20 approve call', () => {
    const call = createErc20ApproveCall(MOCK_ADDRESS, MOCK_ADDRESS_2, 1000n);
    expect(call.to).toBe(MOCK_ADDRESS);
    expect(call.data?.startsWith('0x095ea7b3')).toBe(true);
    expect(call.value).toBeUndefined();
  });
});

describe('createApproveAndSwapCalls', () => {
  it('should create approve + swap calls', () => {
    const swapCall: Call = { to: MOCK_ADDRESS_2, data: '0x' as `0x${string}` };
    const calls = createApproveAndSwapCalls(
      MOCK_ADDRESS,
      MOCK_ADDRESS_2,
      1000n,
      [swapCall],
    );
    expect(calls).toHaveLength(2);
    expect(calls[0].data?.startsWith('0x095ea7b3')).toBe(true);
    expect(calls[1].to).toBe(MOCK_ADDRESS_2);
  });
});

describe('validateBatchConfig', () => {
  it('should pass for valid config', () => {
    const config: AtomicBatchConfig = {
      chainId: '0x1',
      from: MOCK_ADDRESS,
      calls: [{ to: MOCK_ADDRESS }],
    };
    expect(() => validateBatchConfig(config)).not.toThrow();
  });

  it('should throw when chainId is missing', () => {
    const config = { from: MOCK_ADDRESS, calls: [{ to: MOCK_ADDRESS }] } as any;
    expect(() => validateBatchConfig(config)).toThrow('chainId is required');
  });

  it('should throw when from is missing', () => {
    const config = { chainId: '0x1', calls: [{ to: MOCK_ADDRESS }] } as any;
    expect(() => validateBatchConfig(config)).toThrow('from address is required');
  });

  it('should throw when calls is empty', () => {
    const config = { chainId: '0x1', from: MOCK_ADDRESS, calls: [] } as any;
    expect(() => validateBatchConfig(config)).toThrow('at least one call is required');
  });

  it('should throw when a call is missing "to"', () => {
    const config: AtomicBatchConfig = {
      chainId: '0x1',
      from: MOCK_ADDRESS,
      calls: [{} as Call],
    };
    expect(() => validateBatchConfig(config)).toThrow("'to' address is required");
  });

  it('should throw when a call has invalid hex value', () => {
    const config: AtomicBatchConfig = {
      chainId: '0x1',
      from: MOCK_ADDRESS,
      calls: [{ to: MOCK_ADDRESS, value: 'not-hex' as any }],
    };
    expect(() => validateBatchConfig(config)).toThrow('invalid hex value');
  });

  it('should throw when a call has invalid hex data', () => {
    const config: AtomicBatchConfig = {
      chainId: '0x1',
      from: MOCK_ADDRESS,
      calls: [{ to: MOCK_ADDRESS, data: 'not-hex' as any }],
    };
    expect(() => validateBatchConfig(config)).toThrow('invalid hex data');
  });
});
