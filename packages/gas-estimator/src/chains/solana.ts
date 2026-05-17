import type { SolanaGasEstimate, GasCache } from './types.js';

const DEFAULT_COMPUTE_UNITS = 200_000;
const DEFAULT_COMPUTE_UNIT_PRICE = 1000n; // micro-lamports
const DEFAULT_BASE_FEE = 5000n; // lamports

/**
 * Solana gas (compute budget) estimation.
 */
export class SolanaEstimator {
  private cache: GasCache;

  constructor(cache: GasCache) {
    this.cache = cache;
  }

  /**
   * Estimate Solana compute budget fees.
   */
  async estimate(
    computeUnits: number = DEFAULT_COMPUTE_UNITS,
    computeUnitPrice: bigint = DEFAULT_COMPUTE_UNIT_PRICE,
  ): Promise<SolanaGasEstimate> {
    const priorityFee = (BigInt(computeUnits) * computeUnitPrice) / 1_000_000n;
    const estimatedCost = DEFAULT_BASE_FEE + priorityFee;

    return {
      computeUnits,
      computeUnitPrice,
      baseFee: DEFAULT_BASE_FEE,
      estimatedCost,
    };
  }

  /**
   * Get the current compute unit price from network.
   */
  async getComputeUnitPrice(rpcUrl: string): Promise<bigint> {
    const cacheKey = `solana:cup:${rpcUrl}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached.gasPrice;

    // In production, this would query Solana's recent prioritization fees
    const price = DEFAULT_COMPUTE_UNIT_PRICE;
    this.cache.set(cacheKey, {
      gasPrice: price,
      timestamp: Date.now(),
    });
    return price;
  }

  /**
   * Estimate compute units for a transaction.
   * Returns default estimate; in production, uses simulateTransaction.
   */
  async estimateComputeUnits(_tx: string): Promise<number> {
    return DEFAULT_COMPUTE_UNITS;
  }

  /**
   * Calculate total estimated cost for a Solana transaction.
   */
  async estimateTotal(
    computeUnits: number = DEFAULT_COMPUTE_UNITS,
    computeUnitPrice?: bigint,
  ): Promise<SolanaGasEstimate> {
    const price = computeUnitPrice ?? DEFAULT_COMPUTE_UNIT_PRICE;
    return this.estimate(computeUnits, price);
  }
}
