/**
 * Account Abstraction types for @onchainux/aa-sdk
 */

export interface SmartAccountConfig {
  owner: string;
  entryPoint: string;
  factoryAddress?: string;
  index?: bigint;
  chainId: number;
  rpcUrl: string;
}

export interface UserOperation {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: string;
  signature: string;
}

export interface UserOperationResult {
  userOpHash: string;
  transactionHash?: string;
  status: 'pending' | 'success' | 'failed';
}

export interface BatchTransaction {
  to: string;
  value: bigint;
  data: string;
}

export interface SmartAccountState {
  address: string;
  owner: string;
  nonce: bigint;
  balance: bigint;
  isDeployed: boolean;
}

export interface FactoryConfig {
  address: string;
  entryPoint: string;
  saltNonce?: bigint;
}

export interface PaymasterConfig {
  url: string;
  apiKey?: string;
  sponsorType: 'gasless' | 'partial' | 'post-pay';
}

export interface PaymasterRequest {
  userOperation: UserOperation;
  entryPoint: string;
  chainId: number;
}

export interface PaymasterResponse {
  paymasterAndData: string;
  preVerificationGas?: bigint;
  verificationGasLimit?: bigint;
  callGasLimit?: bigint;
}

export interface BundlerConfig {
  url: string;
  apiKey?: string;
}

export interface BundlerEstimate {
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
}

export interface BundlerSendResult {
  userOpHash: string;
}
