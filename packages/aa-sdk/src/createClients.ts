/**
 * Factory functions to create and wire together all aa-sdk components.
 *
 * Usage:
 *   const sdk = createSmartAccount({
 *     privateKey: '0x...',
 *     bundlerUrl: 'http://localhost:3000',
 *     paymasterUrl: 'http://localhost:4000',
 *     factoryAddress: '0x...',
 *     entryPoint: '0x...',
 *     chain: sepolia,
 *     rpcUrl: 'https://rpc.sepolia.org',
 *   });
 *
 *   // Real UserOperation flow:
 *   const { userOp, userOpHash } = await sdk.account.execute(
 *     '0xRecipient', 0n, '0x'
 *   );
 *   const withPaymaster = await sdk.paymaster.sponsor({
 *     userOperation: userOp,
 *     entryPoint: sdk.config.entryPoint,
 *     chainId: sdk.config.chain.id,
 *   });
 *   userOp.paymasterAndData = withPaymaster.paymasterAndData;
 *
 *   const estimate = await sdk.bundler.estimateUserOperationGas(
 *     userOp, sdk.config.entryPoint
 *   );
 *   userOp.callGasLimit = estimate.callGasLimit;
 *   // ... set other gas limits ...
 *
 *   const result = await sdk.bundler.sendUserOperation(
 *     userOp, sdk.config.entryPoint
 *   );
 *   const receipt = await sdk.bundler.waitForReceipt(result.userOpHash);
 */

import {
  createWalletClient,
  http,
  type Address,
  type Hex,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SmartAccount } from './smartAccount.js';
import { SmartAccountFactory } from './factory.js';
import { BundlerClient } from './bundler.js';
import { PaymasterClient } from './paymaster.js';
import type { AASDKConfig, UserOperation, UserOperationReceipt } from './types.js';

// ── SDK bundle ────────────────────────────────────────────────────

export interface AASDK {
  account: SmartAccount;
  bundler: BundlerClient;
  paymaster: PaymasterClient;
  factory: SmartAccountFactory;
  config: {
    entryPoint: Address;
    chain: Chain;
    chainId: number;
  };
  /** Convenience wallet client for the deployer (owner). */
  wallet: ReturnType<typeof createWalletClient>;
}

/**
 * Create a fully-wired AASDK bundle.
 *
 * Initialises SmartAccount, BundlerClient, PaymasterClient,
 * SmartAccountFactory, and a viem WalletClient — all wired
 * together with the provided config.
 */
export function createSmartAccount(config: AASDKConfig): AASDK {
  // Derive viem account from private key
  const signerAccount = privateKeyToAccount(config.privateKey);
  const ownerAddress = signerAccount.address;

  // Wallet client for contract interactions (deployments, etc.)
  const wallet = createWalletClient({
    account: signerAccount,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  // Smart account
  const account = new SmartAccount({
    owner: ownerAddress,
    entryPoint: config.entryPoint,
    factoryAddress: config.factoryAddress,
    index: config.index ?? 0n,
    chainId: config.chain.id,
    rpcUrl: config.rpcUrl,
    privateKey: config.privateKey,
  });

  // Bundler client
  const bundler = new BundlerClient({
    url: config.bundlerUrl,
    apiKey: config.bundlerApiKey,
  });

  // Paymaster client
  const paymaster = new PaymasterClient({
    url: config.paymasterUrl,
    apiKey: config.paymasterApiKey,
    sponsorType: config.sponsorType ?? 'gasless',
  });

  // Factory
  const factory = new SmartAccountFactory({
    address: config.factoryAddress,
    entryPoint: config.entryPoint,
    rpcUrl: config.rpcUrl,
    chain: config.chain,
  });

  return {
    account,
    bundler,
    paymaster,
    factory,
    config: {
      entryPoint: config.entryPoint,
      chain: config.chain,
      chainId: config.chain.id,
    },
    wallet,
  };
}

// ── Individual creators (for partial setups) ──────────────────────

export interface BundlerClientOptions {
  bundlerUrl: string;
  bundlerApiKey?: string;
}

export function createBundlerClient(opts: BundlerClientOptions): BundlerClient {
  return new BundlerClient({
    url: opts.bundlerUrl,
    apiKey: opts.bundlerApiKey,
  });
}

export interface PaymasterClientOptions {
  paymasterUrl: string;
  paymasterApiKey?: string;
  sponsorType?: 'gasless' | 'partial' | 'post-pay';
}

export function createPaymasterClient(opts: PaymasterClientOptions): PaymasterClient {
  return new PaymasterClient({
    url: opts.paymasterUrl,
    apiKey: opts.paymasterApiKey,
    sponsorType: opts.sponsorType ?? 'gasless',
  });
}

export interface FactoryOptions {
  factoryAddress: Address;
  entryPoint: Address;
  rpcUrl: string;
  saltNonce?: bigint;
}

export function createFactory(opts: FactoryOptions): SmartAccountFactory {
  return new SmartAccountFactory({
    address: opts.factoryAddress,
    entryPoint: opts.entryPoint,
    rpcUrl: opts.rpcUrl,
    saltNonce: opts.saltNonce,
  });
}

// ── Convenience: full UserOperation flow ──────────────────────────

/**
 * Execute a transaction through the full AA pipeline:
 *   1. Build UserOp
 *   2. Get paymaster data
 *   3. Estimate gas
 *   4. Sign
 *   5. Send to bundler
 *   6. Wait for receipt
 */
export async function executeUserOperation(
  sdk: AASDK,
  to: Address,
  value: bigint,
  data: Hex,
  opts?: { waitForReceipt?: boolean },
): Promise<{ userOpHash: Hex; receipt?: UserOperationReceipt }> {
  // 1. Build & sign
  const { userOp, userOpHash } = await sdk.account.execute(to, value, data);

  // 2. Sponsor (get paymaster data)
  const pmResult = await sdk.paymaster.sponsor({
    userOperation: userOp,
    entryPoint: sdk.config.entryPoint,
    chainId: sdk.config.chainId,
  });
  userOp.paymasterAndData = pmResult.paymasterAndData;
  if (pmResult.callGasLimit) userOp.callGasLimit = pmResult.callGasLimit;
  if (pmResult.verificationGasLimit) userOp.verificationGasLimit = pmResult.verificationGasLimit;
  if (pmResult.preVerificationGas) userOp.preVerificationGas = pmResult.preVerificationGas;

  // 3. Refine gas estimate from bundler
  const estimate = await sdk.bundler.estimateUserOperationGas(
    userOp,
    sdk.config.entryPoint,
  );
  userOp.callGasLimit = estimate.callGasLimit;
  userOp.verificationGasLimit = estimate.verificationGasLimit;
  userOp.preVerificationGas = estimate.preVerificationGas;

  // 4. Re-sign with final gas values
  const signedUserOp = await sdk.account.signUserOp(userOp);

  // 5. Send to bundler
  const result = await sdk.bundler.sendUserOperation(
    signedUserOp,
    sdk.config.entryPoint,
  );

  // 6. Optionally wait for receipt
  let receipt: UserOperationReceipt | undefined;
  if (opts?.waitForReceipt !== false) {
    receipt = await sdk.bundler.waitForReceipt(result.userOpHash);
  }

  return {
    userOpHash: result.userOpHash,
    receipt,
  };
}
