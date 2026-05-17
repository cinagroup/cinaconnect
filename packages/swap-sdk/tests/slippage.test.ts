/**
 * Tests for slippage calculation and protection.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMinimumReceived,
  calculatePriceImpact,
  classifyPriceImpact,
  getImpactWarning,
  isPriceImpactAcceptable,
  getExchangeRate,
  percentDiff,
  adjustSlippageForVolatility,
} from '../src/slippage.js';
import type { SwapQuote, PriceImpact } from '../src/types.js';

describe('calculateMinimumReceived', () => {
  it('should calculate minimum received with 0% slippage', () => {
    const result = calculateMinimumReceived(1_000_000n, 0);
    expect(result).toBe(1_000_000n);
  });

  it('should calculate minimum received with 1% slippage (100 bps)', () => {
    const result = calculateMinimumReceived(1_000_000n, 100);
    // 1_000_000 * (10_000 - 100) / 10_000 = 1_000_000 * 0.99 = 990_000
    expect(result).toBe(990_000n);
  });

  it('should calculate minimum received with 0.5% slippage (50 bps)', () => {
    const result = calculateMinimumReceived(2_000_000n, 50);
    // 2_000_000 * 0.995 = 1_990_000
    expect(result).toBe(1_990_000n);
  });

  it('should calculate minimum received with 5% slippage (500 bps)', () => {
    const result = calculateMinimumReceived(100n, 500);
    // 100 * 0.95 = 95
    expect(result).toBe(95n);
  });

  it('should calculate minimum received with 100% slippage (10000 bps)', () => {
    const result = calculateMinimumReceived(1_000_000n, 10_000);
    expect(result).toBe(0n);
  });

  it('should throw for negative slippage', () => {
    expect(() => calculateMinimumReceived(1_000_000n, -1)).toThrow(
      'slippageBps must be between 0 and 10,000'
    );
  });

  it('should throw for slippage over 10000 bps', () => {
    expect(() => calculateMinimumReceived(1_000_000n, 10_001)).toThrow(
      'slippageBps must be between 0 and 10,000'
    );
  });

  it('should handle large amounts without precision loss', () => {
    // 1 ETH in wei
    const oneEth = 1_000_000_000_000_000_000n;
    const result = calculateMinimumReceived(oneEth, 50);
    // 1 ETH * 0.995 = 0.995 ETH
    expect(result).toBe(995_000_000_000_000_000n);
  });
});

describe('calculatePriceImpact', () => {
  it('should return 0 impact for zero input', () => {
    const impact = calculatePriceImpact(0n, 0n, 1.0);
    expect(impact.percentage).toBe(0);
    expect(impact.severity).toBe('low');
  });

  it('should calculate impact for a simple swap', () => {
    // Input: 1 unit, mid-price: 100 output per input
    // Expected: 100, Actual: 95
    // Impact: (100 - 95) / 100 * 100 = 5%
    const impact = calculatePriceImpact(1n, 95n, 100);
    expect(impact.percentage).toBe(5);
    expect(impact.severity).toBe('high');
  });

  it('should classify critical impact', () => {
    // Input: 1, mid-price: 100, actual: 50 → 50% impact
    const impact = calculatePriceImpact(1n, 50n, 100);
    expect(impact.percentage).toBe(50);
    expect(impact.severity).toBe('critical');
    expect(impact.warning).toContain('Very high price impact');
  });

  it('should handle zero expected output', () => {
    const impact = calculatePriceImpact(100n, 0n, 0);
    expect(impact.percentage).toBe(100);
    expect(impact.severity).toBe('critical');
  });

  it('should return low severity for small impact', () => {
    // 0.5% impact
    const impact = calculatePriceImpact(100n, 995n, 10);
    expect(impact.severity).toBe('low');
  });
});

describe('classifyPriceImpact', () => {
  it('should classify low impact (< 1%)', () => {
    expect(classifyPriceImpact(0.5)).toBe('low');
    expect(classifyPriceImpact(0.99)).toBe('low');
  });

  it('should classify medium impact (1-3%)', () => {
    expect(classifyPriceImpact(1.0)).toBe('medium');
    expect(classifyPriceImpact(2.99)).toBe('medium');
  });

  it('should classify high impact (3-5%)', () => {
    expect(classifyPriceImpact(3.0)).toBe('high');
    expect(classifyPriceImpact(4.99)).toBe('high');
  });

  it('should classify critical impact (5%+)', () => {
    expect(classifyPriceImpact(5.0)).toBe('critical');
    expect(classifyPriceImpact(10.0)).toBe('critical');
    expect(classifyPriceImpact(50.0)).toBe('critical');
  });

  it('should classify zero impact as low', () => {
    expect(classifyPriceImpact(0)).toBe('low');
  });
});

describe('getImpactWarning', () => {
  it('should return undefined for low impact', () => {
    expect(getImpactWarning(0.5)).toBeUndefined();
    expect(getImpactWarning(0.99)).toBeUndefined();
  });

  it('should return moderate warning for 1-3%', () => {
    expect(getImpactWarning(1.0)).toContain('Moderate');
    expect(getImpactWarning(2.5)).toContain('Moderate');
  });

  it('should return high warning for 3-5%', () => {
    expect(getImpactWarning(3.0)).toContain('High price impact');
    expect(getImpactWarning(4.5)).toContain('High price impact');
  });

  it('should return very high warning for 5%+', () => {
    expect(getImpactWarning(5.0)).toContain('Very high price impact');
    expect(getImpactWarning(10.0)).toContain('Very high price impact');
  });
});

describe('isPriceImpactAcceptable', () => {
  function makeQuote(priceImpact: number): SwapQuote {
    return {
      id: 'test',
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n,
      toAmount: 1_000n,
      priceImpact,
      route: [],
      gasEstimate: 0n,
      minimumReceived: 0n,
      provider: 'test',
      expiresAt: Date.now() + 60_000,
    };
  }

  it('should accept low price impact', () => {
    const quote = makeQuote(0.5); // 0.5%
    expect(isPriceImpactAcceptable(quote, 100)).toBe(true); // 1% max
  });

  it('should reject high price impact', () => {
    const quote = makeQuote(5.0); // 5%
    expect(isPriceImpactAcceptable(quote, 100)).toBe(false); // 1% max
  });

  it('should accept when impact equals threshold', () => {
    const quote = makeQuote(1.0); // 1%
    expect(isPriceImpactAcceptable(quote, 100)).toBe(true); // 1% max (100/100)
  });
});

describe('getExchangeRate', () => {
  it('should calculate exchange rate correctly', () => {
    expect(getExchangeRate(100n, 200n)).toBe(2);
    expect(getExchangeRate(200n, 100n)).toBe(0.5);
  });

  it('should return 0 for zero input', () => {
    expect(getExchangeRate(0n, 100n)).toBe(0);
  });

  it('should handle large numbers', () => {
    // 1 ETH -> 3000 USDC
    const eth = 1_000_000_000_000_000_000n;
    const usdc = 3_000_000_000n; // 3000 * 10^6
    const rate = getExchangeRate(eth, usdc);
    expect(rate).toBeCloseTo(0.000000003, 9);
  });
});

describe('percentDiff', () => {
  it('should calculate percentage difference', () => {
    expect(percentDiff(110n, 100n)).toBe(10);
    expect(percentDiff(90n, 100n)).toBe(-10);
  });

  it('should return 0 for equal values', () => {
    expect(percentDiff(100n, 100n)).toBe(0);
  });

  it('should return 0 when both are zero', () => {
    expect(percentDiff(0n, 0n)).toBe(0);
  });

  it('should return Infinity when denominator is zero', () => {
    expect(percentDiff(100n, 0n)).toBe(Infinity);
  });
});

describe('adjustSlippageForVolatility', () => {
  it('should not adjust slippage at zero volatility', () => {
    expect(adjustSlippageForVolatility(50, 0)).toBe(50);
  });

  it('should increase slippage for moderate volatility', () => {
    const adjusted = adjustSlippageForVolatility(50, 50);
    // 50 * (1 + 50/100 * 0.5) = 50 * 1.25 = 62.5 → ceil = 63
    expect(adjusted).toBe(63);
  });

  it('should increase slippage for high volatility', () => {
    const adjusted = adjustSlippageForVolatility(50, 100);
    // 50 * (1 + 1 * 0.5) = 50 * 1.5 = 75
    expect(adjusted).toBe(75);
  });

  it('should always round up', () => {
    // 50 * (1 + 10/100 * 0.5) = 50 * 1.05 = 52.5 → 53
    expect(adjustSlippageForVolatility(50, 10)).toBe(53);
  });
});
