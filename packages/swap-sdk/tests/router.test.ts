/**
 * Tests for SwapRouter — smart routing algorithm.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SwapRouter } from '../src/router';
import { SwapQuoter } from '../src/quoter';
import type { SwapQuote, SwapQuoteParams, SwapTransaction, TokenInfo } from '../src/types';
import type { SwapExecutor } from '../src/router';

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

describe('SwapRouter', () => {
  let router: SwapRouter;
  let quoter: SwapQuoter;

  const params: SwapQuoteParams = {
    fromToken: '0xUSDC',
    toToken: '0xWETH',
    fromAmount: 1_000n * 1_000_000n,
    chainId: 1,
    slippageBps: 50,
  };

  beforeEach(() => {
    const executors = [
      createMockExecutor('uniswap', 1_000_000n),
      createMockExecutor('oneinch', 1_020_000n),
    ];
    quoter = new SwapQuoter(executors);
    router = new SwapRouter(quoter);
  });

  it('should get best quote via router', async () => {
    const best = await router.getBestQuote(params);
    expect(best.quote.provider).toBe('oneinch');
  });

  it('should compare all quotes', async () => {
    const quotes = await router.compareQuotes(params);
    expect(quotes).toHaveLength(2);
  });

  it('should be disabled for execution by default', async () => {
    await expect(router.executeSwap(params)).rejects.toThrow(
      'Swap execution is disabled'
    );
  });

  it('should enable execution', () => {
    router.setExecutionEnabled(true);
    // No error thrown
  });

  it('should execute swap when enabled', async () => {
    router.setExecutionEnabled(true);
    const receipt = await router.executeSwap(params);
    expect(receipt.success).toBe(true);
    expect(receipt.fromAmount).toBe(1_000n * 1_000_000n);
    expect(receipt.toAmount).toBe(1_020_000n);
    expect(receipt.quoteId).toBeDefined();
    expect(receipt.txHash).toMatch(/^0x/);
  });

  it('should reject expired quotes', async () => {
    router.setExecutionEnabled(true);

    // Create a quoter with an executor that returns expired quotes
    const expiredExecutor: SwapExecutor = {
      name: 'expired',
      isAvailable: async () => true,
      getQuote: async (p: SwapQuoteParams): Promise<SwapQuote> => ({
        id: 'expired-quote',
        fromToken: p.fromToken,
        toToken: p.toToken,
        fromAmount: p.fromAmount,
        toAmount: 1_000_000n,
        priceImpact: 0.5,
        route: [],
        gasEstimate: 150_000n,
        minimumReceived: 0n,
        provider: 'expired',
        expiresAt: Date.now() - 1000, // Expired
        tx: undefined,
      }),
      getTransaction: async () => ({
        to: '0x' as `0x${string}`,
        value: 0n,
        data: '0x' as `0x${string}`,
        gasLimit: 0n,
      }),
      getSupportedTokens: async (): Promise<TokenInfo[]> => [],
    };

    const expiredQuoter = new SwapQuoter([expiredExecutor]);
    const expiredRouter = new SwapRouter(expiredQuoter);
    expiredRouter.setExecutionEnabled(true);

    await expect(expiredRouter.executeSwap(params)).rejects.toThrow(
      'Quote has expired'
    );
  });

  it('should disable execution after enabling', async () => {
    router.setExecutionEnabled(true);
    router.setExecutionEnabled(false);
    await expect(router.executeSwap(params)).rejects.toThrow(
      'Swap execution is disabled'
    );
  });

  it('should return supported tokens (deduplicated)', async () => {
    // With the mock executors that return empty token lists
    const tokens = await router.getSupportedTokens(1);
    expect(tokens).toEqual([]);
  });

  it('should get price impact from best quote', async () => {
    const impact = await router.getPriceImpact(params);
    expect(typeof impact).toBe('number');
  });

  it('should accept partial execute params', async () => {
    router.setExecutionEnabled(true);
    const receipt = await router.executeSwap(params, {
      slippageBps: 100,
      maxGasPrice: 100_000_000_000n,
    });
    expect(receipt.success).toBe(true);
  });
});
