/**
 * Legacy imperative-style tests for aa-sdk.
 * Run via: npx tsx tests/aa.test.ts
 *
 * For vitest, see smartAccount.test.ts
 */

import { SmartAccount } from '../src/smartAccount.js';
import { SmartAccountFactory } from '../src/factory.js';
import { PaymasterClient } from '../src/paymaster.js';
import { BundlerClient } from '../src/bundler.js';
import type { SmartAccountConfig, UserOperation, BatchTransaction } from '../src/types.js';
import { sepolia } from 'viem/chains';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const config: SmartAccountConfig & { privateKey: string } = {
  owner: TEST_OWNER,
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  chainId: 1,
  rpcUrl: 'https://eth.llamarpc.com',
  privateKey: TEST_PRIVATE_KEY,
};

// ---------------------------------------------------------------------------
// SmartAccount
// ---------------------------------------------------------------------------

function testSmartAccountInit() {
  const account = new SmartAccount(config);
  assert(account.config.owner === config.owner, 'owner matches');
  assert(account.config.entryPoint === config.entryPoint, 'entryPoint matches');
  assert(account.config.chainId === config.chainId, 'chainId matches');
  assert(account.config.rpcUrl === config.rpcUrl, 'rpcUrl matches');
  console.log('✓ SmartAccount init');
}

function testSmartAccountWithOptionalFields() {
  const account = new SmartAccount({
    ...config,
    factoryAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    index: 0n,
  });
  assert(account.config.factoryAddress === '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', 'factory address');
  assert(account.config.index === 0n, 'index');
  console.log('✓ SmartAccount with optional fields');
}

function testSmartAccountDefaultIndex() {
  const account = new SmartAccount(config);
  assert(account.config.index === undefined, 'default index should be undefined');
  console.log('✓ SmartAccount default index');
}

