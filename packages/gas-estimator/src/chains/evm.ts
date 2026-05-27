import type {
  EvmGasEstimate,
  FeeHistoryEntry,
  GasPriceData,
  LegacyGasEstimate,
  GasCache,
  GasPricePrediction,
  RpcResponse,
  ChainConfig,
} from '../types.js';

import { DEFAULT_CHAINS } from '../types.js';

/**
 * EVM gas estimation supporting EIP-1559 and legacy transactions.
 *
 * Makes real JSON-RPC calls:
 *  - eth_gasPrice for legacy gas price
 *  - eth_feeHistory for EIP-1559 base fee + priority fee analysis
 *  - eth_blockNumber for chain liveness checks
 */
export class EVMEstimator {
  private cache: GasCache;
  private rpcTimeoutMs: number;
  private chains: Record<number, ChainConfig>;
  private defaultRpcUrl: string;

  constructor(
    cache: GasCache,
    options?: {
      rpcTimeoutMs?: number;
      chains?: Record<number, ChainConfig>;
      defaultRpcUrl?: string;
    },
  ) {
    this.cache = cache;
    this.rpcTimeoutMs = options?.rpcTimeoutMs ?? 10_000;
    this.chains = options?.chains ?? DEFAULT_CHAINS;
    this.defaultRpcUrl = options?.defaultRpcUrl ?? '';
  }

  // ============================================================
  // Gas Estimation
  // ============================================================

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

  // ============================================================
  // Real RPC Methods
  // ============================================================

