/**
 * React hook for on-chain batch transaction execution.
 *
 * Usage:
 *   const { execute, isLoading, error, result, reset } = useBatchTransaction();
 *
 *   await execute(batch, { walletClient });
 */

import { useState, useCallback, useRef } from 'react';
import type { WalletClient, PublicClient } from 'viem';
import { BatchTransaction } from '../batch.js';
import type { BatchExecuteOnChainOptions } from '../batch.js';
import type { OnChainBatchResult, Operation, ExecutionStrategy } from '../types.js';

// ---------------------------------------------------------------------------
// Hook state interface
// ---------------------------------------------------------------------------

export interface UseBatchTransactionState {
  /** Whether an execution is currently in progress. */
  isLoading: boolean;
  /** Error message if execution failed, null otherwise. */
  error: string | null;
  /** The last successful batch result, or null. */
  result: OnChainBatchResult | null;
  /** The last submitted batch, or null. */
  submittedBatch: BatchTransaction | null;
}

/** Parameters for the useBatchTransaction hook. */
export interface UseBatchTransactionOptions {
  /** Optional default PublicClient for gas estimation. */
  publicClient?: PublicClient;
  /** Optional default execution strategy. */
  defaultStrategy?: ExecutionStrategy;
  /** Optional callback on successful execution. */
  onSuccess?: (result: OnChainBatchResult) => void;
  /** Optional callback on execution error. */
  onError?: (error: string) => void;
  /** Optional callback when execution starts. */
  onStart?: () => void;
}

/** Return type for the useBatchTransaction hook. */
export interface UseBatchTransactionReturn {
  /** Current state: loading, error, result. */
  state: UseBatchTransactionState;
  /** Whether an execution is in progress. */
  isLoading: boolean;
  /** Error message if any. */
  error: string | null;
  /** Last successful result. */
  result: OnChainBatchResult | null;
  /**
   * Execute a batch on-chain.
   *
   * @param operations - Array of operations to execute.
   * @param options - Execution options including walletClient.
   * @returns The batch result.
   */
  execute: (
    operations: Operation[],
    options: Omit<BatchExecuteOnChainOptions, 'walletClient'> & {
      walletClient: WalletClient;
      chainId: number;
    },
  ) => Promise<OnChainBatchResult>;
  /** Execute a pre-built BatchTransaction. */
  executeBatch: (
    batch: BatchTransaction,
    options: Omit<BatchExecuteOnChainOptions, 'walletClient'> & {
      walletClient: WalletClient;
    },
  ) => Promise<OnChainBatchResult>;
  /** Reset state to initial. */
  reset: () => void;
}

const initialState: UseBatchTransactionState = {
  isLoading: false,
  error: null,
  result: null,
  submittedBatch: null,
};

/**
 * React hook for executing batch transactions on-chain.
 *
 * Provides loading/error/receipt state management for batch execution.
 */
export function useBatchTransaction(
  options: UseBatchTransactionOptions = {},
): UseBatchTransactionReturn {
  const [state, setState] = useState<UseBatchTransactionState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  /** Reset state to initial. */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(initialState);
  }, []);

  /** Execute a pre-built BatchTransaction on-chain. */
  const executeBatch = useCallback(
    async (
      batch: BatchTransaction,
      executeOptions: Omit<BatchExecuteOnChainOptions, 'walletClient'> & {
        walletClient: WalletClient;
      },
    ): Promise<OnChainBatchResult> => {
      // Cancel any in-flight execution
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        isLoading: true,
        error: null,
        result: null,
        submittedBatch: batch,
      });

      options.onStart?.();

      try {
        if (controller.signal.aborted) {
          throw new Error('Execution aborted');
        }

        const result = await batch.executeOnChain(executeOptions);

        if (controller.signal.aborted) {
          throw new Error('Execution aborted');
        }

        if (result.success) {
          setState({
            isLoading: false,
            error: null,
            result,
            submittedBatch: batch,
          });
          options.onSuccess?.(result);
        } else {
          setState({
            isLoading: false,
            error: result.error ?? 'Batch execution failed',
            result,
            submittedBatch: batch,
          });
          options.onError?.(result.error ?? 'Batch execution failed');
        }

        return result;
      } catch (err) {
        if (err instanceof Error && err.message === 'Execution aborted') {
          return {
            success: false,
            atomic: executeOptions.atomic ?? true,
            strategy: executeOptions.strategy?.mode ?? 'sequential',
            results: [],
            totalGasUsed: 0n,
            error: 'Execution aborted',
          };
        }

        const errorMessage = (err as Error).message ?? 'Unknown error';
        setState({
          isLoading: false,
          error: errorMessage,
          result: null,
          submittedBatch: batch,
        });
        options.onError?.(errorMessage);

        throw err;
      }
    },
    [options],
  );

  /** Build and execute a batch from raw operations. */
  const execute = useCallback(
    async (
      operations: Operation[],
      executeOptions: Omit<BatchExecuteOnChainOptions, 'walletClient'> & {
        walletClient: WalletClient;
        chainId: number;
      },
    ): Promise<OnChainBatchResult> => {
      const { chainId, walletClient, ...rest } = executeOptions;

      const batch = new BatchTransaction({
        chainId,
        atomic: rest.atomic,
      });

      for (const op of operations) {
        batch.add(op);
      }

      return executeBatch(batch, { walletClient, ...rest });
    },
    [executeBatch],
  );

  return {
    state,
    isLoading: state.isLoading,
    error: state.error,
    result: state.result,
    execute,
    executeBatch,
    reset,
  };
}
