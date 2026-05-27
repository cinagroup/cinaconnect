/**
 * Account Abstraction types for @cinacoin/aa-sdk
 *
 * Designed to be compatible with ERC-4337 UserOperation specification
 * and the cinacoin bundler RPC interface.
 */

import type { Address, Hash, Hex, Chain } from 'viem';

// ── Core UserOperation ──────────────────────────────────────────────

export interface UserOperation {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}

export interface UserOperationResult {
  userOpHash: Hash;
  transactionHash?: Hash;
  status: 'pending' | 'success' | 'failed';
}

export interface UserOperationReceipt {
  userOpHash: Hash;
  sender: Address;
  nonce: bigint;
  actualGasCost: bigint;
  actualGasUsed: bigint;
  success: boolean;
  transactionHash?: Hash;
  blockNumber?: bigint;
  logs?: unknown[];
  reason?: string;
}

export interface UserOperationGasEstimate {
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
}

export enum UserOperationStatus {
  Pending = 'pending',
  Included = 'included',
  Reverted = 'reverted',
  Failed = 'failed',
}

// ── Transactions ────────────────────────────────────────────────────

export interface BatchTransaction {
  to: Address;
  value: bigint;
  data: Hex;
}

// ── Account State ───────────────────────────────────────────────────

export interface SmartAccountState {
  address: Address;
  owner: Address;
  nonce: bigint;
  balance: bigint;
  isDeployed: boolean;
}

// ── Configuration ───────────────────────────────────────────────────

export interface SmartAccountConfig {
  owner: Address;
  entryPoint: Address;
  factoryAddress?: Address;
  index?: bigint;
  chainId: number;
  rpcUrl: string;
}

export interface FactoryConfig {
  address: Address;
  entryPoint: Address;
  saltNonce?: bigint;
}

export interface BundlerConfig {
  url: string;
  apiKey?: string;
}

export interface BundlerSendResult {
  userOpHash: Hash;
}

export interface PaymasterConfig {
  url: string;
  apiKey?: string;
  sponsorType: 'gasless' | 'partial' | 'post-pay';
}

export interface PaymasterRequest {
  userOperation: UserOperation;
  entryPoint: Address;
  chainId: number;
}

export interface PaymasterResponse {
  paymasterAndData: Hex;
  preVerificationGas?: bigint;
  verificationGasLimit?: bigint;
  callGasLimit?: bigint;
}

// ── SDK-level config (used by createSmartAccount) ───────────────────

export interface AASDKConfig {
  /** Private key hex (0x‑prefixed) of the account owner. */
  privateKey: Hex;
  /** Bundler RPC endpoint URL. */
  bundlerUrl: string;
  /** Optional API key for the bundler. */
  bundlerApiKey?: string;
  /** Paymaster endpoint URL. */
  paymasterUrl: string;
  /** Optional API key for the paymaster. */
  paymasterApiKey?: string;
  /** Factory contract address that deploys smart accounts. */
  factoryAddress: Address;
  /** ERC-4337 entry point address. */
  entryPoint: Address;
  /** Viem Chain definition. */
  chain: Chain;
  /** Node RPC URL for reading on-chain state (balance, nonce, etc.). */
  rpcUrl: string;
  /** Account salt / index for deterministic address derivation. */
  index?: bigint;
  /** Sponsor type for the paymaster. */
  sponsorType?: 'gasless' | 'partial' | 'post-pay';
}
