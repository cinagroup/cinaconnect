import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartAccount, SmartAccountFactory, PaymasterClient, BundlerClient } from '../src/index.js';
import type { SmartAccountConfig, FactoryConfig, PaymasterConfig, BundlerConfig, UserOperation, BatchTransaction } from '../src/types.js';

const testConfig: SmartAccountConfig = {
  owner: '0x1234567890123456789012345678901234567890',
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  factoryAddress: '0x9999999999999999999999999999999999999999',
  index: 0n,
  chainId: 1,
  rpcUrl: 'https://eth.rpc',
};

const factoryConfig: FactoryConfig = {
  address: '0x9999999999999999999999999999999999999999',
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  saltNonce: 0n,
};

const paymasterConfig: PaymasterConfig = {
  url: 'https://paymaster.example.com',
  sponsorType: 'gasless',
};

const bundlerConfig: BundlerConfig = {
  url: 'https://bundler.example.com',
};

describe('SmartAccount', () => {
  describe('create', () => {
    it('should create a new smart account', async () => {
      const account = await SmartAccount.create(testConfig);
      expect(account).toBeDefined();
      expect(account.getAddress()).toBeDefined();
    });

    it('should derive a valid address', async () => {
      const account = await SmartAccount.create(testConfig);
      const address = account.getAddress();
      expect(address.length).toBeGreaterThan(0);
      expect(typeof address).toBe('string');
    });
  });

  describe('execute', () => {
    it('should execute a single transaction', async () => {
      const account = await SmartAccount.create(testConfig);
      const result = await account.execute(
        '0xRecipient',
        1000000000000000000n,
        '0x',
      );
      expect(result.userOpHash).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('executeBatch', () => {
    it('should execute batch transactions', async () => {
      const account = await SmartAccount.create(testConfig);
      const txs: BatchTransaction[] = [
        { to: '0xAddr1', value: 100n, data: '0x111' },
        { to: '0xAddr2', value: 200n, data: '0x222' },
      ];
      const result = await account.executeBatch(txs);
      expect(result.userOpHash).toBeDefined();
    });
  });

  describe('sign', () => {
    it('should sign a user operation', async () => {
      const account = await SmartAccount.create(testConfig);
      const userOp = account.buildUserOperation([
        { to: '0x', value: 0n, data: '0x' },
      ]);
      const signature = await account.sign(userOp);
      expect(signature).toBeDefined();
      expect(signature.startsWith('0x')).toBe(true);
    });
  });

  describe('buildUserOperation', () => {
    it('should build a valid user operation', async () => {
      const account = await SmartAccount.create(testConfig);
      const userOp = account.buildUserOperation([
        { to: '0x', value: 0n, data: '0x' },
      ]);
      expect(userOp.sender).toBe(account.getAddress());
      expect(userOp.nonce).toBe(0n);
      expect(userOp.callGasLimit).toBeDefined();
    });

    it('should increment nonce after building', async () => {
      const account = await SmartAccount.create(testConfig);
      account.buildUserOperation([{ to: '0x', value: 0n, data: '0x' }]);
      account.buildUserOperation([{ to: '0x', value: 0n, data: '0x' }]);
      expect(account.getNonce()).toBe(2n);
    });
  });

  describe('state management', () => {
    it('should update balance', async () => {
      const account = await SmartAccount.create(testConfig);
      account.updateBalance(1000000n);
      expect(account.getState().balance).toBe(1000000n);
    });

    it('should mark account as deployed', async () => {
      const account = await SmartAccount.create(testConfig);
      expect(account.getState().isDeployed).toBe(false);
      account.markDeployed();
      expect(account.getState().isDeployed).toBe(true);
    });
  });
});

describe('SmartAccountFactory', () => {
  it('should compute account address', () => {
    const factory = new SmartAccountFactory(factoryConfig);
    const address = factory.computeAddress('0x1234');
    expect(address).toBeDefined();
    expect(address.startsWith('0x')).toBe(true);
  });

  it('should deploy an account', async () => {
    const factory = new SmartAccountFactory(factoryConfig);
    const result = await factory.deploy('0x1234');
    expect(result.address).toBeDefined();
    expect(result.hash).toBeDefined();
  });

  it('should track deployed accounts', async () => {
    const factory = new SmartAccountFactory(factoryConfig);
    const { address } = await factory.deploy('0x1234');
    expect(factory.isDeployed(address)).toBe(true);
    expect(factory.isDeployed('0xnonexistent')).toBe(false);
  });
});

describe('PaymasterClient', () => {
  it('should sponsor a user operation', async () => {
    const paymaster = new PaymasterClient(paymasterConfig);
    const userOp: UserOperation = {
      sender: '0x123',
      nonce: 0n,
      initCode: '0x',
      callData: '0x',
      callGasLimit: 100000n,
      verificationGasLimit: 150000n,
      preVerificationGas: 21000n,
      maxFeePerGas: 20000000000n,
      maxPriorityFeePerGas: 2000000000n,
      paymasterAndData: '0x',
      signature: '0x',
    };
    const result = await paymaster.sponsor({
      userOperation: userOp,
      entryPoint: '0xEntryPoint',
      chainId: 1,
    });
    expect(result.paymasterAndData).toBeDefined();
    expect(result.callGasLimit).toBeDefined();
  });

  it('should return gas limits', async () => {
    const paymaster = new PaymasterClient(paymasterConfig);
    const limits = await paymaster.getGasLimits({} as UserOperation);
    expect(limits.verificationGasLimit).toBeDefined();
    expect(limits.callGasLimit).toBeDefined();
  });

  it('should get paymaster balance', async () => {
    const paymaster = new PaymasterClient(paymasterConfig);
    const balance = await paymaster.getBalance();
    expect(balance).toBeGreaterThan(0n);
  });
});

describe('BundlerClient', () => {
  it('should send a user operation', async () => {
    const bundler = new BundlerClient(bundlerConfig);
    const userOp: UserOperation = {
      sender: '0x123',
      nonce: 0n,
      initCode: '0x',
      callData: '0x',
      callGasLimit: 100000n,
      verificationGasLimit: 150000n,
      preVerificationGas: 21000n,
      maxFeePerGas: 20000000000n,
      maxPriorityFeePerGas: 2000000000n,
      paymasterAndData: '0x',
      signature: '0x',
    };
    const result = await bundler.sendUserOperation(userOp);
    expect(result.userOpHash).toBeDefined();
  });

  it('should estimate user operation gas', async () => {
    const bundler = new BundlerClient(bundlerConfig);
    const estimate = await bundler.estimateUserOperationGas({} as UserOperation);
    expect(estimate.callGasLimit).toBeDefined();
    expect(estimate.verificationGasLimit).toBeDefined();
    expect(estimate.preVerificationGas).toBeDefined();
  });

  it('should get supported entry points', async () => {
    const bundler = new BundlerClient(bundlerConfig);
    const entryPoints = await bundler.getSupportedEntryPoints();
    expect(Array.isArray(entryPoints)).toBe(true);
    expect(entryPoints.length).toBeGreaterThan(0);
  });
});
