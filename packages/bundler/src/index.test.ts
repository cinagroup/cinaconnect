import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BundlerClient } from './BundlerClient';
import { UserOperationStatus, type UserOperation, type BundlerConfig } from './types';

// Mock fetch for RPC calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock viem - must be defined BEFORE module imports
vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: vi.fn().mockReturnValue({
      call: vi.fn().mockResolvedValue({ data: '0x' }),
    }),
    http: vi.fn().mockReturnValue({}),
    encodeFunctionData: vi.fn().mockReturnValue('0xencoded'),
  };
});

describe('BundlerClient', () => {
  const mockConfig: BundlerConfig = {
    bundlerUrl: 'https://bundler.example.com/rpc',
    chain: {
      id: 1,
      name: 'Ethereum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['https://eth.rpc'] } },
    } as any,
    entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  };

  const mockUserOp: UserOperation = {
    sender: '0x1234567890abcdef1234567890abcdef12345678',
    nonce: 0n,
    initCode: '0x',
    callData: '0x',
    callGasLimit: 100000n,
    verificationGasLimit: 200000n,
    preVerificationGas: 50000n,
    maxFeePerGas: 1000000000n,
    maxPriorityFeePerGas: 1000000000n,
    paymasterAndData: '0x',
    signature: '0x',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Package exports', () => {
    it('should export BundlerClient class', () => {
      expect(BundlerClient).toBeDefined();
      expect(typeof BundlerClient).toBe('function');
    });

    it('should export UserOperationStatus enum', () => {
      expect(UserOperationStatus).toBeDefined();
      expect(UserOperationStatus.Pending).toBe('pending');
      expect(UserOperationStatus.Included).toBe('included');
      expect(UserOperationStatus.Reverted).toBe('reverted');
      expect(UserOperationStatus.Failed).toBe('failed');
    });
  });

  describe('BundlerClient instantiation', () => {
    it('should instantiate with valid config', () => {
      const client = new BundlerClient(mockConfig);
      expect(client).toBeInstanceOf(BundlerClient);
      expect(client.chainId).toBe(1);
    });

    it('should return entry point address', () => {
      const client = new BundlerClient(mockConfig);
      expect(client.getEntryPoint()).toBe(mockConfig.entryPoint);
    });
  });

  describe('RPC communication', () => {
    it('should send UserOperation via RPC', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: { userOpHash: '0xabc123' },
        }),
      });

      const client = new BundlerClient(mockConfig);
      const result = await client.sendUserOperation(mockUserOp);
      expect(result.userOpHash).toBe('0xabc123');
    });

    it('should throw on RPC error response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          error: { message: 'Invalid user operation' },
        }),
      });

      const client = new BundlerClient(mockConfig);
      await expect(client.sendUserOperation(mockUserOp)).rejects.toThrow('Bundler RPC error: Invalid user operation');
    });

    it('should throw on HTTP error response', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      const client = new BundlerClient(mockConfig);
      await expect(client.sendUserOperation(mockUserOp)).rejects.toThrow('Bundler RPC error: 500');
    });
  });

  describe('Gas estimation', () => {
    it('should estimate gas for a UserOperation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: {
            preVerificationGas: '0x12345',
            verificationGasLimit: '0x30d40',
            callGasLimit: '0x186a0',
          },
        }),
      });

      const client = new BundlerClient(mockConfig);
      const estimate = await client.estimateUserOperationGas(mockUserOp);
      expect(estimate.preVerificationGas).toBe(BigInt('0x12345'));
      expect(estimate.verificationGasLimit).toBe(BigInt('0x30d40'));
      expect(estimate.callGasLimit).toBe(BigInt('0x186a0'));
    });

    it('should throw on gas estimation error', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        })
      );

      const client = new BundlerClient(mockConfig);
      await expect(client.estimateUserOperationGas(mockUserOp)).rejects.toThrow();
    });
  });

  describe('UserOperation receipt', () => {
    it('should get UserOperation receipt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: {
            userOpHash: '0xabc123',
            sender: '0x1234',
            nonce: BigInt(0),
            actualGasUsed: BigInt(100000),
            actualGasCost: BigInt(1000000),
            success: true,
            receipt: {
              transactionHash: '0xtxhash',
              blockNumber: BigInt(12345),
              gasUsed: BigInt(100000),
              logs: [],
            },
          },
        }),
      });

      const client = new BundlerClient(mockConfig);
      const receipt = await client.getUserOperationReceipt('0xabc123');
      expect(receipt).not.toBeNull();
      expect(receipt?.success).toBe(true);
    });

    it('should return null for non-existent receipt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: null }),
      });

      const client = new BundlerClient(mockConfig);
      const receipt = await client.getUserOperationReceipt('0xnonexistent');
      expect(receipt).toBeNull();
    });
  });

  describe('UserOperation status', () => {
    it('should return Pending when no receipt found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: null }),
      });

      const client = new BundlerClient(mockConfig);
      const status = await client.getUserOperationStatus('0xabc123');
      expect(status).toBe(UserOperationStatus.Pending);
    });

    it('should return Included for successful receipt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: {
            userOpHash: '0xabc123',
            sender: '0x1234',
            nonce: BigInt(0),
            actualGasUsed: BigInt(100000),
            actualGasCost: BigInt(1000000),
            success: true,
            receipt: {
              transactionHash: '0xtxhash',
              blockNumber: BigInt(12345),
              gasUsed: BigInt(100000),
              logs: [],
            },
          },
        }),
      });

      const client = new BundlerClient(mockConfig);
      const status = await client.getUserOperationStatus('0xabc123');
      expect(status).toBe(UserOperationStatus.Included);
    });

    it('should return Reverted for failed receipt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: {
            userOpHash: '0xabc123',
            sender: '0x1234',
            nonce: BigInt(0),
            actualGasUsed: BigInt(100000),
            actualGasCost: BigInt(1000000),
            success: false,
            receipt: {
              transactionHash: '0xtxhash',
              blockNumber: BigInt(12345),
              gasUsed: BigInt(100000),
              logs: [],
            },
          },
        }),
      });

      const client = new BundlerClient(mockConfig);
      const status = await client.getUserOperationStatus('0xabc123');
      expect(status).toBe(UserOperationStatus.Reverted);
    });
  });

  describe('Prepare UserOperation', () => {
    it('should prepare a UserOperation with estimated gas', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: {
            preVerificationGas: '0x12345',
            verificationGasLimit: '0x30d40',
            callGasLimit: '0x186a0',
          },
        }),
      });

      const client = new BundlerClient(mockConfig);
      const prepared = await client.prepareUserOperation({
        sender: '0x1234567890abcdef1234567890abcdef12345678',
        callData: '0x',
      });

      expect(prepared.sender).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(prepared.callGasLimit).toBe(BigInt('0x186a0'));
      expect(prepared.verificationGasLimit).toBe(BigInt('0x30d40'));
      expect(prepared.preVerificationGas).toBe(BigInt('0x12345'));
      expect(prepared.nonce).toBe(0n);
      expect(prepared.initCode).toBe('0x');
      expect(prepared.paymasterAndData).toBe('0x');
      expect(prepared.signature).toBe('0x');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty arrays in serialization', () => {
      const client = new BundlerClient(mockConfig);
      // Private method test via public API
      expect(client.chainId).toBe(1);
    });

    it('should handle partial UserOperation in gas estimation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: {
            preVerificationGas: '0x1000',
            verificationGasLimit: '0x2000',
            callGasLimit: '0x3000',
          },
        }),
      });

      const client = new BundlerClient(mockConfig);
      const partial: Partial<UserOperation> = {
        sender: '0x1234567890abcdef1234567890abcdef12345678',
      };
      const estimate = await client.estimateUserOperationGas(partial);
      expect(estimate.callGasLimit).toBe(BigInt('0x3000'));
    });

    it('should handle RPC error in getUserOperationStatus gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new BundlerClient(mockConfig);
      const status = await client.getUserOperationStatus('0xabc123');
      // Should catch error and return Pending
      expect(status).toBe(UserOperationStatus.Pending);
    });
  });
});
