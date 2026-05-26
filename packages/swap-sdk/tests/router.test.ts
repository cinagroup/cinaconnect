/**
 * Tests for SwapRouter — smart routing algorithm.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SwapRouter } from '../src/router.js';
import { SwapQuoter } from '../src/quoter.js';
import type { SwapQuote, SwapQuoteParams, SwapTransaction, TokenInfo } from '../src/types.js';
import type { SwapExecutor } from '../src/router.js';
import type { WalletClient, PublicClient, Transport, Chain, Account } from 'viem';

function createMockWalletClient(): WalletClient<Transport, Chain, Account> {
  return {
    account: {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      type: 'json-rpc',
    } as Account,
    chain: { id: 1, name: 'Ethereum' } as Chain,
    transport: { type: 'http' } as Transport,
    sendTransaction: vi.fn().mockResolvedValue('0xmock_tx_hash_abc123'),
    getGasPrice: vi.fn().mockResolvedValue(20_000_000_000n),
  } as unknown as WalletClient<Transport, Chain, Account>;
}

function createMockPublicClient(): PublicClient<Transport, Chain> {
  return {
    getGasPrice: vi.fn().mockResolvedValue(20_000_000_000n),
    getTransactionCount: vi.fn().mockResolvedValue(42),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: 'success',
      gasUsed: 150_000n,
      effectiveGasPrice: 20_000_000_000n,
      blockNumber: 19_000_000n,
    }),
  } as unknown as PublicClient<Transport, Chain>;
}

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
      chainId: params.chainId,
    }),
    getTransaction: async (quote: SwapQuote, slippageBps: number): Promise<SwapTransaction> => ({
      to: quote.toToken as `0x${string}`,
      value: 0n,
      data: '0xmock' as `0x${string}`,
      gasLimit: quote.gasEstimate,
    }),
    executeTransaction: async (_tx: SwapTransaction, _walletClient: WalletClient<Transport, Chain, Account>): Promise<`0x${string}`> => '0xexecutor_tx_hash',
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
    router = new SwapRouter(quoter, executors);
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
    const walletClient = createMockWalletClient();
    const publicClient = createMockPublicClient();
    await expect(router.executeSwap(params, {
      quote: {} as SwapQuote,
      walletClient,
      publicClient,
    })).rejects.toThrow(
      'Swap execution is disabled'
    );
  });

  it('should enable execution', () => {
    router.setExecutionEnabled(true);
    // No error thrown
  });

  it('should execute swap when enabled', async () => {
    router.setExecutionEnabled(true);
    const walletClient = createMockWalletClient();
    const publicClient = createMockPublicClient();
    const receipt = await router.executeSwap(params, {
      quote: {} as SwapQuote,
      walletClient,
      publicClient,
    });
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
        chainId: p.chainId,
        tx: undefined,
      }),
      getTransaction: async () => ({
        to: '0x' as `0x${string}`,
        value: 0n,
        data: '0x' as `0x${string}`,
        gasLimit: 0n,
      }),
      executeTransaction: async () => '0x' as `0x${string}`,
      getSupportedTokens: async (): Promise<TokenInfo[]> => [],
    };

    const expiredQuoter = new SwapQuoter([expiredExecutor]);
    const expiredRouter = new SwapRouter(expiredQuoter);
    expiredRouter.setExecutionEnabled(true);

    const walletClient = createMockWalletClient();
    const publicClient = createMockPublicClient();

    await expect(expiredRouter.executeSwap(params, {
      quote: {} as SwapQuote,
      walletClient,
      publicClient,
    })).rejects.toThrow(
      'Quote has expired'
    );
  });

  it('should disable execution after enabling', async () => {
    const walletClient = createMockWalletClient();
    const publicClient = createMockPublicClient();
    router.setExecutionEnabled(true);
    router.setExecutionEnabled(false);
    await expect(router.executeSwap(params, {
      quote: {} as SwapQuote,
      walletClient,
      publicClient,
    })).rejects.toThrow(
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
    const walletClient = createMockWalletClient();
    const publicClient = createMockPublicClient();
    const receipt = await router.executeSwap(params, {
      quote: {} as SwapQuote,
      walletClient,
      publicClient,
      slippageBps: 100,
      maxGasPrice: 100_000_000_000n,
    });
    expect(receipt.success).toBe(true);
  });
});
