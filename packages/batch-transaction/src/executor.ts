/**
 * Batch executor with atomicity support.
 *
 * Executes a series of operations on-chain, either atomically (all succeed or
 * all fail) or sequentially (individual success/failure tracked).
 *
 * Supports three execution strategies:
 *   1. EIP-5792 wallet_sendCalls — native atomic batch for supporting wallets
 *   2. MultiSend contract — encode into a single tx that reverts on failure
 *   3. Sequential — individual transactions (non-atomic)
 */

import type { Address, Hex, WalletClient, PublicClient } from 'viem';
import { pad, toHex, hexToBytes as viemHexToBytes } from 'viem';

import { Operation, BatchResult, OperationResult, OnChainBatchResult, OnChainExecuteOptions, BatchGasEstimate } from './types.js';
import { buildMultiSendCalldata, operationToMultiSendCall, getMultiSendAddress } from './multisend.js';

export interface ExecuteOptions {
  /** Override atomicity for this execution. */
  atomic?: boolean;
  /** Simulate execution (dry run, no actual tx). */
  simulate?: boolean;
  /** WalletClient for on-chain execution. */
  walletClient?: WalletClient;
  /** PublicClient for gas estimation / simulation. */
  publicClient?: PublicClient;
  /** Execution strategy hint. */
  strategy?: 'eip5792' | 'multisend' | 'sequential';
}

export interface BatchExecutionResult extends BatchResult {}

export interface ExecutorConfig {
  atomic?: boolean;
}

/** Gas params compatible with viem SendTransactionParameters */
type GasOverrides = {
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
};

export class BatchExecutor {
  private atomic: boolean;

  constructor(config: ExecutorConfig = {}) {
    this.atomic = config.atomic ?? true;
  }

  /**
   * Execute a batch of operations.
   *
   * If a walletClient is provided, performs real on-chain execution.
   * Otherwise, simulates the execution.
   */
  async execute(
    operations: Operation[],
    options: ExecuteOptions = {}
  ): Promise<BatchResult> {
    if (operations.length === 0) {
      return {
        success: false,
        atomic: options.atomic ?? this.atomic,
        results: [],
        totalGasUsed: 0n,
        error: 'Batch is empty',
      };
    }

    // On-chain execution path
    if (options.walletClient) {
      return this.executeOnChain(operations, {
        walletClient: options.walletClient,
        publicClient: options.publicClient,
        atomic: options.atomic ?? this.atomic,
        strategy: options.strategy
          ? { mode: options.strategy }
          : undefined,
      });
    }

    // Simulation / legacy path
    return this.executeSimulated(operations, options);
  }

  // ── On-Chain Execution ─────────────────────────────────────────

  /**
   * Execute a batch on-chain with the given options.
   */
  async executeOnChain(
    operations: Operation[],
    options: OnChainExecuteOptions,
  ): Promise<OnChainBatchResult> {
    const walletClient = options.walletClient;
    const strategy = options.strategy ?? this.detectStrategy(walletClient, operations);

    switch (strategy.mode) {
      case 'eip5792':
        return this.executeEip5792(operations, options);
      case 'multisend':
        return this.executeMultiSend(operations, options);
      case 'sequential':
        return this.executeSequential(operations, options);
      default:
        throw new Error(`Unknown execution strategy: ${(strategy as any).mode}`);
    }
  }

  /**
   * Auto-detect the best execution strategy.
   *
   * Preference order:
   *   1. EIP-5792 if wallet supports it (wallet_sendCalls)
   *   2. MultiSend if a known MultiSend address exists for the chain
   *   3. Sequential fallback
   */
  private detectStrategy(
    _walletClient: WalletClient,
    operations: Operation[],
  ): { mode: 'eip5792' | 'multisend' | 'sequential' } {
    // Try EIP-5792 first
    return { mode: 'eip5792' };
  }

  // ── EIP-5792 wallet_sendCalls ──────────────────────────────────

