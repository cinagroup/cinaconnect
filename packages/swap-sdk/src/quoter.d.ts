/**
 * Swap Quoter — Aggregate quotes from multiple DEX providers.
 *
 * Fetches quotes from all configured DEX executors, compares them,
 * and returns the best route for the user.
 */
import type { BestQuote, SwapQuote, SwapQuoteParams } from "./types.js";
import type { SwapExecutor } from "./router.js";
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
export declare class SwapQuoter {
    private executors;
    private config;
    constructor(executors: SwapExecutor[], config?: Partial<QuoterConfig>);
    /**
     * Fetch quotes from all providers and return the best one.
     */
    getBestQuote(params: SwapQuoteParams): Promise<BestQuote>;
    /**
     * Fetch quotes from a single provider.
     */
    getQuoteFrom(provider: string, params: SwapQuoteParams): Promise<SwapQuote>;
    /**
     * Fetch quotes from all providers concurrently.
     */
    private fetchAllQuotes;
    /**
     * Enrich a quote with slippage protection and price impact data.
     */
    private enrichQuote;
    /**
     * Get all available provider names.
     */
    getAvailableProviders(): string[];
    /**
     * Add a new executor at runtime.
     */
    addExecutor(executor: SwapExecutor): void;
    /**
     * Remove an executor by name.
     */
    removeExecutor(name: string): void;
}
//# sourceMappingURL=quoter.d.ts.map