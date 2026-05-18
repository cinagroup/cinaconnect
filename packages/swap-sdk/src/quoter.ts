/**
 * Swap Quoter — Aggregate quotes from multiple DEX providers.
 *
 * Fetches quotes from all configured DEX executors, compares them,
 * and returns the best route for the user.
 */

import type { BestQuote, SwapQuote, SwapQuoteParams, SwapRoute, SwapTransaction } from "./types.js";
import type { SwapExecutor } from "./router.js";
import { calculatePriceImpact, classifyPriceImpact, calculateMinimumReceived } from "./slippage.js";

// ============================================================
// Quoter Interface
// ============================================================

export interface QuoterConfig {
  /** Maximum time to wait for all quotes (ms) */
  quoteTimeoutMs: number;
  /** Default slippage in bps */
  defaultSlippageBps: number;
  /** Enable mid-price checks for price impact */
  enablePriceImpactCheck: boolean;
  /** Minimum output amount to consider a quote valid */
  minOutputThreshold: bigint;
}

const DEFAULT_CONFIG: QuoterConfig = {
  quoteTimeoutMs: 5000,
  defaultSlippageBps: 50,
  enablePriceImpactCheck: true,
  minOutputThreshold: 0n,
};

// ============================================================
// SwapQuoter
// ============================================================

export class SwapQuoter {
  private executors: SwapExecutor[];
  private config: QuoterConfig;

  constructor(executors: SwapExecutor[], config?: Partial<QuoterConfig>) {
    this.executors = executors;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetch quotes from all providers and return the best one.
   */
  async getBestQuote(params: SwapQuoteParams): Promise<BestQuote> {
    const allQuotes = await this.fetchAllQuotes(params);

    // Filter out invalid quotes
    const validQuotes = allQuotes.filter(
      (q) =>
        q.toAmount > this.config.minOutputThreshold &&
        q.toAmount > 0n
    );

    if (validQuotes.length === 0) {
      throw new Error("No valid swap quotes available");
    }

    // Sort by output amount descending (best price first)
    validQuotes.sort((a, b) => {
      if (b.toAmount > a.toAmount) return 1;
      if (b.toAmount < a.toAmount) return -1;
      // Tie-breaker: prefer lower gas
      return a.gasEstimate < b.gasEstimate ? 1 : -1;
    });

    const best = validQuotes[0];
    const second = validQuotes.length > 1 ? validQuotes[1] : null;
    const savingsVsSecond = second
      ? best.toAmount - second.toAmount
      : 0n;

    return {
      quote: best,
      allQuotes: validQuotes,
      savingsVsSecond,
    };
  }

  /**
   * Fetch quotes from a single provider.
   */
  async getQuoteFrom(provider: string, params: SwapQuoteParams): Promise<SwapQuote> {
    const executor = this.executors.find((e) => e.name === provider);
    if (!executor) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    return executor.getQuote(params);
  }

  /**
   * Fetch quotes from all providers concurrently.
   */
  private async fetchAllQuotes(params: SwapQuoteParams): Promise<SwapQuote[]> {
    const quotePromises = this.executors.map(async (executor) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.quoteTimeoutMs);

        const quote = await executor.getQuote(params);

        clearTimeout(timeout);

        // Enrich with slippage calculation
        return this.enrichQuote(quote, params.slippageBps);
      } catch (err) {
        // Log and skip failed providers
        console.warn(`Quote failed for ${executor.name}:`, err);
        return null;
      }
    });

    const results = await Promise.allSettled(quotePromises);

    return results
      .filter((r): r is PromiseFulfilledResult<SwapQuote | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((q): q is SwapQuote => q !== null);
  }

  /**
   * Enrich a quote with slippage protection and price impact data.
   */
  private enrichQuote(quote: SwapQuote, slippageBps: number): SwapQuote {
    // Calculate minimum received
    const minimumReceived = calculateMinimumReceived(quote.toAmount, slippageBps);

    return {
      ...quote,
      minimumReceived,
    };
  }

  /**
   * Get all available provider names.
   */
  getAvailableProviders(): string[] {
    return this.executors.map((e) => e.name);
  }

  /**
   * Add a new executor at runtime.
   */
  addExecutor(executor: SwapExecutor): void {
    this.executors.push(executor);
  }

  /**
   * Remove an executor by name.
   */
  removeExecutor(name: string): void {
    this.executors = this.executors.filter((e) => e.name !== name);
  }
}