  /**
   * Execute via EIP-5792 wallet_sendCalls.
   *
   * This is the preferred method for wallets that support it.
   * All calls execute atomically within a single user operation.
   */
  private async executeEip5792(
    operations: Operation[],
    options: OnChainExecuteOptions,
  ): Promise<OnChainBatchResult> {
    const walletClient = options.walletClient;
    const account = (walletClient.account ?? undefined) as Address | undefined;

    if (!account) {
      throw new Error('EIP-5792 execution requires a connected wallet account');
    }

    const chainId = operations[0].chainId;
    const chainIdHex = `0x${chainId.toString(16)}` as Hex;

    // Convert operations to EIP-5792 Call format
    const calls = operations.map((op) => this.operationToEip5792Call(op));

    // Build wallet_sendCalls params
    const params = {
      version: '1.0.0',
      chainId: chainIdHex,
      from: account,
      calls,
      ...(options.capabilities ? { capabilities: options.capabilities } : {}),
    };

    try {
      const result = await (walletClient as any).request({
        method: 'wallet_sendCalls',
        params: [params],
      });

      const batchId = (result as { id: string }).id;

      return {
        success: true,
        atomic: true,
        strategy: 'eip5792',
        results: operations.map((op, i) => ({
          index: i,
          success: true,
          gasUsed: op.gasEstimate ?? 0n,
        })),
        totalGasUsed: operations.reduce((sum, op) => sum + (op.gasEstimate ?? 0n), 0n),
        eip5792BatchId: batchId,
        batchTxHash: undefined,
      };
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === -32601) {
        // wallet_sendCalls not supported, fall back to multisend
        if (getMultiSendAddress(chainId)) {
          return this.executeMultiSend(operations, { ...options, strategy: { mode: 'multisend' } });
        }
        return this.executeSequential(operations, { ...options, strategy: { mode: 'sequential' } });
      }

      return {
        success: false,
        atomic: true,
        strategy: 'eip5792',
        results: operations.map((_, i) => ({
          index: i,
          success: false,
          error: `EIP-5792 execution failed: ${err.message}`,
        })),
        totalGasUsed: 0n,
        error: `EIP-5792 execution failed: ${err.message}`,
      };
    }
  }

  /**
   * Convert an Operation to an EIP-5792 Call object.
   */
  private operationToEip5792Call(op: Operation): { to: Address; value?: Hex; data?: Hex } {
    switch (op.type) {
      case 'transfer':
        if (op.tokenAddress) {
          // ERC-20 transfer: transfer(address,uint256) selector = 0xa9059cbb
          const paddedTo = pad(op.to as Hex, { size: 20, dir: 'right' });
          const paddedAmount = pad(toHex(op.value), { size: 32 });
          const data = `0xa9059cbb${bytesToHex(viemHexToBytes(paddedTo)).slice(2)}${bytesToHex(viemHexToBytes(paddedAmount)).slice(2)}` as Hex;
          return { to: op.tokenAddress as Address, data };
        }
        // Native ETH transfer
        return { to: op.to as Address, value: `0x${op.value.toString(16)}` as Hex };

      case 'approve': {
        // approve(address,uint256) selector = 0x095ea7b3
        const paddedSpender = pad(op.spender as Hex, { size: 20, dir: 'right' });
        const paddedAmount = pad(toHex(op.amount), { size: 32 });
        const data = `0x095ea7b3${bytesToHex(viemHexToBytes(paddedSpender)).slice(2)}${bytesToHex(viemHexToBytes(paddedAmount)).slice(2)}` as Hex;
        return { to: op.tokenAddress as Address, data };
      }

      case 'swap': {
        if (!op.routeData) {
          throw new Error('Swap operation requires routeData for on-chain execution');
        }
        return {
          to: (op.routerAddress ?? '0x0000000000000000000000000000000000000000') as Address,
          data: op.routeData as Hex,
        };
      }

      case 'custom':
        return {
          to: op.to as Address,
          value: op.value ? `0x${op.value.toString(16)}` as Hex : undefined,
          data: op.data as Hex,
        };

      default:
        throw new Error(`Unknown operation type: ${(op as Operation).type}`);
    }
  }

  // ── MultiSend Contract ─────────────────────────────────────────

  /**
   * Execute via Gnosis Safe MultiSend contract.
   *
   * Encodes all operations into a single calldata blob and sends
   * one transaction to the MultiSend contract. If any operation
   * fails, the entire batch reverts (atomic).
   */
  private async executeMultiSend(
    operations: Operation[],
    options: OnChainExecuteOptions,
  ): Promise<OnChainBatchResult> {
    const walletClient = options.walletClient;
    const account = (walletClient.account ?? undefined) as Address | undefined;

    if (!account) {
      throw new Error('MultiSend execution requires a connected wallet account');
    }

    const chainId = operations[0].chainId;
    const multisendAddress = (options.multisendAddress ?? getMultiSendAddress(chainId)) as Address;

    if (!multisendAddress) {
      throw new Error(`No MultiSend contract address known for chain ${chainId}`);
    }

    // Build MultiSend calldata
    const calldata = buildMultiSendCalldata(
      operations.map(operationToMultiSendCall),
    );

    // Estimate gas if publicClient is available
    let gasLimit = options.gasLimit;
    if (!gasLimit && options.publicClient) {
      try {
        const estimated = await options.publicClient.estimateGas({
          account,
          to: multisendAddress,
          data: calldata,
        });
        // Add 20% safety margin
        gasLimit = (estimated * 120n) / 100n;
      } catch {
        // Fallback: sum individual gas + overhead
        gasLimit = this.estimateMultiSendGas(operations);
      }
    } else if (!gasLimit) {
      gasLimit = this.estimateMultiSendGas(operations);
    }

    const gasOverrides = this.buildGasOverrides(options);

    try {
      const hash = await (walletClient as any).sendTransaction({
        account: account,
        to: multisendAddress,
        data: calldata,
        gas: gasLimit,
        ...gasOverrides,
      });

      return {
        success: true,
        atomic: true,
        strategy: 'multisend',
        results: operations.map((op, i) => ({
          index: i,
          success: true,
          gasUsed: op.gasEstimate ?? 0n,
        })),
        totalGasUsed: gasLimit,
        transactionHash: hash as Hex,
        batchTxHash: hash,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        atomic: true,
        strategy: 'multisend',
        results: operations.map((_, i) => ({
          index: i,
          success: false,
          error: `MultiSend execution failed: ${err.message}`,
        })),
        totalGasUsed: 0n,
        error: `MultiSend execution failed: ${err.message}`,
        transactionHash: undefined,
      };
    }
  }

  /**
   * Estimate gas for a MultiSend batch execution.
   *
   * Sum of individual operation gas + 20% overhead for encoding/multisend.
   */
  private estimateMultiSendGas(operations: Operation[]): bigint {
    let base = 0n;
    const defaults: Record<string, bigint> = {
      transfer: 65000n,
      approve: 46000n,
      swap: 150000n,
      custom: 100000n,
    };

    for (const op of operations) {
      base += op.gasEstimate ?? defaults[op.type] ?? 100000n;
    }

    // 20% overhead for MultiSend encoding + execution
    return (base * 120n) / 100n;
  }

  // ── Sequential Execution ───────────────────────────────────────

  /**
   * Execute operations sequentially as individual transactions.
   *
   * NOT atomic — individual failures don't revert previous transactions.
   * Only use when atomicity is not required or no other option exists.
   */
  private async executeSequential(
    operations: Operation[],
    options: OnChainExecuteOptions,
  ): Promise<OnChainBatchResult> {
    const walletClient = options.walletClient;
    const account = (walletClient.account ?? undefined) as Address | undefined;

    if (!account) {
      throw new Error('Sequential execution requires a connected wallet account');
    }

    const results: OperationResult[] = [];
    let totalGasUsed = 0n;
    let lastTxHash: Hex | undefined;
    const useAtomic = options.atomic ?? this.atomic;
    const gasOverrides = this.buildGasOverrides(options);

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      try {
        const txResult = await this.sendSingleTransaction(walletClient, account, op, gasOverrides);
        results.push({
          index: i,
          success: true,
          txHash: txResult.hash,
          gasUsed: txResult.gasUsed ?? (op.gasEstimate ?? 0n),
        });
        totalGasUsed += txResult.gasUsed ?? (op.gasEstimate ?? 0n);
        lastTxHash = txResult.hash as Hex;
      } catch (error: unknown) {
        const err = error as Error;
        results.push({
          index: i,
          success: false,
          error: err.message,
        });

        if (useAtomic) {
          // Mark remaining as skipped
          for (let j = i + 1; j < operations.length; j++) {
            results.push({
              index: j,
              success: false,
              error: 'Skipped due to atomic failure',
            });
          }
          return {
            success: false,
            atomic: true,
            strategy: 'sequential',
            results,
            totalGasUsed,
            error: `Operation ${i} failed: ${err.message}`,
            transactionHash: lastTxHash,
          };
        }
      }
    }

    return {
      success: results.every((r) => r.success),
      atomic: false,
      strategy: 'sequential',
      results,
      totalGasUsed,
      transactionHash: lastTxHash,
      batchTxHash: lastTxHash,
    };
  }

  /**
   * Send a single transaction for an operation.
   */
  private async sendSingleTransaction(
    walletClient: WalletClient,
    account: Address,
    op: Operation,
    gasOverrides: GasOverrides,
  ): Promise<{ hash: string; gasUsed?: bigint }> {
    const baseTx: { account: any; gas: bigint } = {
      account: account as any,
      gas: op.gasEstimate ?? 100000n,
    };

    switch (op.type) {
      case 'transfer':
        if (op.tokenAddress) {
          // ERC-20 transfer
          const paddedTo = pad(op.to as Hex, { size: 20, dir: 'right' });
          const paddedAmount = pad(toHex(op.value), { size: 32 });
          const data = `0xa9059cbb${bytesToHex(viemHexToBytes(paddedTo)).slice(2)}${bytesToHex(viemHexToBytes(paddedAmount)).slice(2)}` as Hex;
          const hash = await (walletClient as any).sendTransaction({
            ...baseTx,
            to: op.tokenAddress as Address,
            data,
            gas: op.gasEstimate ?? 65000n,
            ...gasOverrides,
          });
          return { hash };
        }
        // Native ETH transfer
        const hash = await (walletClient as any).sendTransaction({
          ...baseTx,
          to: op.to as Address,
          value: op.value,
          gas: op.gasEstimate ?? 65000n,
          ...gasOverrides,
        });
        return { hash };

      case 'approve': {
        const paddedSpender = pad(op.spender as Hex, { size: 20, dir: 'right' });
        const paddedAmount = pad(toHex(op.amount), { size: 32 });
        const data = `0x095ea7b3${bytesToHex(viemHexToBytes(paddedSpender)).slice(2)}${bytesToHex(viemHexToBytes(paddedAmount)).slice(2)}` as Hex;
        const hash = await (walletClient as any).sendTransaction({
          ...baseTx,
          to: op.tokenAddress as Address,
          data,
          gas: op.gasEstimate ?? 46000n,
          ...gasOverrides,
        });
        return { hash };
      }

      case 'swap': {
        if (!op.routeData) {
          throw new Error('Swap operation requires routeData');
        }
        const hash = await (walletClient as any).sendTransaction({
          ...baseTx,
          to: (op.routerAddress ?? '0x0000000000000000000000000000000000000000') as Address,
          data: op.routeData as Hex,
          gas: op.gasEstimate ?? 150000n,
          ...gasOverrides,
        });
        return { hash };
      }

      case 'custom': {
        const hash = await (walletClient as any).sendTransaction({
          ...baseTx,
          to: op.to as Address,
          data: op.data as Hex,
          value: op.value ?? 0n,
          gas: op.gasEstimate ?? 100000n,
          ...gasOverrides,
        });
        return { hash };
      }

      default:
        throw new Error(`Unknown operation type: ${(op as Operation).type}`);
    }
  }

  // ── Gas Estimation ─────────────────────────────────────────────

  /**
   * Estimate gas for a batch of operations.
   *
   * Returns a detailed breakdown including base gas, overhead,
   * and per-operation estimates.
   */
  async estimateBatchGas(
    operations: Operation[],
    publicClient?: PublicClient,
  ): Promise<BatchGasEstimate> {
    const defaults: Record<string, bigint> = {
      transfer: 65000n,
      approve: 46000n,
      swap: 150000n,
      custom: 100000n,
    };

    const perOperation = operations.map((op, index) => ({
      index,
      gas: op.gasEstimate ?? defaults[op.type] ?? 100000n,
      type: op.type,
    }));

    const baseGas = perOperation.reduce((sum, p) => sum + p.gas, 0n);

    // Overhead: ~10% for batch encoding + multicall overhead
    const overheadGas = (baseGas * 10n) / 100n;

    // If publicClient is available, try on-chain estimation
    if (publicClient && operations.length > 0) {
      try {
        const dummyAccount = '0x0000000000000000000000000000000000000001' as Address;
        const calldata = buildMultiSendCalldata(
          operations.map(operationToMultiSendCall),
        );
        const multisendAddress = getMultiSendAddress(operations[0].chainId);
        if (multisendAddress) {
          const estimated = await publicClient.estimateGas({
            account: dummyAccount,
            to: multisendAddress,
            data: calldata,
          });
          return {
            baseGas,
            overheadGas: estimated - baseGas > 0n ? estimated - baseGas : overheadGas,
            totalGas: estimated,
            perOperation,
          };
        }
      } catch {
        // Fall through to calculated estimate
      }
    }

    return {
      baseGas,
      overheadGas,
      totalGas: baseGas + overheadGas,
      perOperation,
    };
  }

  // ── Helper: build gas overrides for sendTransaction ────────────

  /**
   * Build viem-compatible gas overrides from OnChainExecuteOptions.
   */
  private buildGasOverrides(options: OnChainExecuteOptions): GasOverrides {
    const overrides: GasOverrides = {};
    if (options.gasPrice !== undefined) overrides.gasPrice = options.gasPrice;
    if (options.maxFeePerGas !== undefined) overrides.maxFeePerGas = options.maxFeePerGas;
    if (options.maxPriorityFeePerGas !== undefined) overrides.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
    if (options.nonce !== undefined) overrides.nonce = Number(options.nonce);
    return overrides;
  }

  // ── Simulated Execution (legacy) ───────────────────────────────

  /**
   * Execute a batch of operations (simulated).
   * Used when no walletClient is provided.
   */
  private async executeSimulated(
    operations: Operation[],
    options: ExecuteOptions,
  ): Promise<BatchResult> {
    const useAtomic = options.atomic ?? this.atomic;
    const results: OperationResult[] = [];
    let totalGasUsed = 0n;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const result = await this.executeOperation(op, i, options);
      results.push(result);
      totalGasUsed += result.gasUsed ?? 0n;

      if (!result.success && useAtomic) {
        // Atomic mode: fail fast, mark remaining as skipped
        for (let j = i + 1; j < operations.length; j++) {
          results.push({
            index: j,
            success: false,
            error: 'Skipped due to atomic failure',
          });
        }
        return {
          success: false,
          atomic: useAtomic,
          results,
          totalGasUsed,
          error: `Operation ${i} failed: ${result.error}`,
        };
      }
    }

    return {
      success: results.every((r) => r.success),
      atomic: useAtomic,
      results,
      totalGasUsed,
    };
  }

  /** Execute a single operation (simulated) */
  private async executeOperation(
    operation: Operation,
    index: number,
    options: ExecuteOptions
  ): Promise<OperationResult> {
    if (options.simulate) {
      return {
        index,
        success: true,
        gasUsed: operation.gasEstimate ?? 50000n,
      };
    }

    // In production, this would send actual transactions.
    // For now, simulate based on operation structure.
    try {
      switch (operation.type) {
        case 'transfer':
          if (!operation.to) throw new Error('Missing recipient');
          break;
        case 'approve':
          if (!operation.spender) throw new Error('Missing spender');
          break;
        case 'swap':
          if (!operation.fromToken || !operation.toToken) throw new Error('Missing tokens');
          break;
        case 'custom':
          if (!operation.data) throw new Error('Missing calldata');
          break;
      }

      return {
        index,
        success: true,
        txHash: `0xsim${index}${Date.now().toString(16)}`,
        gasUsed: operation.gasEstimate ?? 50000n,
      };
    } catch (err) {
      return {
        index,
        success: false,
        error: (err as Error).message,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Hex/bytes helper
// ---------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): Hex {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as Hex;
}
