/**
 * Tests for SwapQuoter — quote aggregation, best price selection.
 * Uses mock executors to avoid real HTTP calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SwapQuoter, QuoterConfig } from '../src/quoter.js';
import type { SwapQuote, SwapQuoteParams } from '../src/types.js';
import type { SwapExecutor } from '../src/router.js';
import type { TokenInfo, SwapTransaction } from '../src/types.js';

// Mock executor factory
function createMockExecutor(
  name: string,
  toAmount: bigint,
  priceImpact: number = 0.5,
  gasEstimate: bigint = 150_000n,
): SwapExecutor {
  return {
    name,
    isAvailable: async () => true,
    getQuote: async (params: SwapQuoteParams): Promise<SwapQuote> => ({
      id: `quote-${name}-${Date.now()}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      toAmount,
      priceImpact,
      route: [
        {
          protocol: name,
          fromToken: params.fromToken,
          toToken: params.toToken,
          fromAmount: params.fromAmount,
          toAmount,
          gasEstimate,
        },
      ],
      gasEstimate,
      minimumReceived: 0n,
      provider: name,
      expiresAt: Date.now() + 60_000,
    }),
    getTransaction: async (quote: SwapQuote, slippageBps: number): Promise<SwapTransaction> => ({
      to: quote.toToken as `0x${string}`,
      value: 0n,
      data: '0xmock' as `0x${string}`,
      gasLimit: quote.gasEstimate,
    }),
    getSupportedTokens: async (chainId: number): Promise<TokenInfo[]> => [],
  };
}

// Failing executor
function createFailingExecutor(name: string, error: string): SwapExecutor {
  return {
    name,
    isAvailable: async () => false,
    getQuote: async (_params: SwapQuoteParams): Promise<SwapQuote> => {
      throw new Error(error);
    },
    getTransaction: async () => ({
      to: '0x' as `0x${string}`,
      value: 0n,
      data: '0x' as `0x${string}`,
      gasLimit: 0n,
    }),
    getSupportedTokens: async (): Promise<TokenInfo[]> => [],
  };
}

describe('SwapQuoter', () => {
  let quoter: SwapQuoter;
  let executors: SwapExecutor[];

  beforeEach(() => {
    executors = [
      createMockExecutor('uniswap', 1_000_000n, 0.5),
      createMockExecutor('oneinch', 1_020_000n, 0.3, 140_000n),
      createMockExecutor('zerox', 980_000n, 0.8, 160_000n),
    ];
    quoter = new SwapQuoter(executors);
  });

  it('should return best quote by highest output amount', async () => {
    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const best = await quoter.getBestQuote(params);
    expect(best.quote.provider).toBe('oneinch');
    expect(best.quote.toAmount).toBe(1_020_000n);
  });

  it('should return all valid quotes for comparison', async () => {
    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const best = await quoter.getBestQuote(params);
    expect(best.allQuotes).toHaveLength(3);
    // Sorted by output descending
    expect(best.allQuotes[0].toAmount).toBe(1_020_000n);
    expect(best.allQuotes[1].toAmount).toBe(1_000_000n);
    expect(best.allQuotes[2].toAmount).toBe(980_000n);
  });

  it('should calculate savings vs second best', async () => {
    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const best = await quoter.getBestQuote(params);
    expect(best.savingsVsSecond).toBe(1_020_000n - 1_000_000n);
    expect(best.savingsVsSecond).toBe(20_000n);
  });

  it('should have zero savings when only one quote', async () => {
    const singleExecutor = [createMockExecutor('uniswap', 1_000_000n)];
    quoter = new SwapQuoter(singleExecutor);

    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const best = await quoter.getBestQuote(params);
    expect(best.savingsVsSecond).toBe(0n);
  });

  it('should filter out quotes with zero output', async () => {
    const executorsWithZero = [
      createMockExecutor('uniswap', 0n),
      createMockExecutor('oneinch', 1_000_000n),
    ];
    quoter = new SwapQuoter(executorsWithZero);

    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const best = await quoter.getBestQuote(params);
    expect(best.allQuotes).toHaveLength(1);
    expect(best.quote.provider).toBe('oneinch');
  });

  it('should throw when no valid quotes available', async () => {
    const failingExecutors = [
      createFailingExecutor('broken1', 'Network error'),
      createFailingExecutor('broken2', 'API down'),
    ];
    quoter = new SwapQuoter(failingExecutors);

    // Suppress console.warn in test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    await expect(quoter.getBestQuote(params)).rejects.toThrow('No valid swap quotes available');
    warnSpy.mockRestore();
  });

  it('should skip failing executors and return remaining quotes', async () => {
    const mixedExecutors = [
      createMockExecutor('uniswap', 1_000_000n),
      createFailingExecutor('broken', 'API error'),
      createMockExecutor('oneinch', 1_050_000n),
    ];
    quoter = new SwapQuoter(mixedExecutors);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const best = await quoter.getBestQuote(params);
    expect(best.allQuotes).toHaveLength(2);
    expect(best.quote.provider).toBe('oneinch');
    warnSpy.mockRestore();
  });

  it('should get quote from a specific provider', async () => {
    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const quote = await quoter.getQuoteFrom('uniswap', params);
    expect(quote.provider).toBe('uniswap');
    expect(quote.toAmount).toBe(1_000_000n);
  });

  it('should throw when requesting quote from unknown provider', async () => {
    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    await expect(quoter.getQuoteFrom('unknown', params)).rejects.toThrow('Unknown provider');
  });

  it('should return available provider names', () => {
    const providers = quoter.getAvailableProviders();
    expect(providers).toEqual(['uniswap', 'oneinch', 'zerox']);
  });

  it('should add executor at runtime', () => {
    expect(quoter.getAvailableProviders()).toHaveLength(3);
    quoter.addExecutor(createMockExecutor('sushiswap', 990_000n));
    expect(quoter.getAvailableProviders()).toHaveLength(4);
    expect(quoter.getAvailableProviders()).toContain('sushiswap');
  });

  it('should remove executor by name', () => {
    quoter.removeExecutor('zerox');
    expect(quoter.getAvailableProviders()).toHaveLength(2);
    expect(quoter.getAvailableProviders()).not.toContain('zerox');
  });

  it('should apply custom config', () => {
    const customQuoter = new SwapQuoter(executors, {
      quoteTimeoutMs: 2000,
      defaultSlippageBps: 100,
      enablePriceImpactCheck: false,
      minOutputThreshold: 500_000n,
    });
    const config = (customQuoter as any).config;
    expect(config.quoteTimeoutMs).toBe(2000);
    expect(config.defaultSlippageBps).toBe(100);
    expect(config.enablePriceImpactCheck).toBe(false);
    expect(config.minOutputThreshold).toBe(500_000n);
  });

  it('should use default config when not provided', () => {
    const config = (quoter as any).config;
    expect(config.quoteTimeoutMs).toBe(5000);
    expect(config.defaultSlippageBps).toBe(50);
    expect(config.enablePriceImpactCheck).toBe(true);
    expect(config.minOutputThreshold).toBe(0n);
  });

  it('should enrich quotes with minimumReceived', async () => {
    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const best = await quoter.getBestQuote(params);
    // minimumReceived should be toAmount * (10000 - 50) / 10000 = toAmount * 0.995
    const expectedMin = (best.quote.toAmount * (10_000n - 50n)) / 10_000n;
    expect(best.quote.minimumReceived).toBe(expectedMin);
  });

  it('should tie-break by lower gas when output amounts are equal', async () => {
    const tieExecutors = [
      createMockExecutor('uniswap', 1_000_000n, 0.5, 200_000n),
      createMockExecutor('oneinch', 1_000_000n, 0.5, 150_000n),
    ];
    quoter = new SwapQuoter(tieExecutors);

    const params: SwapQuoteParams = {
      fromToken: '0xUSDC',
      toToken: '0xWETH',
      fromAmount: 1_000n * 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    };

    const best = await quoter.getBestQuote(params);
    // oneinch should win due to lower gas
    expect(best.quote.provider).toBe('oneinch');
    expect(best.quote.gasEstimate).toBe(150_000n);
  });
});
