/**
 * SwapWidgetCore Tests — 12 tests covering all core functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SwapWidgetCore } from "../src/SwapWidgetCore.js.js";
import type { TokenInfo, SwapQuote, SwapReceipt } from "@cinacoin/swap-sdk";

// ── Test Fixtures ──────────────────────────────────────────

const USDC: TokenInfo = {
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
};

const WETH: TokenInfo = {
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  symbol: "WETH",
  name: "Wrapped Ether",
  decimals: 18,
};

const makeQuote = (overrides: Partial<SwapQuote> = {}): SwapQuote => ({
  id: "quote-1",
  fromToken: USDC.address,
  toToken: WETH.address,
  fromAmount: 1000n * 10n ** 6n, // 1000 USDC
  toAmount: 500000000000000000n, // 0.5 ETH
  priceImpact: 0.1,
  route: [{
    protocol: "Uniswap V3",
    fromToken: USDC.address,
    toToken: WETH.address,
    fromAmount: 1000n * 10n ** 6n,
    toAmount: 500000000000000000n,
    gasEstimate: 150000n,
  }],
  gasEstimate: 150000n,
  minimumReceived: 497500000000000000n,
  provider: "Uniswap V3",
  expiresAt: Date.now() + 60000,
  tx: {
    to: "0x1234567890abcdef1234567890abcdef12345678",
    value: 0n,
    data: "0xabcdef",
    gasLimit: 150000n,
  },
  ...overrides,
});

const makeReceipt = (overrides: Partial<SwapReceipt> = {}): SwapReceipt => ({
  txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  quoteId: "quote-1",
  fromAmount: 1000n * 10n ** 6n,
  toAmount: 500000000000000000n,
  gasUsed: 145000n,
  gasPrice: 30000000000n,
  blockNumber: 19000000n,
  success: true,
  ...overrides,
});

function makeCore(
  fetchQuote: ReturnType<typeof vi.fn> = vi.fn(),
  executeTransaction: ReturnType<typeof vi.fn> = vi.fn()
): SwapWidgetCore {
  return new SwapWidgetCore({
    chainId: 1,
    walletAddress: "0xUser123",
    fetchQuote,
    executeTransaction,
  });
}

// ── Tests ──────────────────────────────────────────────────

describe("SwapWidgetCore", () => {
  let fetchQuote: ReturnType<typeof vi.fn>;
  let executeTransaction: ReturnType<typeof vi.fn>;
  let core: SwapWidgetCore;

  beforeEach(() => {
    fetchQuote = vi.fn();
    executeTransaction = vi.fn();
    core = makeCore(fetchQuote, executeTransaction);
  });

  // Test 1: Initial state
  it("initializes with idle state", () => {
    const state = core.state;
    expect(state.state).toBe("idle");
    expect(state.fromToken).toBeNull();
    expect(state.toToken).toBeNull();
    expect(state.inputAmount).toBe("");
    expect(state.quotes).toEqual([]);
    expect(state.selectedQuote).toBeNull();
    expect(state.error).toBeNull();
    expect(state.lastReceipt).toBeNull();
  });

  // Test 2: Set from token
  it("sets the from token and clears existing quotes", () => {
    core.setFromToken(USDC);
    expect(core.state.fromToken).toEqual(USDC);
    expect(core.state.quotes).toEqual([]);
    expect(core.state.selectedQuote).toBeNull();
  });

  // Test 3: Set to token
  it("sets the to token", () => {
    core.setToToken(WETH);
    expect(core.state.toToken).toEqual(WETH);
  });

  // Test 4: Swap tokens
  it("swaps from and to tokens", () => {
    core.setFromToken(USDC);
    core.setToToken(WETH);
    core.swapTokens();
    expect(core.state.fromToken).toEqual(WETH);
    expect(core.state.toToken).toEqual(USDC);
  });

  // Test 5: Input amount validation
  it("accepts valid numeric input and rejects invalid", () => {
    core.setInputAmount("100.50");
    expect(core.state.inputAmount).toBe("100.50");

    core.setInputAmount("abc");
    expect(core.state.inputAmount).toBe("100.50"); // unchanged

    core.setInputAmount("");
    expect(core.state.inputAmount).toBe("");
  });

  // Test 6: Cannot fetch quote without tokens
  it("errors when fetching quote without tokens selected", async () => {
    core.setInputAmount("100");
    await core.fetchQuote();
    expect(core.state.error).toBe("Please select tokens and enter an amount.");
  });

  // Test 7: Cannot fetch quote with same tokens
  it("errors when source and destination tokens are the same", async () => {
    core.setFromToken(USDC);
    core.setToToken(USDC);
    core.setInputAmount("100");
    await core.fetchQuote();
    expect(core.state.error).toBe("Source and destination tokens must differ.");
  });

  // Test 8: Successful quote fetch
  it("fetches quotes and selects the best one", async () => {
    const quote = makeQuote();
    fetchQuote.mockResolvedValue([quote]);

    core.setFromToken(USDC);
    core.setToToken(WETH);
    core.setInputAmount("1000");
    await core.fetchQuote();

    expect(core.state.state).toBe("quote-ready");
    expect(core.state.quotes).toHaveLength(1);
    expect(core.state.selectedQuote).toBeTruthy();
    expect(core.state.error).toBeNull();
    expect(fetchQuote).toHaveBeenCalled();
  });

  // Test 9: Quote fetch failure
  it("handles quote fetch errors gracefully", async () => {
    fetchQuote.mockRejectedValue(new Error("Network error"));

    core.setFromToken(USDC);
    core.setToToken(WETH);
    core.setInputAmount("1000");
    await core.fetchQuote();

    expect(core.state.state).toBe("error");
    expect(core.state.error).toBe("Network error");
  });

  // Test 10: Build transaction
  it("builds a transaction from the selected quote", async () => {
    const quote = makeQuote();
    fetchQuote.mockResolvedValue([quote]);

    core.setFromToken(USDC);
    core.setToToken(WETH);
    core.setInputAmount("1000");
    await core.fetchQuote();

    const tx = core.buildTransaction();
    expect(tx.to).toBe(quote.tx!.to);
    expect(tx.data).toBe(quote.tx!.data);
    expect(tx.gasLimit).toBe(quote.tx!.gasLimit);
  });

  // Test 11: Execute swap successfully
  it("executes a swap and returns a receipt", async () => {
    const quote = makeQuote();
    const receipt = makeReceipt();
    fetchQuote.mockResolvedValue([quote]);
    executeTransaction.mockResolvedValue(receipt);

    core.setFromToken(USDC);
    core.setToToken(WETH);
    core.setInputAmount("1000");
    await core.fetchQuote();

    const result = await core.executeSwap();
    expect(result).toEqual(receipt);
    expect(core.state.state).toBe("success");
    expect(core.state.lastReceipt).toEqual(receipt);
  });

  // Test 12: Reset clears everything
  it("resets to initial idle state", async () => {
    const quote = makeQuote();
    fetchQuote.mockResolvedValue([quote]);

    core.setFromToken(USDC);
    core.setToToken(WETH);
    core.setInputAmount("1000");
    await core.fetchQuote();

    expect(core.state.state).toBe("quote-ready");

    core.reset();
    expect(core.state.state).toBe("idle");
    expect(core.state.inputAmount).toBe("");
    expect(core.state.quotes).toEqual([]);
    expect(core.state.selectedQuote).toBeNull();
    expect(core.state.lastReceipt).toBeNull();
  });
});
