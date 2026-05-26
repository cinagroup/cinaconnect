/**
 * Batch transaction builder.
 *
 * Collects operations, validates integrity, estimates gas,
 * and delegates execution to the BatchExecutor.
 *
 * Supports both simulated execution (no wallet) and real on-chain
 * execution via a viem WalletClient.
 */

import type { WalletClient, PublicClient } from 'viem';
import { Operation, BatchResult, OnChainBatchResult, OnChainExecuteOptions, ExecutionStrategy } from './types.js';
import { BatchExecutor, ExecuteOptions } from './executor.js';

export interface BatchConfig {
  /** Chain ID for the batch (all operations must match). */
  chainId: number;
  /** Whether the batch should be atomic (all or nothing). */
  atomic?: boolean;
  /** Maximum total gas allowed. */
  maxGas?: bigint;
}

export interface BatchSummary {
  operationCount: number;
  estimatedGas: bigint;
  valid: boolean;
  errors: string[];
}

/**
 * Options for executing a batch with a wallet client.
 */
export interface BatchExecuteOnChainOptions {
  /** Viem WalletClient for signing/sending transactions. */
  walletClient: WalletClient;
  /** Optional PublicClient for gas estimation / simulation. */
  publicClient?: PublicClient;
  /** Execution strategy (auto-detect if not specified). */
  strategy?: ExecutionStrategy;
  /** Override atomicity for this execution. */
  atomic?: boolean;
  /** Optional EIP-5792 capabilities (paymaster, etc.). */
  capabilities?: Record<string, unknown>;
  /** Optional MultiSend contract address override. */
  multisendAddress?: `0x${string}`;
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

export class BatchTransaction {
  private operations: Operation[] = [];
  private chainId: number;
  private atomic: boolean;
  private maxGas?: bigint;

  constructor(config: BatchConfig) {
    this.chainId = config.chainId;
    this.atomic = config.atomic ?? true;
    this.maxGas = config.maxGas;
  }

  /** Add an operation to the batch */
  add(operation: Operation): this {
    if (operation.chainId !== this.chainId) {
      throw new Error(
        `Operation chain ${operation.chainId} does not match batch chain ${this.chainId}`
      );
    }
    this.operations.push(operation);
    return this;
  }

  /** Remove an operation by index */
  removeAt(index: number): Operation | undefined {
    return this.operations.splice(index, 1)[0];
  }

  /** Get all operations */
  getOperations(): ReadonlyArray<Operation> {
    return this.operations;
  }

  /** Get operation count */
  size(): number {
    return this.operations.length;
  }

  /** Clear all operations */
  clear(): void {
    this.operations = [];
  }

  /** Validate batch integrity */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.operations.length === 0) {
      errors.push('Batch is empty');
    }

    // Check all operations match batch chain
    for (let i = 0; i < this.operations.length; i++) {
      const op = this.operations[i];
      if (op.chainId !== this.chainId) {
        errors.push(`Operation ${i}: chain mismatch (${op.chainId} !== ${this.chainId})`);
      }

      // Type-specific validation
      if (op.type === 'transfer' && !op.to) {
        errors.push(`Operation ${i}: transfer missing recipient`);
      }
      if (op.type === 'approve' && !op.spender) {
        errors.push(`Operation ${i}: approve missing spender`);
      }
      if (op.type === 'custom' && !op.data) {
        errors.push(`Operation ${i}: custom operation missing data`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /** Estimate total gas for the batch */
  estimate(): bigint {
    let total = 0n;
    for (const op of this.operations) {
      // Default gas estimates per operation type
      const defaults: Record<string, bigint> = {
        transfer: 65000n,
        approve: 46000n,
        swap: 150000n,
        custom: 100000n,
      };
      total += op.gasEstimate ?? defaults[op.type] ?? 100000n;
    }
    return total;
  }

  /** Build a summary */
  summary(): BatchSummary {
    const validation = this.validate();
    return {
      operationCount: this.operations.length,
      estimatedGas: this.estimate(),
      valid: validation.valid,
      errors: validation.errors,
    };
  }

  /**
   * Execute the batch (simulated).
   * Use executeOnChain() for real on-chain execution.
   */
  async execute(options: ExecuteOptions = {}): Promise<BatchResult> {
    const validation = this.validate();
    if (!validation.valid) {
      return {
        success: false,
        atomic: this.atomic,
        results: [],
        totalGasUsed: 0n,
        error: validation.errors.join('; '),
      };
    }

    if (this.maxGas) {
      const estimated = this.estimate();
      if (estimated > this.maxGas) {
        return {
          success: false,
          atomic: this.atomic,
          results: [],
          totalGasUsed: 0n,
          error: `Estimated gas ${estimated} exceeds max ${this.maxGas}`,
        };
      }
    }

    const executor = new BatchExecutor({ atomic: this.atomic });
    return executor.execute(this.operations, options);
  }

  /**
   * Execute the batch on-chain via a viem WalletClient.
   *
   * Supports three strategies:
   *   - EIP-5792 wallet_sendCalls (atomic, preferred for AA wallets)
   *   - MultiSend contract (atomic, for EOA + Safe ecosystems)
   *   - Sequential (non-atomic fallback)
   *
   * The strategy is auto-detected if not explicitly provided.
   */
  async executeOnChain(
    options: BatchExecuteOnChainOptions,
  ): Promise<OnChainBatchResult> {
    const validation = this.validate();
    if (!validation.valid) {
      return {
        success: false,
        atomic: options.atomic ?? this.atomic,
        strategy: options.strategy?.mode ?? 'sequential',
        results: [],
        totalGasUsed: 0n,
        error: validation.errors.join('; '),
      };
    }

    if (this.maxGas) {
      const estimated = this.estimate();
      if (estimated > this.maxGas) {
        return {
          success: false,
          atomic: options.atomic ?? this.atomic,
          strategy: options.strategy?.mode ?? 'sequential',
          results: [],
          totalGasUsed: 0n,
          error: `Estimated gas ${estimated} exceeds max ${this.maxGas}`,
        };
      }
    }

    const onChainOptions: OnChainExecuteOptions = {
      walletClient: options.walletClient,
      publicClient: options.publicClient,
      strategy: options.strategy,
      atomic: options.atomic ?? this.atomic,
      capabilities: options.capabilities,
      multisendAddress: options.multisendAddress,
      gasPrice: options.gasPrice,
      maxFeePerGas: options.maxFeePerGas,
      maxPriorityFeePerGas: options.maxPriorityFeePerGas,
      nonce: options.nonce,
      gasLimit: options.gasLimit,
    };

    const executor = new BatchExecutor({ atomic: this.atomic });
    return executor.executeOnChain(this.operations, onChainOptions);
  }

  /**
   * Estimate gas for the batch with detailed breakdown.
   * Optionally uses on-chain estimation via publicClient.
   */
  async estimateWithBreakdown(publicClient?: PublicClient) {
    const executor = new BatchExecutor({ atomic: this.atomic });
    return executor.estimateBatchGas(this.operations, publicClient);
  }
}
