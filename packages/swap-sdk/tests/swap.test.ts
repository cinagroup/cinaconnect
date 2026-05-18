/**
 * swap-sdk/tests/swap.test.ts
 *
 * Tests for swap route calculation, token pairs, and quoter/router integration.
 */

import type { SwapQuote, SwapQuoteParams, SwapRoute, SwapTransaction, TokenInfo } from '../src/types.js';
import { SwapQuoter } from '../src/quoter.js';
import { SwapRouter, type SwapExecutor } from '../src/router.js';
import { calculateMinimumReceived, calculatePriceImpact, classifyPriceImpact, getExchangeRate, percentDiff, isPriceImpactAcceptable } from '../src/slippage.js';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ---------------------------------------------------------------------------
// Slippage utilities
// ---------------------------------------------------------------------------

function testCalculateMinimumReceived() {
  // 1000 output, 50 bps (0.5%) slippage → 1000 * (1 - 0.005) = 995
  const min = calculateMinimumReceived(1000n, 50);
  assert(min === 995n, `min received should be 995, got ${min}`);

  // 1000 output, 100 bps (1%) slippage → 990
  const min2 = calculateMinimumReceived(1000n, 100);
  assert(min2 === 990n, `min received should be 990, got ${min2}`);

  // 0 slippage → full amount
  const min3 = calculateMinimumReceived(500n, 0);
  assert(min3 === 500n, `0 slippage should return full amount, got ${min3}`);

  console.log('✓ calculateMinimumReceived');
}

function testCalculatePriceImpact() {
  // mid price = 2.0 (2 tokens per 1)
  // execution price = 100 tokens for 55 → 100/55 ≈ 1.818
  // impact ≈ (2.0 - 1.818) / 2.0 * 100 ≈ 9.09%
  const impact = calculatePriceImpact(55n, 100n, 2.0);
  assert(impact.percentage > 0, 'impact should be positive');
  assert(impact.percentage < 100, 'impact should be under 100%');
  console.log(`✓ calculatePriceImpact (${impact.percentage.toFixed(2)}%)`);
}

function testClassifyPriceImpact() {
  assert(classifyPriceImpact(0.5) === 'low', '0.5% → low');
  assert(classifyPriceImpact(1.5) === 'medium', '1.5% → medium');
  assert(classifyPriceImpact(4) === 'high', '4% → high');
  assert(classifyPriceImpact(10) === 'critical', '10% → critical');
  console.log('✓ classifyPriceImpact');
}

function testIsPriceImpactAcceptable() {
  const makeQuote = (impact: number): SwapQuote => ({
    id: 'test', fromToken: '0x1', toToken: '0x2',
    fromAmount: 1000n, toAmount: 900n, priceImpact: impact,
    route: [], gasEstimate: 200000n, minimumReceived: 0n,
    provider: 'test', expiresAt: Date.now() + 60000,
  });
  assert(isPriceImpactAcceptable(makeQuote(0.5), 100) === true, '0.5% < 1% max → acceptable');
  assert(isPriceImpactAcceptable(makeQuote(2), 100) === false, '2% > 1% max → not acceptable');
  console.log('✓ isPriceImpactAcceptable');
}

function testExchangeRate() {
  const rate = getExchangeRate(1n * 10n ** 6n, 1n * 10n ** 18n);
  assert(rate === 1e12, 'rate should be 1e12 (10^18 / 10^6)');
  assert(getExchangeRate(0n, 100n) === 0, '0 input → 0 rate');
  console.log('✓ getExchangeRate');
}

function testPercentDiff() {
  // percentDiff uses ((a - b) / b) * 100
  // (120 - 100) / 100 * 100 = 20
  const diff = percentDiff(120n, 100n);
  assert(diff === 20, 'percent diff between 120 and 100 should be 20');
  console.log('✓ percentDiff');
}

// ---------------------------------------------------------------------------
// SwapQuoter with mock executors
// ---------------------------------------------------------------------------

function makeMockExecutor(name: string, toAmount: bigint, gasEstimate: bigint = 200000n): SwapExecutor {
  return {
    name,
    async isAvailable() { return true; },
    async getQuote(params: SwapQuoteParams): Promise<SwapQuote> {
      return {
        id: `${name}-${Date.now()}`,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount,
        priceImpact: 0.5,
        route: [{
          protocol: name,
          fromToken: params.fromToken,
          toToken: params.toToken,
          fromAmount: params.fromAmount,
          toAmount,
          gasEstimate,
        }],
        gasEstimate,
        minimumReceived: 0n,
        provider: name,
        expiresAt: Date.now() + 300_000,
      };
    },
    async getTransaction(quote: SwapQuote): Promise<SwapTransaction> {
      return {
        to: '0x0000000000000000000000000000000000000001' as `0x${string}`,
        value: 0n,
        data: '0x',
        gasLimit: quote.gasEstimate,
      };
    },
    async getSupportedTokens(_chainId: number): Promise<TokenInfo[]> {
      return [];
    },
  };
}

