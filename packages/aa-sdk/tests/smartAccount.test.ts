/**
 * Vitest integration tests for @cinacoin/aa-sdk
 *
 * Tests cover:
 *   - SmartAccount creation, signing, UserOp building
 *   - BundlerClient (mocked RPC responses)
 *   - PaymasterClient (mocked RPC responses)
 *   - SmartAccountFactory (local + mocked on-chain)
 *   - createSmartAccount factory function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Test key (anvil / hardhat default) ──────────────────────────

const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
const FACTORY_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

// ── Shared mock fetch helper ────────────────────────────────────

const mockFetch = vi.fn();

// Patch global fetch before any module loads
vi.stubGlobal('fetch', mockFetch);

// ── SmartAccount ────────────────────────────────────────────────

describe('SmartAccount', () => {
  async function makeAccount() {
    const { SmartAccount } = await import('../src/smartAccount.js');
    return new SmartAccount({
      owner: TEST_OWNER,
      entryPoint: ENTRY_POINT,
      factoryAddress: FACTORY_ADDRESS,
      index: 0n,
      chainId: 1,
      rpcUrl: 'https://eth.llamarpc.com',
      privateKey: TEST_PRIVATE_KEY,
    });
  }

  describe('create', () => {
    it('should create a new smart account', async () => {
      const account = await makeAccount();
      expect(account).toBeDefined();
      expect(account.getAddress()).toBeDefined();
    });

    it('should derive a valid address', async () => {
      const account = await makeAccount();
      const address = account.getAddress();
      expect(address.length).toBeGreaterThan(0);
      expect(typeof address).toBe('string');
    });
  });

  describe('execute', () => {
    it('should execute a single transaction and return signed UserOp', async () => {
      const account = await makeAccount();
      const { userOp, userOpHash } = await account.execute(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        1000000000000000000n,
        '0x',
      );
      expect(userOpHash).toBeDefined();
      expect(userOpHash.startsWith('0x')).toBe(true);
      expect(userOp.signature).not.toBe('0x');
    });
  });

  describe('executeBatch', () => {
    it('should execute batch transactions', async () => {
      const account = await makeAccount();
      const { userOp, userOpHash } = await account.executeBatch([
        { to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: 100n, data: '0x111' },
        { to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', value: 200n, data: '0x222' },
      ]);
      expect(userOpHash).toBeDefined();
      expect(userOp.signature).not.toBe('0x');
    });
  });

  describe('signUserOp', () => {
    it('should sign a user operation with real viem signing', async () => {
      const account = await makeAccount();
      const userOp = await account.buildUserOperation([
        { to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: 0n, data: '0x' },
      ]);
      const signed = await account.signUserOp(userOp);
      expect(signed.signature).toBeDefined();
      expect(signed.signature.startsWith('0x')).toBe(true);
      expect(signed.signature.length).toBeGreaterThan(10);
    });
  });

  describe('buildUserOperation', () => {
    it('should build a valid user operation', async () => {
      const account = await makeAccount();
      const userOp = await account.buildUserOperation([
        { to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: 0n, data: '0x' },
      ]);
      expect(userOp.sender).toBe(account.getAddress());
      expect(userOp.callGasLimit).toBeDefined();
    });

    it('should fetch nonce from entry point (fallback to local)', async () => {
      const account = await makeAccount();
      const nonce = await account.getNonce();
      expect(typeof nonce).toBe('bigint');
    });
  });

  describe('hashUserOperation', () => {
    it('should produce a deterministic hash', async () => {
      const account = await makeAccount();
      const userOp = await account.buildUserOperation([
        { to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: 0n, data: '0x' },
      ]);
      const hash1 = account.hashUserOperation(userOp);
      const hash2 = account.hashUserOperation(userOp);
      expect(hash1).toBe(hash2);
      expect(hash1.startsWith('0x')).toBe(true);
    });
  });

  describe('state management', () => {
    it('should update balance', async () => {
      const account = await makeAccount();
      account.updateBalance(1000000n);
      expect(account.getState().balance).toBe(1000000n);
    });

    it('should mark account as deployed', async () => {
      const account = await makeAccount();
      expect(account.getState().isDeployed).toBe(false);
      account.markDeployed();
      expect(account.getState().isDeployed).toBe(true);
    });
  });
});

// ── SmartAccountFactory ─────────────────────────────────────────

describe('SmartAccountFactory', () => {
  it('should compute account address (local fallback)', async () => {
    const { SmartAccountFactory } = await import('../src/factory.js');
    const factory = new SmartAccountFactory({
      address: FACTORY_ADDRESS,
      entryPoint: ENTRY_POINT,
      rpcUrl: 'http://127.0.0.1:9999', // unreachable → local fallback
      saltNonce: 0n,
    });
    // Will fall back to local derivation since RPC is unreachable
    const address = await factory.computeAddress(TEST_OWNER);
    expect(address).toBeDefined();
    expect(address.startsWith('0x')).toBe(true);
  });

  it('should track deployed accounts locally', async () => {
    const { SmartAccountFactory } = await import('../src/factory.js');
    const factory = new SmartAccountFactory({
      address: FACTORY_ADDRESS,
      entryPoint: ENTRY_POINT,
      rpcUrl: 'https://eth.llamarpc.com',
      saltNonce: 0n,
    });
    const addr = '0x1234567890123456789012345678901234567890' as const;
    expect(factory.isDeployed(addr)).toBe(false);
  });
});

// ── PaymasterClient (mocked RPC) ────────────────────────────────

describe('PaymasterClient', () => {
  const MOCK_PAYMASTER_DATA =
    '0x00000000000000000000000000000000000000010000000000000000';

  beforeEach(() => {
    mockFetch.mockReset();
  });

  function mockFetchOk(result: unknown) {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result }),
    } as Response);
  }

  function mockFetchError(status: number, statusText: string) {
    mockFetch.mockResolvedValue({
      ok: false,
      status,
      statusText,
    } as Response);
  }

  function mockFetchRpcError(message: string, code = -32603) {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        error: { code, message },
      }),
    } as Response);
  }

  function makeTestUserOp() {
    return {
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
  }

  it('should sponsor a user operation via real RPC call', async () => {
    mockFetchOk({
      paymasterAndData: MOCK_PAYMASTER_DATA,
      preVerificationGas: '0xc350',
      verificationGasLimit: '0x186a0',
      callGasLimit: '0x30d40',
    });

    const { PaymasterClient } = await import('../src/paymaster.js');
    const paymaster = new PaymasterClient({
      url: 'https://paymaster.example.com',
      sponsorType: 'gasless',
    });

    const result = await paymaster.sponsor({
      userOperation: makeTestUserOp(),
      entryPoint: ENTRY_POINT,
      chainId: 1,
    });

    expect(result.paymasterAndData).toBe(MOCK_PAYMASTER_DATA);
    expect(result.callGasLimit).toBe(200000n);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://paymaster.example.com',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('should include API key in Authorization header', async () => {
    mockFetchOk({
      paymasterAndData: MOCK_PAYMASTER_DATA,
      preVerificationGas: '0xc350',
      verificationGasLimit: '0x186a0',
      callGasLimit: '0x30d40',
    });

    const { PaymasterClient } = await import('../src/paymaster.js');
    const paymaster = new PaymasterClient({
      url: 'https://paymaster.example.com',
      apiKey: 'test-api-key',
      sponsorType: 'gasless',
    });

    await paymaster.sponsor({
      userOperation: makeTestUserOp(),
      entryPoint: ENTRY_POINT,
      chainId: 1,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://paymaster.example.com',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      }),
    );
  });

  it('should throw on RPC error', async () => {
    mockFetchRpcError('internal error');

    const { PaymasterClient } = await import('../src/paymaster.js');
    const paymaster = new PaymasterClient({
      url: 'https://paymaster.example.com',
      sponsorType: 'gasless',
    });

    await expect(
      paymaster.sponsor({
        userOperation: makeTestUserOp(),
        entryPoint: ENTRY_POINT,
        chainId: 1,
      }),
    ).rejects.toThrow('Paymaster RPC error');
  });

  it('should throw on HTTP error', async () => {
    mockFetchError(500, 'Internal Server Error');

    const { PaymasterClient } = await import('../src/paymaster.js');
    const paymaster = new PaymasterClient({
      url: 'https://paymaster.example.com',
      sponsorType: 'gasless',
    });

    await expect(
      paymaster.sponsor({
        userOperation: makeTestUserOp(),
        entryPoint: ENTRY_POINT,
        chainId: 1,
      }),
    ).rejects.toThrow('Paymaster HTTP 500');
  });
});

// ── BundlerClient (mocked RPC) ──────────────────────────────────

describe('BundlerClient', () => {
  const MOCK_USEROP_HASH =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  beforeEach(() => {
    mockFetch.mockReset();
  });

  function mockFetchOk(result: unknown) {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result }),
    } as Response);
  }

  function mockFetchError(status: number, statusText: string) {
    mockFetch.mockResolvedValue({
      ok: false,
      status,
      statusText,
    } as Response);
  }

  function mockFetchRpcError(message: string, code = -32603) {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        error: { code, message },
      }),
    } as Response);
  }

  function makeUserOp() {
    return {
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
  }

  it('should send a user operation via real RPC call', async () => {
    mockFetchOk(MOCK_USEROP_HASH);

    const { BundlerClient } = await import('../src/bundler.js');
    const bundler = new BundlerClient({
      url: 'https://bundler.example.com',
    });

    const result = await bundler.sendUserOperation(makeUserOp(), ENTRY_POINT);
    expect(result.userOpHash).toBe(MOCK_USEROP_HASH);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://bundler.example.com');
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.method).toBe('eth_sendUserOperation');
    expect(body.jsonrpc).toBe('2.0');
    expect(body.params[1]).toBe(ENTRY_POINT);
  });

  it('should estimate gas via real RPC call', async () => {
    mockFetchOk({
      preVerificationGas: '0x5208',
      verificationGasLimit: '0x249f0',
      callGasLimit: '0x186a0',
    });

    const { BundlerClient } = await import('../src/bundler.js');
    const bundler = new BundlerClient({
      url: 'https://bundler.example.com',
    });

    const estimate = await bundler.estimateUserOperationGas(
      makeUserOp(),
      ENTRY_POINT,
    );

    expect(estimate.preVerificationGas).toBe(21000n);
    expect(estimate.verificationGasLimit).toBe(150000n);
    expect(estimate.callGasLimit).toBe(100000n);
  });

  it('should get supported entry points', async () => {
    mockFetchOk([ENTRY_POINT]);

    const { BundlerClient } = await import('../src/bundler.js');
    const bundler = new BundlerClient({
      url: 'https://bundler.example.com',
    });

    const entryPoints = await bundler.getSupportedEntryPoints();
    expect(Array.isArray(entryPoints)).toBe(true);
    expect(entryPoints).toContain(ENTRY_POINT);
  });

  it('should include API key in Authorization header', async () => {
    mockFetchOk(MOCK_USEROP_HASH);

    const { BundlerClient } = await import('../src/bundler.js');
    const bundler = new BundlerClient({
      url: 'https://bundler.example.com',
      apiKey: 'bundler-key',
    });

    await bundler.sendUserOperation(makeUserOp(), ENTRY_POINT);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers).toHaveProperty(
      'Authorization',
      'Bearer bundler-key',
    );
  });

  it('should throw on RPC error', async () => {
    mockFetchRpcError('internal error');

    const { BundlerClient } = await import('../src/bundler.js');
    const bundler = new BundlerClient({
      url: 'https://bundler.example.com',
    });

    await expect(
      bundler.sendUserOperation(makeUserOp(), ENTRY_POINT),
    ).rejects.toThrow('Bundler RPC error');
  });

  it('should throw on HTTP error', async () => {
    mockFetchError(503, 'Service Unavailable');

    const { BundlerClient } = await import('../src/bundler.js');
    const bundler = new BundlerClient({
      url: 'https://bundler.example.com',
    });

    await expect(
      bundler.sendUserOperation(makeUserOp(), ENTRY_POINT),
    ).rejects.toThrow('Bundler HTTP 503');
  });
});

// ── createSmartAccount factory ──────────────────────────────────

describe('createSmartAccount', () => {
  it('should create a fully wired AASDK bundle', async () => {
    const { createSmartAccount } = await import('../src/createClients.js');
    const { sepolia } = await import('viem/chains');

    const sdk = createSmartAccount({
      privateKey: TEST_PRIVATE_KEY,
      bundlerUrl: 'https://bundler.example.com',
      paymasterUrl: 'https://paymaster.example.com',
      factoryAddress: FACTORY_ADDRESS,
      entryPoint: ENTRY_POINT,
      chain: sepolia,
      rpcUrl: 'https://rpc.sepolia.org',
    });

    expect(sdk.account).toBeDefined();
    expect(sdk.bundler).toBeDefined();
    expect(sdk.paymaster).toBeDefined();
    expect(sdk.factory).toBeDefined();
    expect(sdk.wallet).toBeDefined();
    expect(sdk.config.entryPoint).toBe(ENTRY_POINT);
    expect(sdk.config.chainId).toBe(sepolia.id);
  });
});
