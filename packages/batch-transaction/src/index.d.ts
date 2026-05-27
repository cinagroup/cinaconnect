/**
 * Batch Transaction SDK for Cinacoin.
 *
 * Atomic batch operations with gas estimation and validation.
 */
export { BatchTransaction } from './batch.js';
export type { BatchConfig, BatchSummary } from './batch.js';
export { BatchExecutor } from './executor.js';
export type { ExecuteOptions, BatchExecutionResult } from './executor.js';
export { createTransferOperation } from './operations/transfer.js';
export { createApproveOperation } from './operations/approve.js';
export { createSwapOperation } from './operations/swap.js';
export { createCustomOperation } from './operations/custom.js';
export type { Operation, TransferOperation, ApproveOperation, SwapOperation, CustomOperation, OperationType, BatchResult, OperationResult, } from './types.js';
//# sourceMappingURL=index.d.ts.map