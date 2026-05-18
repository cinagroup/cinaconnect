/**
 * Smart Router — Best price selection across DEX providers.
 *
 * The SwapRouter manages executor lifecycle, caches quotes,
 * and provides a unified interface for fetching and executing swaps.
 */

import type {
  BestQuote,
  SwapQuote,
  SwapQuoteParams,
  SwapReceipt,
  SwapTransaction,
  TokenInfo,
  SwapExecuteParams,
} from "./types.js";
import type { SwapQuoter } from "./quoter.js";

// ============================================================
// Executor Interface
// ============================================================

/**
 * Interface that all DEX executors must implement.
 */
export interface SwapExecutor {
  /** Unique executor name */
  name: string;
  /** Whether this executor is currently available */
  isAvailable(): Promise<boolean>;
  /** Get a swap quote */
  getQuote(params: SwapQuoteParams): Promise<SwapQuote>;
  /** Get encoded transaction data for execution */
  getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction>;
  /** Get supported tokens on a chain */
  getSupportedTokens(chainId: number): Promise<TokenInfo[]>;
}

// ============================================================
// SwapExecuteParams
// ============================================================

/**
 * Parameters for executing a swap.
 */
/**
 * Parameters for executing a swap.
 */
export interface RouterExecuteParams {
  /** The quote to execute */
  quote: SwapQuote;
  /** Override slippage (defaults to quote's original) */
  slippageBps?: number;
  /** Max gas price to accept (wei) */
  maxGasPrice?: bigint;
  /** Transaction timeout (ms) */
  timeoutMs?: number;
}

// ============================================================
// SwapRouter
// ============================================================

export class SwapRouter {
  private quoter: SwapQuoter;
  private executionEnabled: boolean;

  constructor(quoter: SwapQuoter) {
    this.quoter = quoter;
    this.executionEnabled = false;
  }

  /**
   * Get the best quote across all providers.
   */
  async getBestQuote(params: SwapQuoteParams): Promise<BestQuote> {
    return this.quoter.getBestQuote(params);
  }

  /**
   * Compare quotes from all providers.
   */
  async compareQuotes(params: SwapQuoteParams): Promise<SwapQuote[]> {
    const best = await this.getBestQuote(params);
    return best.allQuotes;
  }

  /**
   * Enable or disable swap execution.
   * When disabled, only quotes are returned (dry-run mode).
   */
  setExecutionEnabled(enabled: boolean): void {
    this.executionEnabled = enabled;
  }

  /**
   * Execute a swap with the best available quote.
   *
   * @param params Swap parameters
   * @param executeParams Execution configuration
   * @returns Swap receipt
   */
  async executeSwap(
    params: SwapQuoteParams,
    executeParams?: Partial<SwapExecuteParams>,
  ): Promise<SwapReceipt> {
    if (!this.executionEnabled) {
      throw new Error("Swap execution is disabled. Call setExecutionEnabled(true) first.");
    }

    const best = await this.getBestQuote(params);
    const slippageBps = executeParams?.slippageBps ?? params.slippageBps;

    // Validate quote freshness
    if (Date.now() > best.quote.expiresAt) {
      throw new Error("Quote has expired. Please request a new quote.");
    }

    // In production, this would:
    // 1. Get the transaction data from the executor
    // 2. Send the transaction via viem walletClient
    // 3. Wait for confirmation
    // 4. Return the receipt

    return {
      txHash: "0x" as `0x${string}`, // Placeholder
      quoteId: best.quote.id,
      fromAmount: best.quote.fromAmount,
      toAmount: best.quote.toAmount,
      gasUsed: best.quote.gasEstimate,
      gasPrice: 0n,
      blockNumber: 0n,
      success: true,
    };
  }

  /**
   * Get supported tokens from all providers for a chain.
   */
  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
    const tokenSets = await Promise.all(
      this.quoter.getAvailableProviders().map(async (_name) => {
        // Token lists would be fetched per-provider
        return [] as TokenInfo[];
      }),
    );

    // Deduplicate by address
    const tokenMap = new Map<string, TokenInfo>();
    for (const tokens of tokenSets.flat()) {
      tokenMap.set(tokens.address.toLowerCase(), tokens);
    }

    return Array.from(tokenMap.values());
  }

  /**
   * Calculate price impact for a given swap.
   */
  async getPriceImpact(params: SwapQuoteParams): Promise<number> {
    const best = await this.getBestQuote(params);
    return best.quote.priceImpact;
  }
}