async function testQuoterBestQuote() {
  const executors = [
    makeMockExecutor('Uniswap', 980000n, 180000n),
    makeMockExecutor('1inch', 995000n, 210000n),
    makeMockExecutor('0x', 970000n, 150000n),
  ];

  const quoter = new SwapQuoter(executors);
  const params: SwapQuoteParams = {
    fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    fromAmount: 1_000_000n,
    chainId: 1,
    slippageBps: 50,
  };

  const best = await quoter.getBestQuote(params);
  assert(best.quote.provider === '1inch', `Best quote should be from 1inch, got ${best.quote.provider}`);
  assert(best.quote.toAmount === 995000n, '1inch should have highest output');
  assert(best.allQuotes.length === 3, 'Should return 3 quotes');
  console.log('✓ quoter best quote');
}

async function testQuoterNoValidQuotes() {
  const badExecutor: SwapExecutor = {
    name: 'BadProvider',
    async isAvailable() { return false; },
    async getQuote() { throw new Error('Service unavailable'); },
    async getTransaction() { throw new Error('N/A'); },
    async getSupportedTokens() { return []; },
  };

  const quoter = new SwapQuoter([badExecutor]);
  try {
    await quoter.getBestQuote({
      fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      fromAmount: 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    });
    assert(false, 'Should throw when no valid quotes');
  } catch (e: any) {
    assert(e.message.includes('No valid swap quotes'), `Expected error, got: ${e.message}`);
  }
  console.log('✓ quoter no valid quotes');
}

async function testQuoterAddRemoveExecutor() {
  const executors = [makeMockExecutor('Uniswap', 900n)];
  const quoter = new SwapQuoter(executors);

  assert(quoter.getAvailableProviders().length === 1, '1 provider initially');

  quoter.addExecutor(makeMockExecutor('1inch', 950n));
  assert(quoter.getAvailableProviders().length === 2, '2 providers after add');
  assert(quoter.getAvailableProviders().includes('1inch'), '1inch should be in list');

  quoter.removeExecutor('Uniswap');
  assert(quoter.getAvailableProviders().length === 1, '1 provider after remove');
  assert(!quoter.getAvailableProviders().includes('Uniswap'), 'Uniswap should be removed');
  console.log('✓ quoter add/remove executor');
}

async function testQuoterUnknownProvider() {
  const quoter = new SwapQuoter([makeMockExecutor('Uniswap', 900n)]);
  try {
    await quoter.getQuoteFrom('UnknownProvider', {} as SwapQuoteParams);
    assert(false, 'Should throw for unknown provider');
  } catch (e: any) {
    assert(e.message.includes('Unknown provider'), `Expected error, got: ${e.message}`);
  }
  console.log('✓ quoter unknown provider');
}

// ---------------------------------------------------------------------------
// SwapRouter
// ---------------------------------------------------------------------------

async function testRouterCompareQuotes() {
  const quoter = new SwapQuoter([
    makeMockExecutor('Uniswap', 980n),
    makeMockExecutor('1inch', 995n),
  ]);
  const router = new SwapRouter(quoter);

  const quotes = await router.compareQuotes({
    fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    fromAmount: 1_000n,
    chainId: 1,
    slippageBps: 50,
  });
  assert(quotes.length === 2, 'Should get 2 quotes');
  console.log('✓ router compare quotes');
}

async function testRouterExecutionDisabled() {
  const quoter = new SwapQuoter([makeMockExecutor('Uniswap', 900n)]);
  const router = new SwapRouter(quoter);

  try {
    await router.executeSwap({
      fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      fromAmount: 1_000n,
      chainId: 1,
      slippageBps: 50,
    });
    assert(false, 'Should throw when execution disabled');
  } catch (e: any) {
    assert(e.message.includes('disabled'), `Expected disabled error, got: ${e.message}`);
  }
  console.log('✓ router execution disabled');
}

async function testRouterExecutionEnabled() {
  const quoter = new SwapQuoter([makeMockExecutor('Uniswap', 900n)]);
  const router = new SwapRouter(quoter);
  router.setExecutionEnabled(true);

  const receipt = await router.executeSwap({
    fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    fromAmount: 1_000n,
    chainId: 1,
    slippageBps: 50,
  });
  assert(receipt.success === true, 'Receipt should show success');
  assert(receipt.fromAmount === 1_000n, 'Receipt should have correct fromAmount');
  console.log('✓ router execution enabled');
}

async function testRouteHopValidation() {
  const route: SwapRoute = {
    protocol: 'Uniswap',
    fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    fromAmount: 1_000_000n,
    toAmount: 980_000n,
    gasEstimate: 180000n,
  };
  assert(route.protocol === 'Uniswap', 'route protocol');
  assert(route.toAmount > 0n, 'toAmount should be positive');
  assert(route.fromAmount > route.toAmount, 'fromAmount > toAmount for this swap');
  console.log('✓ route hop validation');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  const tests = [
    testCalculateMinimumReceived,
    testCalculatePriceImpact,
    testClassifyPriceImpact,
    testIsPriceImpactAcceptable,
    testExchangeRate,
    testPercentDiff,
    testQuoterBestQuote,
    testQuoterNoValidQuotes,
    testQuoterAddRemoveExecutor,
    testQuoterUnknownProvider,
    testRouterCompareQuotes,
    testRouterExecutionDisabled,
    testRouterExecutionEnabled,
    testRouteHopValidation,
  ];

  let passed = 0;
  let failed = 0;

  for (const fn of tests) {
    try {
      await fn();
      passed++;
    } catch (e: any) {
      console.error(`✗ ${fn.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed (${tests.length} total)`);
  if (failed > 0) process.exit(1);
}

run();
