/**
 * @cinacoin/aa-sdk — End-to-End Integration Test
 *
 * Tests the complete UserOperation lifecycle:
 *   Create → Sign → Estimate Gas → Sponsor → Send → Wait for Receipt
 *
 * Uses a mock bundler, paymaster, and on-chain RPC to validate
 * the entire pipeline without requiring a live testnet.
 *
 * Run: npx vitest run tests/e2e-integration.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Hex, Hash, Address, Chain } from 'viem';

// ── Test fixtures ──────────────────────────────────────────────────

const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;
const TEST_OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address;
const ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as Address;
const FACTORY_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address;
const MOCK_USEROP_HASH =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash;
const MOCK_TX_HASH =
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash;

// ── Shared mock fetch ─────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Helper: create mock sepolia chain ─────────────────────────────

function createMockChain(): Chain {
  return {
    id: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc.sepolia.org'] },
      public: { http: ['https://rpc.sepolia.org'] },
    },
  };
}

// ── Mock RPC responses ────────────────────────────────────────────

function mockRpcOk(result: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  } as Response);
}

function mockRpcError(message: string, code = -32603) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      jsonrpc: '2.0',
      id: 1,
      error: { code, message },
    }),
  } as Response);
}

function mockFetchError(status: number) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    statusText: 'Error',
  } as Response);
}

// ── Tests ─────────────────────────────────────────────────────────

describe('AA SDK — End-to-End Integration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SmartAccount → BundlerClient: build, sign, send', () => {
    it('should build, sign, and prepare a UserOperation for the bundler', async () => {
      // Mock entry point nonce read
      mockRpcOk('0x0');

      const { SmartAccount } = await import('../src/smartAccount.js');
      const account = new SmartAccount({
        owner: TEST_OWNER,
        entryPoint: ENTRY_POINT,
        factoryAddress: FACTORY_ADDRESS,
        index: 0n,
        chainId: 11155111,
        rpcUrl: 'https://rpc.sepolia.org',
        privateKey: TEST_PRIVATE_KEY,
      });

      // Build and sign
      const { userOp, userOpHash } = await account.execute(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        1000000000000000000n,
        '0x',
      );

      expect(userOp).toBeDefined();
      expect(userOpHash).toBeDefined();
      expect(userOpHash.startsWith('0x')).toBe(true);
      expect(userOp.signature).not.toBe('0x');
      expect(userOp.sender).toBe(account.getAddress());
    });

    it('should serialize UserOperation correctly for bundler RPC', async () => {
      mockRpcOk(MOCK_USEROP_HASH);

      const { BundlerClient } = await import('../src/bundler.js');
      const bundler = new BundlerClient({
        url: 'https://bundler.example.com',
      });

      const userOp = {
        sender: TEST_OWNER,
        nonce: 0n,
        initCode: '0x' as const,
        callData: '0x' as const,
        callGasLimit: 100000n,
        verificationGasLimit: 150000n,
        preVerificationGas: 21000n,
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 2000000000n,
        paymasterAndData: '0x' as const,
        signature: '0x' as const,
      };

      await bundler.sendUserOperation(userOp, ENTRY_POINT);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://bundler.example.com');
      const body = JSON.parse(callArgs[1].body as string);
      expect(body.method).toBe('eth_sendUserOperation');
      expect(body.jsonrpc).toBe('2.0');

      // Verify serialization: all bigint values should be hex strings
      const serializedOp = body.params[0];
      expect(serializedOp.sender).toBe(TEST_OWNER);
      expect(serializedOp.nonce).toBe('0x0');
      expect(serializedOp.callGasLimit).toBe('0x186a0');
      expect(serializedOp.verificationGasLimit).toBe('0x249f0');
      expect(serializedOp.preVerificationGas).toBe('0x5208');
      expect(serializedOp.maxFeePerGas).toBe('0x4a817c800');
      expect(serializedOp.maxPriorityFeePerGas).toBe('0x77359400');
      expect(serializedOp.paymasterAndData).toBe('0x');
      expect(serializedOp.signature).toBe('0x');
      expect(body.params[1]).toBe(ENTRY_POINT);
    });

    it('should estimate gas and return proper BigInt values', async () => {
      mockRpcOk({
        preVerificationGas: '0x5208',
        verificationGasLimit: '0x249f0',
        callGasLimit: '0x30d40',
      });

      const { BundlerClient } = await import('../src/bundler.js');
      const bundler = new BundlerClient({ url: 'https://bundler.example.com' });

      const userOp = {
        sender: TEST_OWNER,
        nonce: 0n,
        initCode: '0x' as const,
        callData: '0x' as const,
        callGasLimit: 100000n,
        verificationGasLimit: 150000n,
        preVerificationGas: 21000n,
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 2000000000n,
        paymasterAndData: '0x' as const,
        signature: '0x' as const,
      };

      const estimate = await bundler.estimateUserOperationGas(userOp, ENTRY_POINT);

      expect(estimate.callGasLimit).toBe(200000n);
      expect(estimate.verificationGasLimit).toBe(150000n);
      expect(estimate.preVerificationGas).toBe(21000n);
    });
  });

  describe('Full pipeline: executeUserOperation', () => {
    it('should execute the full AA pipeline (mocked RPC)', async () => {
      const MOCK_PAYMASTER_DATA =
        '0x00000000000000000000000000000000000000010000000000000000';

      // Track call order
      const callOrder: string[] = [];

      mockFetch.mockImplementation(async () => {
        const call = mockFetch.mock.calls.length - 1;
        const body = JSON.parse(mockFetch.mock.calls[call][1].body as string);
        callOrder.push(body.method);

        switch (body.method) {
          case 'getNonce':
          // nonce read from entry point
          case 'eth_getBalance':
            return { ok: true, json: async () => ({ result: '0x0' }) };
          case 'eth_estimateUserOperationGas':
            return {
              ok: true,
              json: async () => ({
                result: {
                  preVerificationGas: '0x5208',
                  verificationGasLimit: '0x249f0',
                  callGasLimit: '0x186a0',
                },
              }),
            };
          case 'pm_sponsorUserOperation':
            return {
              ok: true,
              json: async () => ({
                result: {
                  paymasterAndData: MOCK_PAYMASTER_DATA,
                  preVerificationGas: '0x5208',
                  verificationGasLimit: '0x249f0',
                  callGasLimit: '0x186a0',
                },
              }),
            };
          case 'eth_sendUserOperation':
            return {
              ok: true,
              json: async () => ({ result: MOCK_USEROP_HASH }),
            };
          case 'eth_getUserOperationReceipt':
            return {
              ok: true,
              json: async () => ({
                result: {
                  userOpHash: MOCK_USEROP_HASH,
                  sender: TEST_OWNER,
                  nonce: '0x0',
                  actualGasCost: '0x1234',
                  actualGasUsed: '0x5208',
                  success: true,
                  transactionHash: MOCK_TX_HASH,
                  blockNumber: '0x123456',
                  logs: [],
                },
              }),
            };
          default:
            return { ok: true, json: async () => ({ result: null }) };
        }
      });

      const { createSmartAccount } = await import('../src/createClients.js');

      const sdk = createSmartAccount({
        privateKey: TEST_PRIVATE_KEY,
        bundlerUrl: 'https://bundler.example.com',
        paymasterUrl: 'https://paymaster.example.com',
        factoryAddress: FACTORY_ADDRESS,
        entryPoint: ENTRY_POINT,
        chain: createMockChain(),
        rpcUrl: 'https://rpc.sepolia.org',
      });

      // Execute the full pipeline
      const result = await sdk.account.execute(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        1000000000000000000n,
        '0x',
      );

      expect(result.userOp).toBeDefined();
      expect(result.userOpHash).toBeDefined();
      expect(result.userOp.signature).not.toBe('0x');

      // Verify paymaster sponsorship
      const pmResult = await sdk.paymaster.sponsor({
        userOperation: result.userOp,
        entryPoint: sdk.config.entryPoint,
        chainId: sdk.config.chainId,
      });
      expect(pmResult.paymasterAndData).toBe(MOCK_PAYMASTER_DATA);

      // Update userOp with paymaster data
      result.userOp.paymasterAndData = pmResult.paymasterAndData;

      // Estimate gas
      const estimate = await sdk.bundler.estimateUserOperationGas(
        result.userOp,
        sdk.config.entryPoint,
      );
      expect(estimate.callGasLimit).toBe(100000n);

      // Send to bundler
      const sendResult = await sdk.bundler.sendUserOperation(
        result.userOp,
        sdk.config.entryPoint,
      );
      expect(sendResult.userOpHash).toBe(MOCK_USEROP_HASH);

      // Wait for receipt
      const receipt = await sdk.bundler.waitForReceipt(sendResult.userOpHash, {
        maxRetries: 2,
        intervalMs: 10,
      });
      expect(receipt.success).toBe(true);
      expect(receipt.transactionHash).toBe(MOCK_TX_HASH);
    });
  });

  describe('PaymasterClient: sponsorship flow', () => {
    it('should sponsor a UserOperation and return paymaster data', async () => {
      const MOCK_PAYMASTER_DATA =
        '0x00000000000000000000000000000000000000010000000000000000';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            paymasterAndData: MOCK_PAYMASTER_DATA,
            preVerificationGas: '0xc350',
            verificationGasLimit: '0x186a0',
            callGasLimit: '0x30d40',
          },
        }),
      } as Response);

      const { PaymasterClient } = await import('../src/paymaster.js');
      const paymaster = new PaymasterClient({
        url: 'https://paymaster.example.com',
        sponsorType: 'gasless',
      });

      const userOp = {
        sender: TEST_OWNER,
        nonce: 0n,
        initCode: '0x' as const,
        callData: '0x' as const,
        callGasLimit: 100000n,
        verificationGasLimit: 150000n,
        preVerificationGas: 21000n,
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 2000000000n,
        paymasterAndData: '0x' as const,
        signature: '0x' as const,
      };

      const result = await paymaster.sponsor({
        userOperation: userOp,
        entryPoint: ENTRY_POINT,
        chainId: 11155111,
      });

      expect(result.paymasterAndData).toBe(MOCK_PAYMASTER_DATA);
      expect(result.callGasLimit).toBe(200000n);
    });

    it('should get gas limits from paymaster', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            preVerificationGas: '0x5208',
            verificationGasLimit: '0x249f0',
            callGasLimit: '0x186a0',
          },
        }),
      } as Response);

      const { PaymasterClient } = await import('../src/paymaster.js');
      const paymaster = new PaymasterClient({
        url: 'https://paymaster.example.com',
        sponsorType: 'gasless',
      });

      const userOp = {
        sender: TEST_OWNER,
        nonce: 0n,
        initCode: '0x' as const,
        callData: '0x' as const,
        callGasLimit: 100000n,
        verificationGasLimit: 150000n,
        preVerificationGas: 21000n,
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 2000000000n,
        paymasterAndData: '0x' as const,
        signature: '0x' as const,
      };

      const limits = await paymaster.getGasLimits(userOp, ENTRY_POINT, 11155111);

      expect(limits.callGasLimit).toBe(100000n);
      expect(limits.verificationGasLimit).toBe(150000n);
      expect(limits.preVerificationGas).toBe(21000n);
    });
  });

  describe('BundlerClient: receipt polling', () => {
    it('should poll for receipt and resolve when available', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          // First two calls: no receipt yet
          return {
            ok: true,
            json: async () => ({ result: null }),
          } as Response;
        }
        // Third call: receipt available
        return {
          ok: true,
          json: async () => ({
            result: {
              userOpHash: MOCK_USEROP_HASH,
              sender: TEST_OWNER,
              nonce: '0x0',
              actualGasCost: '0x1234',
              actualGasUsed: '0x5208',
              success: true,
              transactionHash: MOCK_TX_HASH,
            },
          }),
        } as Response;
      });

      const { BundlerClient } = await import('../src/bundler.js');
      const bundler = new BundlerClient({ url: 'https://bundler.example.com' });

      const receipt = await bundler.waitForReceipt(MOCK_USEROP_HASH, {
        maxRetries: 5,
        intervalMs: 10,
      });

      expect(receipt.success).toBe(true);
      expect(receipt.userOpHash).toBe(MOCK_USEROP_HASH);
      expect(callCount).toBe(3);
    });

    it('should throw on timeout if receipt never arrives', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      const { BundlerClient } = await import('../src/bundler.js');
      const bundler = new BundlerClient({ url: 'https://bundler.example.com' });

      await expect(
        bundler.waitForReceipt(MOCK_USEROP_HASH, {
          maxRetries: 3,
          intervalMs: 10,
        }),
      ).rejects.toThrow('waitForReceipt timed out');
    });
  });

  describe('SmartAccountFactory: address computation', () => {
    it('should compute deterministic account address (local fallback)', async () => {
      const { SmartAccountFactory } = await import('../src/factory.js');
      const factory = new SmartAccountFactory({
        address: FACTORY_ADDRESS,
        entryPoint: ENTRY_POINT,
        rpcUrl: 'http://127.0.0.1:9999',
        saltNonce: 0n,
      });

      const address = await factory.computeAddress(TEST_OWNER);
      expect(address.startsWith('0x')).toBe(true);
      expect(address.length).toBe(42);
    });

    it('should compute the same address for the same inputs', async () => {
      const { SmartAccountFactory } = await import('../src/factory.js');
      const factory1 = new SmartAccountFactory({
        address: FACTORY_ADDRESS,
        entryPoint: ENTRY_POINT,
        rpcUrl: 'http://127.0.0.1:9999',
        saltNonce: 0n,
      });
      const factory2 = new SmartAccountFactory({
        address: FACTORY_ADDRESS,
        entryPoint: ENTRY_POINT,
        rpcUrl: 'http://127.0.0.1:9999',
        saltNonce: 0n,
      });

      const addr1 = await factory1.computeAddress(TEST_OWNER);
      const addr2 = await factory2.computeAddress(TEST_OWNER);
      expect(addr1).toBe(addr2);
    });
  });
});
