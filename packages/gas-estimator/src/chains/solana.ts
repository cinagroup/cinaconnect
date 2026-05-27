import type { SolanaGasEstimate, GasCache, RpcResponse } from '../types.js';

const DEFAULT_COMPUTE_UNITS = 200_000;
const DEFAULT_COMPUTE_UNIT_PRICE = 1000n; // micro-lamports
const DEFAULT_BASE_FEE = 5000n; // lamports

/**
 * Solana gas (compute budget) estimation.
 *
 * Makes real JSON-RPC calls:
 *  - getRecentPrioritizationFees for compute unit price
 *  - simulateTransaction for compute unit estimation
 */
export class SolanaEstimator {
  private cache: GasCache;
  private rpcTimeoutMs: number;
  private defaultRpcUrl: string;

  constructor(
    cache: GasCache,
    options?: {
      rpcTimeoutMs?: number;
      defaultRpcUrl?: string;
    },
  ) {
    this.cache = cache;
    this.rpcTimeoutMs = options?.rpcTimeoutMs ?? 10_000;
    this.defaultRpcUrl = options?.defaultRpcUrl || 'https://api.mainnet-beta.solana.com';
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
   * Get the current compute unit price from Solana RPC.
   *
   * Calls getRecentPrioritizationFees and caches the result.
   */
  async getComputeUnitPrice(rpcUrl?: string): Promise<bigint> {
    const url = rpcUrl || this.defaultRpcUrl;
    const cacheKey = `solana:cup:${url}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached.gasPrice;

    try {
      const price = await this.fetchRecentPrioritizationFees(url);
      this.cache.set(cacheKey, {
        gasPrice: price,
        timestamp: Date.now(),
      });
      return price;
    } catch (err) {
      console.warn(`Solana RPC call failed for ${url}, returning default:`, err);
      return DEFAULT_COMPUTE_UNIT_PRICE;
    }
  }

  /**
   * Estimate compute units for a transaction via simulateTransaction.
   *
   * If the RPC call fails, returns the default estimate.
   */
  async estimateComputeUnits(
    encodedTx: string,
    rpcUrl?: string,
  ): Promise<number> {
    const url = rpcUrl || this.defaultRpcUrl;
    const cacheKey = `solana:cu:${encodedTx.slice(0, 64)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return Number(cached.gasPrice);

    try {
      const units = await this.fetchSimulateUnits(url, encodedTx);
      this.cache.set(cacheKey, {
        gasPrice: BigInt(units),
        timestamp: Date.now(),
      });
      return units;
    } catch {
      // Simulate failed; return default
      return DEFAULT_COMPUTE_UNITS;
    }
  }

  /**
   * Calculate total estimated cost for a Solana transaction.
   * Uses real compute unit price from RPC if available.
   */
  async estimateTotal(
    computeUnits: number = DEFAULT_COMPUTE_UNITS,
    computeUnitPrice?: bigint,
    rpcUrl?: string,
  ): Promise<SolanaGasEstimate> {
    const price = computeUnitPrice ?? (await this.getComputeUnitPrice(rpcUrl));
    return this.estimate(computeUnits, price);
  }

  // ============================================================
  // Raw RPC Calls
  // ============================================================

  /**
   * Call getRecentPrioritizationFees via Solana JSON-RPC.
   * Returns the median prioritization fee from recent slots.
   */
  private async fetchRecentPrioritizationFees(rpcUrl: string): Promise<bigint> {
    const res = await this.rpcCall<{
      prioritizationFee: number;
      slot: number;
    }[]>(rpcUrl, 'getRecentPrioritizationFees', []);

    if (res.length === 0) {
      return DEFAULT_COMPUTE_UNIT_PRICE;
    }

    // Sort by fee and take the median (50th percentile)
    const sorted = res.map((r) => r.prioritizationFee).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return BigInt(median);
  }

  /**
   * Call simulateTransaction via Solana JSON-RPC.
   * Returns the compute units consumed by the transaction.
   */
  private async fetchSimulateUnits(
    rpcUrl: string,
    encodedTx: string,
  ): Promise<number> {
    const res = await this.rpcCall<{
      value: {
        err: unknown;
        unitsConsumed?: number;
        logs: string[];
      };
    }>(rpcUrl, 'simulateTransaction', [
      encodedTx,
      { sigVerify: false, replaceRecentBlockhash: true },
    ]);

    if (res.value.err) {
      throw new Error(`Transaction simulation failed: ${JSON.stringify(res.value.err)}`);
    }

    return res.value.unitsConsumed ?? DEFAULT_COMPUTE_UNITS;
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

      const json = await res.json() as { jsonrpc: '2.0'; id: number; result: T; error?: { code: number; message: string } };
      if (json.error) {
        throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
      }

      return json.result;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
