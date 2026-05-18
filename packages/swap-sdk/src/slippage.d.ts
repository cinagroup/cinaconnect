/**
 * Slippage calculation and protection utilities.
 *
 * Provides helpers for computing minimum received amounts,
 * validating price impact, and constructing slippage-protected
 * swap parameters.
 */
import type { PriceImpact, SwapQuote } from "./types.js";
/**
 * Calculate the minimum received amount given slippage tolerance.
 *
 * @param toAmount Expected output amount
 * @param slippageBps Slippage tolerance in basis points (e.g., 50 = 0.5%)
 * @returns The minimum amount the user must receive
 */
export declare function calculateMinimumReceived(toAmount: bigint, slippageBps: number): bigint;
/**
 * Calculate the price impact of a swap.
 *
 * @param fromAmount Input amount
 * @param toAmount Expected output amount
 * @param midPrice The mid-market price (output per unit input)
 * @returns Price impact assessment
 */
export declare function calculatePriceImpact(fromAmount: bigint, toAmount: bigint, midPrice: number): PriceImpact;
/**
 * Classify price impact severity.
 */
export declare function classifyPriceImpact(impactPercentage: number): PriceImpact["severity"];
/**
 * Get a human-readable warning for price impact.
 */
export declare function getImpactWarning(impactPercentage: number): string | undefined;
/**
 * Check if a swap quote's price impact exceeds a threshold.
 *
 * @param quote The swap quote to check
 * @param maxImpactBps Maximum acceptable impact in basis points
 * @returns Whether the quote is acceptable
 */
export declare function isPriceImpactAcceptable(quote: SwapQuote, maxImpactBps: number): boolean;
/**
 * Calculate the effective exchange rate from a quote.
 *
 * @param fromAmount Input amount
 * @param toAmount Output amount
 * @returns Output per unit input (as a number)
 */
export declare function getExchangeRate(fromAmount: bigint, toAmount: bigint): number;
/**
 * Calculate the percentage difference between two amounts.
 *
 * @param a First amount
 * @param b Second amount
 * @returns Percentage difference ((a - b) / b * 100)
 */
export declare function percentDiff(a: bigint, b: bigint): number;
/**
 * Adjust slippage based on market conditions (volatility-aware).
 *
 * @param baseSlippageBps Base slippage in bps
 * @param volatilityScore Market volatility (0-100)
 * @returns Adjusted slippage in bps
 */
export declare function adjustSlippageForVolatility(baseSlippageBps: number, volatilityScore: number): number;
//# sourceMappingURL=slippage.d.ts.map