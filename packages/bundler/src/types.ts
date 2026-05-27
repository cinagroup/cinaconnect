import type { Address, Hex, Hash, Chain, Transport, PublicClient } from 'viem';
/**
 * ERC-4337 UserOperation interface matching the standard specification.
 */
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

/** Gas estimate for a UserOperation */
export interface UserOperationGasEstimate {
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
}

/** Status of a submitted UserOperation */
export enum UserOperationStatus {
  Pending = 'pending',
  Included = 'included',
  Reverted = 'reverted',
  Failed = 'failed',
}

/** Receipt returned after UserOperation execution */
export interface UserOperationReceipt {
  userOpHash: Hash;
  sender: Address;
  nonce: bigint;
  actualGasUsed: bigint;
  actualGasCost: bigint;
  success: boolean;
  receipt: {
    transactionHash: Hash;
    blockNumber: bigint;
    gasUsed: bigint;
    logs: unknown[];
  };
  reason?: string;
}

/** Result of sending a UserOperation */
export interface SendUserOperationResult {
  userOpHash: Hash;
}

/** Result of simulating a UserOperation */
export interface UserOpSimulationResult {
  success: boolean;
  gasUsed?: bigint;
  revertReason?: string;
  simulationType?: 'validation' | 'validation_and_execution';
}

/** Configuration for a BundlerClient */
export interface BundlerConfig {
  bundlerUrl: string;
  chain: Chain;
  entryPoint: Address;
}
