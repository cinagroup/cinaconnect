/**
 * Smart Router — Best price selection across DEX providers.
 *
 * The SwapRouter manages executor lifecycle, caches quotes,
 * and provides a unified interface for fetching and executing swaps.
 */
import type { BestQuote, SwapQuote, SwapQuoteParams, SwapReceipt, SwapTransaction, TokenInfo, SwapExecuteParams } from "./types.js";
import type { SwapQuoter } from "./quoter.js";
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
export declare class SwapRouter {
    private quoter;
    private executionEnabled;
    constructor(quoter: SwapQuoter);
    /**
     * Get the best quote across all providers.
     */
    getBestQuote(params: SwapQuoteParams): Promise<BestQuote>;
    /**
     * Compare quotes from all providers.
     */
    compareQuotes(params: SwapQuoteParams): Promise<SwapQuote[]>;
    /**
     * Enable or disable swap execution.
     * When disabled, only quotes are returned (dry-run mode).
     */
    setExecutionEnabled(enabled: boolean): void;
    /**
     * Execute a swap with the best available quote.
     *
     * @param params Swap parameters
     * @param executeParams Execution configuration
     * @returns Swap receipt
     */
    executeSwap(params: SwapQuoteParams, executeParams?: Partial<SwapExecuteParams>): Promise<SwapReceipt>;
    /**
     * Get supported tokens from all providers for a chain.
     */
    getSupportedTokens(chainId: number): Promise<TokenInfo[]>;
    /**
     * Calculate price impact for a given swap.
     */
    getPriceImpact(params: SwapQuoteParams): Promise<number>;
}
//# sourceMappingURL=router.d.ts.map