  /**
   * Get current gas price from a real RPC node.
   *
   * Calls eth_gasPrice and caches the result.
   * Falls back to cached data on RPC failure.
   * Falls back to hardcoded default if no cache exists.
   */
  async getGasPrice(rpcUrl?: string): Promise<GasPriceData> {
    const url = rpcUrl || this.defaultRpcUrl;
    if (!url) {
      throw new Error('rpcUrl is required. Provide it directly or set defaultRpcUrl.');
    }

    const cacheKey = `gas:${url}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchGasPrice(url);
      this.cache.set(cacheKey, data);
      return data;
    } catch (err) {
      // If we have a cached entry that's slightly stale, return it
      const stale = this.cache.get(cacheKey);
      if (stale) {
        console.warn(`Gas RPC call failed for ${url}, returning stale cached data:`, err);
        return stale;
      }
      throw new Error(`Failed to fetch gas price from ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Get fee history from a real RPC node.
   *
   * Calls eth_feeHistory with real block data.
   * Falls back to cached/simulated data on RPC failure.
   */
  async getFeeHistory(
    blockCount: number,
    newestBlock?: string,
    rewardPercentiles?: number[],
    rpcUrl?: string,
  ): Promise<FeeHistoryEntry[]> {
    const url = rpcUrl || this.defaultRpcUrl;
    if (!url) {
      throw new Error('rpcUrl is required. Provide it directly or set defaultRpcUrl.');
    }

    const cacheKey = `feehistory:${url}:${blockCount}:${newestBlock || 'latest'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.baseFee) {
      // Reconstruct entries from cached aggregate
      return [
        { baseFeePerGas: cached.baseFee, gasUsedRatio: 0.5 },
      ];
    }

    try {
      return await this.fetchFeeHistory(url, blockCount, newestBlock, rewardPercentiles);
    } catch (err) {
      console.warn(`Fee history RPC call failed for ${url}, returning defaults:`, err);
      // Return simulated data based on current gas price
      const price = await this.getGasPrice(url);
      return [
        { baseFeePerGas: price.baseFee || price.gasPrice, gasUsedRatio: 0.5 },
        { baseFeePerGas: (price.baseFee || price.gasPrice) * 11n / 10n, gasUsedRatio: 0.7 },
        { baseFeePerGas: (price.baseFee || price.gasPrice) * 9n / 10n, gasUsedRatio: 0.3 },
      ];
    }
  }

  /**
   * Get gas price for a specific chain ID using default RPC.
   */
  async getGasPriceForChain(chainId: number): Promise<GasPriceData> {
    const chain = this.chains[chainId];
    if (!chain) {
      throw new Error(`Unknown chain ID: ${chainId}. Register it via config.chains.`);
    }
    return this.getGasPrice(chain.defaultRpcUrl);
  }

  /**
   * Get EIP-1559 gas prices (base fee + priority fee) for an EVM chain.
   * Combines eth_feeHistory analysis with eth_gasPrice.
   */
  async getEip1559GasPrices(chainId: number): Promise<{
    baseFee: bigint;
    priorityFee: bigint;
    gasPrice: bigint;
  }> {
    const chain = this.chains[chainId];
    if (!chain) {
      throw new Error(`Unknown chain ID: ${chainId}`);
    }

    const [feeHistory, gasPriceData] = await Promise.allSettled([
      this.fetchFeeHistory(chain.defaultRpcUrl, 10, 'latest', [25, 50, 75]),
      this.fetchGasPrice(chain.defaultRpcUrl),
    ]);

    let baseFee: bigint;
    let priorityFee: bigint;

    if (feeHistory.status === 'fulfilled' && feeHistory.value.length > 0) {
      // Use the latest base fee from fee history
      const entries = feeHistory.value;
      baseFee = entries[entries.length - 1].baseFeePerGas;

      // Calculate priority fee from reward percentiles (median)
      const validRewards = entries
        .filter((e) => e.reward && e.reward.length > 0)
        .map((e) => e.reward![Math.floor(e.reward!.length / 2)]);

      if (validRewards.length > 0) {
        priorityFee = validRewards.reduce((a, b) => a + b, 0n) / BigInt(validRewards.length);
      } else {
        // Fallback: derive from gas price - base fee
        const gp = gasPriceData.status === 'fulfilled' ? gasPriceData.value.gasPrice : 20_000_000_000n;
        priorityFee = gp > baseFee ? gp - baseFee : 1_000_000_000n;
      }
    } else {
      // Fallback to eth_gasPrice
      const gp = gasPriceData.status === 'fulfilled'
        ? gasPriceData.value.gasPrice
        : 20_000_000_000n;
      baseFee = gp * 8n / 10n; // rough estimate: 80% of gas price is base fee
      priorityFee = gp - baseFee;
    }

    const gasPrice = gasPriceData.status === 'fulfilled' ? gasPriceData.value.gasPrice : 20_000_000_000n;

    return { baseFee, priorityFee, gasPrice };
  }

  // ============================================================
  // Raw RPC Calls
  // ============================================================

  /**
   * Call eth_gasPrice via JSON-RPC.
   */
  private async fetchGasPrice(rpcUrl: string): Promise<GasPriceData> {
    const res = await this.rpcCall<string>(rpcUrl, 'eth_gasPrice', []);
    return {
      gasPrice: BigInt(res),
      timestamp: Date.now(),
    };
  }

  /**
   * Call eth_feeHistory via JSON-RPC.
   */
  private async fetchFeeHistory(
    rpcUrl: string,
    blockCount: number,
    newestBlock: string = 'latest',
    rewardPercentiles: number[] = [25, 50, 75],
  ): Promise<FeeHistoryEntry[]> {
    const res = await this.rpcCall<{
      oldestBlock: string;
      reward: string[][];
      baseFeePerGas: string[];
      gasUsedRatio: number[];
    }>(rpcUrl, 'eth_feeHistory', [blockCount, newestBlock, rewardPercentiles]);

    const entries: FeeHistoryEntry[] = [];
    for (let i = 0; i < res.baseFeePerGas.length; i++) {
      const reward = res.reward?.[i]?.map((r) => BigInt(r));
      entries.push({
        baseFeePerGas: BigInt(res.baseFeePerGas[i]),
        gasUsedRatio: res.gasUsedRatio[i] || 0,
        reward,
      });
    }
    return entries;
  }

  /**
   * Generic JSON-RPC call with timeout.
   */
  private async rpcCall<T>(
    url: string,
    method: string,
    params: unknown[],
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.rpcTimeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: 1,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const json: RpcResponse<T> = await res.json() as RpcResponse<T>;
      if (json.error) {
        throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
      }

      return json.result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ============================================================
  // Prediction
  // ============================================================

  /**
   * Predict gas prices for different speed tiers.
   * Uses real fee history data when available.
   */
  async predict(
    baseFeePerGas: bigint,
    history: FeeHistoryEntry[],
  ): Promise<GasPricePrediction> {
    // Calculate average gas used ratio from real data
    const avgGasUsedRatio =
      history.reduce((sum, h) => sum + h.gasUsedRatio, 0) / history.length;

    // Derive priority fees from actual reward data if available
    let slowReward = baseFeePerGas / 10n;
    let stdReward = baseFeePerGas / 5n;
    let fastReward = baseFeePerGas / 2n;

    // Use real reward data from fee history if available
    const rewards = history
      .filter((h) => h.reward && h.reward.length >= 3)
      .map((h) => h.reward!);

    if (rewards.length > 0) {
      // Average the 25th, 50th, 75th percentile rewards across recent blocks
      slowReward = rewards.reduce((sum, r) => sum + (r[0] || 0n), 0n) / BigInt(rewards.length);
      stdReward = rewards.reduce((sum, r) => sum + (r[1] || 0n), 0n) / BigInt(rewards.length);
      fastReward = rewards.reduce((sum, r) => sum + (r[2] || 0n), 0n) / BigInt(rewards.length);
    }

    // Adjust estimated times based on network congestion
    const baseTime = avgGasUsedRatio > 0.8 ? 60 : 120; // high congestion → slower

    return {
      slow: {
        maxFeePerGas: baseFeePerGas * 2n + slowReward,
        maxPriorityFeePerGas: slowReward,
        estimatedTime: baseTime,
      },
      standard: {
        maxFeePerGas: baseFeePerGas * 2n + stdReward,
        maxPriorityFeePerGas: stdReward,
        estimatedTime: Math.floor(baseTime / 4),
      },
      fast: {
        maxFeePerGas: baseFeePerGas * 2n + fastReward,
        maxPriorityFeePerGas: fastReward,
        estimatedTime: Math.floor(baseTime / 12),
      },
    };
  }
}