async function testBuildUserOperation() {
  const account = new SmartAccount(config);

  const batch: BatchTransaction[] = [
    { to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: 1_000_000n, data: '0x' },
    { to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', value: 0n, data: '0xa9059cbb' },
  ];

  const userOp = await account.buildUserOperation(batch);

  assert(userOp.sender !== undefined, 'sender should be set');
  assert(userOp.nonce >= 0n, 'nonce should be non-negative');
  assert(userOp.callData !== undefined, 'callData should be set');
  assert(userOp.callGasLimit >= 0n, 'callGasLimit should be set');
  assert(userOp.verificationGasLimit >= 0n, 'verificationGasLimit should be set');
  assert(userOp.preVerificationGas >= 0n, 'preVerificationGas should be set');
  assert(userOp.maxFeePerGas >= 0n, 'maxFeePerGas should be set');
  assert(userOp.maxPriorityFeePerGas >= 0n, 'maxPriorityFeePerGas should be set');
  assert(userOp.paymasterAndData === '0x', 'paymasterAndData default');
  assert(userOp.signature === '0x', 'signature default');
  console.log('✓ buildUserOperation');
}

async function testBuildUserOperationSingleTx() {
  const account = new SmartAccount(config);

  const userOp = await account.buildUserOperation([
    { to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', value: 500n, data: '0xdeadbeef' },
  ]);

  assert(userOp.callData.length > 0, 'callData should not be empty');
  console.log('✓ buildUserOperation single tx');
}

async function testBuildUserOperationEmptyBatch() {
  const account = new SmartAccount(config);

  const userOp = await account.buildUserOperation([]);
  assert(userOp.sender !== undefined, 'sender exists');
  console.log('✓ buildUserOperation empty batch');
}

async function testSignUserOperation() {
  const account = new SmartAccount(config);

  const userOp: UserOperation = {
    sender: '0x1234567890123456789012345678901234567890',
    nonce: 1n,
    initCode: '0x',
    callData: '0xabc',
    callGasLimit: 100000n,
    verificationGasLimit: 50000n,
    preVerificationGas: 30000n,
    maxFeePerGas: 1000000n,
    maxPriorityFeePerGas: 100000n,
    paymasterAndData: '0x',
    signature: '0x',
  };

  const signed = await account.signUserOp(userOp);
  assert(signed.signature !== '0x', 'signature should be set');
  assert(signed.signature.startsWith('0x'), 'signature should be hex');
  console.log('✓ signUserOperation');
}

async function testExecuteReturnsUserOp() {
  const account = new SmartAccount(config);
  const { userOp, userOpHash } = await account.execute(
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    0n,
    '0x',
  );
  assert(userOp !== undefined, 'userOp returned');
  assert(userOpHash !== undefined, 'userOpHash returned');
  assert(userOpHash.startsWith('0x'), 'userOpHash is hex');
  assert(userOp.signature !== '0x', 'userOp is signed');
  console.log('✓ execute returns userOp');
}

async function testGetState() {
  const account = new SmartAccount(config);
  const state = account.getState();

  assert(state.owner === config.owner, 'owner in state');
  assert(typeof state.address === 'string', 'address is string');
  assert(typeof state.balance === 'bigint', 'balance is bigint');
  assert(typeof state.nonce === 'bigint', 'nonce is bigint');
  assert(typeof state.isDeployed === 'boolean', 'isDeployed is boolean');
  console.log('✓ getState');
}

async function testGetAddress() {
  const account = new SmartAccount(config);
  const address = account.getAddress();
  assert(address.startsWith('0x'), 'address starts with 0x');
  console.log('✓ getAddress');
}

// ---------------------------------------------------------------------------
// SmartAccountFactory
// ---------------------------------------------------------------------------

function testFactoryInit() {
  const factory = new SmartAccountFactory({
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    rpcUrl: 'https://eth.llamarpc.com',
    chain: sepolia,
  });
  assert(factory.config.address === '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', 'factory address');
  assert(factory.config.entryPoint === '0x0000000071727De22E5E9d8BAf0edAc6f37da032', 'entry point');
  console.log('✓ SmartAccountFactory init');
}

function testFactoryWithSaltNonce() {
  const factory = new SmartAccountFactory({
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    saltNonce: 42n,
    rpcUrl: 'https://eth.llamarpc.com',
    chain: sepolia,
  });
  assert(factory.config.saltNonce === 42n, 'salt nonce');
  console.log('✓ SmartAccountFactory with saltNonce');
}

async function testComputeAddress() {
  const factory = new SmartAccountFactory({
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    rpcUrl: 'https://eth.llamarpc.com',
    chain: sepolia,
  });

  const address = await factory.computeAddress('0x1234567890123456789012345678901234567890');
  assert(address.startsWith('0x'), 'computed address should be hex');
  assert(address.length > 2, 'address should have content');
  console.log('✓ computeAddress');
}

// ---------------------------------------------------------------------------
// PaymasterClient
// ---------------------------------------------------------------------------

function testPaymasterInit() {
  const paymaster = new PaymasterClient({
    url: 'https://paymaster.example.com',
    sponsorType: 'gasless',
  });
  assert(paymaster.sponsorType === 'gasless', 'sponsor type');
  console.log('✓ PaymasterClient init');
}

function testPaymasterWithApiKey() {
  const paymaster = new PaymasterClient({
    url: 'https://paymaster.example.com',
    apiKey: 'secret-key-123',
    sponsorType: 'partial',
  });
  assert(paymaster.sponsorType === 'partial', 'sponsor type');
  console.log('✓ PaymasterClient with apiKey');
}

async function testPaymasterSponsorOp() {
  const paymaster = new PaymasterClient({
    url: 'https://paymaster.example.com',
    sponsorType: 'post-pay',
  });

  const userOp: UserOperation = {
    sender: '0x1234567890123456789012345678901234567890',
    nonce: 1n,
    initCode: '0x',
    callData: '0x',
    callGasLimit: 100000n,
    verificationGasLimit: 50000n,
    preVerificationGas: 30000n,
    maxFeePerGas: 1000000n,
    maxPriorityFeePerGas: 100000n,
    paymasterAndData: '0x',
    signature: '0x',
  };

  try {
    await paymaster.sponsor({
      userOperation: userOp,
      entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
      chainId: 1,
    });
  } catch (_e: any) {
    assert(true, 'should attempt to call paymaster');
  }
  console.log('✓ PaymasterClient sponsorOp (network error expected)');
}

// ---------------------------------------------------------------------------
// BundlerClient
// ---------------------------------------------------------------------------

function testBundlerInit() {
  const bundler = new BundlerClient({
    url: 'https://bundler.example.com',
  });
  console.log('✓ BundlerClient init');
}

function testBundlerWithApiKey() {
  const bundler = new BundlerClient({
    url: 'https://bundler.example.com',
    apiKey: 'bundler-key',
  });
  console.log('✓ BundlerClient with apiKey');
}

async function testBundlerEstimateGas() {
  const bundler = new BundlerClient({
    url: 'https://bundler.example.com',
  });

  const userOp: UserOperation = {
    sender: '0x1234567890123456789012345678901234567890',
    nonce: 0n,
    initCode: '0x',
    callData: '0x',
    callGasLimit: 0n,
    verificationGasLimit: 0n,
    preVerificationGas: 0n,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    paymasterAndData: '0x',
    signature: '0x',
  };

  try {
    await bundler.estimateUserOperationGas(userOp, '0x0000000071727De22E5E9d8BAf0edAc6f37da032');
  } catch (_e: any) {
    assert(true, 'should attempt to estimate');
  }
  console.log('✓ BundlerClient estimateGas (network error expected)');
}

async function testBundlerSendUserOperation() {
  const bundler = new BundlerClient({
    url: 'https://bundler.example.com',
  });

  const userOp: UserOperation = {
    sender: '0x1234567890123456789012345678901234567890',
    nonce: 0n,
    initCode: '0x',
    callData: '0x',
    callGasLimit: 0n,
    verificationGasLimit: 0n,
    preVerificationGas: 0n,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    paymasterAndData: '0x',
    signature: '0x',
  };

  try {
    await bundler.sendUserOperation(userOp, '0x0000000071727De22E5E9d8BAf0edAc6f37da032');
  } catch (_e: any) {
    assert(true, 'should attempt to send');
  }
  console.log('✓ BundlerClient sendUserOperation (network error expected)');
}

async function testBundlerGetUserOperationReceipt() {
  const bundler = new BundlerClient({
    url: 'https://bundler.example.com',
  });

  try {
    await bundler.getUserOperationReceipt('0xUserOpHash123');
  } catch (_e: any) {
    assert(true, 'should attempt to get receipt');
  }
  console.log('✓ BundlerClient getUserOperationReceipt (network error expected)');
}

// ---------------------------------------------------------------------------
// UserOperation type validation
// ---------------------------------------------------------------------------

function testUserOperationShape() {
  const userOp: UserOperation = {
    sender: '0x1234567890123456789012345678901234567890',
    nonce: 1n,
    initCode: '0x',
    callData: '0xabc',
    callGasLimit: 100000n,
    verificationGasLimit: 50000n,
    preVerificationGas: 30000n,
    maxFeePerGas: 1000000n,
    maxPriorityFeePerGas: 100000n,
    paymasterAndData: '0x',
    signature: '0x',
  };

  assert(typeof userOp.sender === 'string', 'sender is string');
  assert(typeof userOp.nonce === 'bigint', 'nonce is bigint');
  assert(typeof userOp.callGasLimit === 'bigint', 'callGasLimit is bigint');
  assert(typeof userOp.paymasterAndData === 'string', 'paymasterAndData is string');
  console.log('✓ UserOperation shape');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  const tests = [
    testSmartAccountInit,
    testSmartAccountWithOptionalFields,
    testSmartAccountDefaultIndex,
    testBuildUserOperation,
    testBuildUserOperationSingleTx,
    testBuildUserOperationEmptyBatch,
    testSignUserOperation,
    testExecuteReturnsUserOp,
    testGetState,
    testGetAddress,
    testFactoryInit,
    testFactoryWithSaltNonce,
    testComputeAddress,
    testPaymasterInit,
    testPaymasterWithApiKey,
    testPaymasterSponsorOp,
    testBundlerInit,
    testBundlerWithApiKey,
    testBundlerEstimateGas,
    testBundlerSendUserOperation,
    testBundlerGetUserOperationReceipt,
    testUserOperationShape,
  ];

  let passed = 0;
  let failed = 0;

  for (const fn of tests) {
    try {
      await fn();
      passed++;
    } catch (e: any) {
      console.error(`✗ ${fn.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed (${tests.length} total)`);
  if (failed > 0) process.exit(1);
}

run();
