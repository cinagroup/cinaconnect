/**
 * Slippage calculation and protection utilities.
 *
 * Provides helpers for computing minimum received amounts,
 * validating price impact, and constructing slippage-protected
 * swap parameters.
 */

import type { PriceImpact, SwapQuote } from "./types.js";

// ============================================================
// Constants
// ============================================================

const ONE_HUNDRED_PERCENT_BPS = 10_000n;

// ============================================================
// Core Functions
// ============================================================

/**
 * Calculate the minimum received amount given slippage tolerance.
 *
 * @param toAmount Expected output amount
 * @param slippageBps Slippage tolerance in basis points (e.g., 50 = 0.5%)
 * @returns The minimum amount the user must receive
 */
export function calculateMinimumReceived(
  toAmount: bigint,
  slippageBps: number,
): bigint {
  if (slippageBps < 0 || slippageBps > 10_000) {
    throw new Error("slippageBps must be between 0 and 10,000");
  }

  const slippageFactor = ONE_HUNDRED_PERCENT_BPS - BigInt(slippageBps);
  return (toAmount * slippageFactor) / ONE_HUNDRED_PERCENT_BPS;
}

/**
 * Calculate the price impact of a swap.
 *
 * @param fromAmount Input amount
 * @param toAmount Expected output amount
 * @param midPrice The mid-market price (output per unit input)
 * @returns Price impact assessment
 */
export function calculatePriceImpact(
  fromAmount: bigint,
  toAmount: bigint,
  midPrice: number,
): PriceImpact {
  if (fromAmount === 0n) {
    return {
      percentage: 0,
      severity: "low",
    };
  }

  // Convert to numbers for percentage calculation
  const inputNum = Number(fromAmount);
  const outputNum = Number(toAmount);
  const expectedOutput = inputNum * midPrice;

  if (expectedOutput === 0) {
    return {
      percentage: 100,
      severity: "critical",
      warning: "Unable to determine expected output",
    };
  }

  const impact = ((expectedOutput - outputNum) / expectedOutput) * 100;
  const absImpact = Math.abs(impact);

  const severity = classifyPriceImpact(absImpact);
  const warning = getImpactWarning(absImpact);

  return {
    percentage: Math.round(absImpact * 100) / 100,
    severity,
    warning,
  };
}

/**
 * Classify price impact severity.
 */
export function classifyPriceImpact(impactPercentage: number): PriceImpact["severity"] {
  if (impactPercentage < 1) return "low";
  if (impactPercentage < 3) return "medium";
  if (impactPercentage < 5) return "high";
  return "critical";
}

/**
 * Get a human-readable warning for price impact.
 */
export function getImpactWarning(impactPercentage: number): string | undefined {
  if (impactPercentage >= 5) {
    return "⚠️ Very high price impact. Consider reducing trade size.";
  }
  if (impactPercentage >= 3) {
    return "⚠️ High price impact. The trade may be unfavorable.";
  }
  if (impactPercentage >= 1) {
    return "ℹ️ Moderate price impact.";
  }
  return undefined;
}

/**
 * Check if a swap quote's price impact exceeds a threshold.
 *
 * @param quote The swap quote to check
 * @param maxImpactBps Maximum acceptable impact in basis points
 * @returns Whether the quote is acceptable
 */
export function isPriceImpactAcceptable(
  quote: SwapQuote,
  maxImpactBps: number,
): boolean {
  return quote.priceImpact <= maxImpactBps / 100;
}

/**
 * Calculate the effective exchange rate from a quote.
 *
 * @param fromAmount Input amount
 * @param toAmount Output amount
 * @returns Output per unit input (as a number)
 */
export function getExchangeRate(fromAmount: bigint, toAmount: bigint): number {
  if (fromAmount === 0n) return 0;
  return Number(toAmount) / Number(fromAmount);
}

/**
 * Calculate the percentage difference between two amounts.
 *
 * @param a First amount
 * @param b Second amount
 * @returns Percentage difference ((a - b) / b * 100)
 */
export function percentDiff(a: bigint, b: bigint): number {
  if (b === 0n) return a === 0n ? 0 : Infinity;
  return ((Number(a) - Number(b)) / Number(b)) * 100;
}

/**
 * Adjust slippage based on market conditions (volatility-aware).
 *
 * @param baseSlippageBps Base slippage in bps
 * @param volatilityScore Market volatility (0-100)
 * @returns Adjusted slippage in bps
 */
export function adjustSlippageForVolatility(
  baseSlippageBps: number,
  volatilityScore: number,
): number {
  const multiplier = 1 + (volatilityScore / 100) * 0.5;
  return Math.ceil(baseSlippageBps * multiplier);
}
