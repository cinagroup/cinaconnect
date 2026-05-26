/**
 * Operation and result types for batch transactions.
 */

import type { Hex, Address, WalletClient, PublicClient } from 'viem';

export type OperationType = 'transfer' | 'approve' | 'swap' | 'custom';

export interface OperationBase {
  type: OperationType;
  chainId: number;
  /** Estimated gas limit for this operation (in wei). */
  gasEstimate?: bigint;
  /** Optional label for human readability. */
  label?: string;
}

export interface TransferOperation extends OperationBase {
  type: 'transfer';
  from: string;
  to: string;
  value: bigint;
  tokenAddress?: string; // native transfer if undefined
}

export interface ApproveOperation extends OperationBase {
  type: 'approve';
  from: string;
  tokenAddress: string;
  spender: string;
  amount: bigint;
}

export interface SwapOperation extends OperationBase {
  type: 'swap';
  from: string;
  fromToken: string;
  toToken: string;
  fromAmount: bigint;
  minToAmount: bigint;
  routerAddress?: string;
  routeData?: string;
}

export interface CustomOperation extends OperationBase {
  type: 'custom';
  from: string;
  to: string;
  data: string;
  value?: bigint;
}

export type Operation = TransferOperation | ApproveOperation | SwapOperation | CustomOperation;

export interface OperationResult {
  index: number;
  success: boolean;
  txHash?: string;
  gasUsed?: bigint;
  error?: string;
}

export interface BatchResult {
  success: boolean;
  atomic: boolean;
  results: OperationResult[];
  totalGasUsed: bigint;
  batchTxHash?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// On-chain execution types
// ---------------------------------------------------------------------------

/** Strategy for on-chain batch execution. */
export type ExecutionStrategy =
  | { mode: 'eip5792' }       // wallet_sendCalls (atomic via wallet)
  | { mode: 'multisend' }     // Gnosis Safe MultiSend contract
  | { mode: 'sequential' };   // send individual transactions (non-atomic)

/** Configuration for on-chain batch execution. */
export interface OnChainExecuteOptions {
  /** Viem WalletClient for signing/sending. */
  walletClient: WalletClient;
  /** Optional PublicClient for simulation/gas estimation. */
  publicClient?: PublicClient;
  /** Execution strategy (auto-detect if not specified). */
  strategy?: ExecutionStrategy;
  /** Override atomicity for this execution. */
  atomic?: boolean;
  /** Optional EIP-5792 capabilities (paymaster, etc.). */
  capabilities?: Record<string, unknown>;
  /** Optional MultiSend contract address override. */
  multisendAddress?: Address;
  /** Optional gas price override (wei). */
  gasPrice?: bigint;
  /** Optional max fee per gas (wei). */
  maxFeePerGas?: bigint;
  /** Optional max priority fee per gas (wei). */
  maxPriorityFeePerGas?: bigint;
  /** Optional nonce override. */
  nonce?: bigint;
  /** Optional gas limit override for the entire batch. */
  gasLimit?: bigint;
}

/** Result from on-chain batch execution with extra metadata. */
export interface OnChainBatchResult extends BatchResult {
  /** The execution strategy that was actually used. */
  strategy: ExecutionStrategy['mode'];
  /** EIP-5792 batch ID (if wallet_sendCalls was used). */
  eip5792BatchId?: string;
  /** Raw transaction hash (if multisend/sequential was used). */
  transactionHash?: Hex;
}

/** Gas estimation for a batch of operations. */
export interface BatchGasEstimate {
  /** Sum of individual operation gas estimates. */
  baseGas: bigint;
  /** Overhead for batch encoding/multisend. */
  overheadGas: bigint;
  /** Total estimated gas (base + overhead). */
  totalGas: bigint;
  /** Per-operation gas breakdown. */
  perOperation: { index: number; gas: bigint; type: OperationType }[];
}
