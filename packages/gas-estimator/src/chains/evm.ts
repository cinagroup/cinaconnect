import type {
  EvmGasEstimate,
  FeeHistoryEntry,
  GasPriceData,
  LegacyGasEstimate,
  GasCache,
  GasPricePrediction,
} from './types.js';

/**
 * EVM gas estimation supporting EIP-1559 and legacy transactions.
 */
export class EVMEstimator {
  private cache: GasCache;

  constructor(cache: GasCache) {
    this.cache = cache;
  }

  /**
   * Estimate gas for an EIP-1559 transaction.
   */
  async estimate(
    gasLimit: bigint,
    baseFeePerGas: bigint,
    priorityFeePerGas: bigint,
  ): Promise<EvmGasEstimate> {
    const maxFeePerGas = baseFeePerGas * 2n + priorityFeePerGas;
    const estimatedCost = gasLimit * maxFeePerGas;

    return {
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFeePerGas,
      baseFeePerGas,
      estimatedCost,
    };
  }

  /**
   * Estimate gas for a legacy transaction.
   */
  async estimateLegacy(
    gasLimit: bigint,
    gasPrice: bigint,
  ): Promise<LegacyGasEstimate> {
    const estimatedCost = gasLimit * gasPrice;
    return { gasLimit, gasPrice, estimatedCost };
  }

  /**
   * Get gas price from the cache or a provider.
   */
  async getGasPrice(rpcUrl: string): Promise<GasPriceData> {
    const cacheKey = `gas:${rpcUrl}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // In production, this would call eth_gasPrice
    // Here we simulate with a fallback
    const data: GasPriceData = {
      gasPrice: 20_000_000_000n, // 20 gwei default
      timestamp: Date.now(),
    };
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Get fee history for fee analysis.
   */
  async getFeeHistory(
    _blockCount: number,
    _newestBlock?: string,
    _rewardPercentiles?: number[],
  ): Promise<FeeHistoryEntry[]> {
    // In production, this would call eth_feeHistory
    // Return simulated data
    return [
      { baseFeePerGas: 20_000_000_000n, gasUsedRatio: 0.5 },
      { baseFeePerGas: 22_000_000_000n, gasUsedRatio: 0.7 },
      { baseFeePerGas: 18_000_000_000n, gasUsedRatio: 0.3 },
    ];
  }

  /**
   * Predict gas prices for different speed tiers.
   */
  async predict(
    baseFeePerGas: bigint,
    history: FeeHistoryEntry[],
  ): Promise<GasPricePrediction> {
    const avgGasUsedRatio =
      history.reduce((sum, h) => sum + h.gasUsedRatio, 0) / history.length;

    // Slow: next block, minimal priority fee
    const slowPriorityFee = baseFeePerGas / 10n;
    // Standard: moderate priority
    const stdPriorityFee = baseFeePerGas / 5n;
    // Fast: high priority
    const fastPriorityFee = baseFeePerGas / 2n;

    return {
      slow: {
        maxFeePerGas: baseFeePerGas * 2n + slowPriorityFee,
        maxPriorityFeePerGas: slowPriorityFee,
        estimatedTime: 120, // seconds
      },
      standard: {
        maxFeePerGas: baseFeePerGas * 2n + stdPriorityFee,
        maxPriorityFeePerGas: stdPriorityFee,
        estimatedTime: 30,
      },
      fast: {
        maxFeePerGas: baseFeePerGas * 2n + fastPriorityFee,
        maxPriorityFeePerGas: fastPriorityFee,
        estimatedTime: 10,
      },
    };
  }
}
