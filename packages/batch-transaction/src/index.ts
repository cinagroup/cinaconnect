/**
 * Batch Transaction SDK for Cinacoin.
 *
 * Atomic batch operations with gas estimation and on-chain execution.
 */

// Core
export { BatchTransaction } from './batch.js';
export type { BatchConfig, BatchSummary, BatchExecuteOnChainOptions } from './batch.js';

// Executor
export { BatchExecutor } from './executor.js';
export type { ExecuteOptions, BatchExecutionResult } from './executor.js';

// Operation factories
export { createTransferOperation } from './operations/transfer.js';
export { createApproveOperation } from './operations/approve.js';
export { createSwapOperation } from './operations/swap.js';
export { createCustomOperation } from './operations/custom.js';

// MultiSend helper
export {
  MULTI_SEND_ABI,
  MULTI_SEND_ADDRESSES,
  getMultiSendAddress,
  encodeMultiSendCall,
  encodeMultiSendBatch,
  buildMultiSendCalldata,
  operationToMultiSendCall,
  operationsToMultiSendCalldata,
} from './multisend.js';
export type { MultiSendCall } from './multisend.js';

// Types
export type {
  Operation,
  TransferOperation,
  ApproveOperation,
  SwapOperation,
  CustomOperation,
  OperationType,
  BatchResult,
  OperationResult,
  // On-chain execution types
  ExecutionStrategy,
  OnChainExecuteOptions,
  OnChainBatchResult,
  BatchGasEstimate,
} from './types.js';

// React hook (requires react peer dependency)
export { useBatchTransaction } from './hooks/useBatchTransaction.js';
export type {
  UseBatchTransactionOptions,
  UseBatchTransactionReturn,
  UseBatchTransactionState,
} from './hooks/useBatchTransaction.js';
