/**
 * OnRampWidgetCore Tests — 10 tests covering all core functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnRampWidgetCore } from "../src/OnRampWidgetCore.js";
import type { OnRampQuote, OnRampResult } from "@cinacoin/onramp-sdk";

// ── Test Fixtures ──────────────────────────────────────────

const makeQuote = (overrides: Partial<OnRampQuote> = {}): OnRampQuote => ({
  provider: "moonpay",
  providerName: "MoonPay",
  fiatAmount: 100,
  fiatCurrency: "USD",
  cryptoAmount: 0.035,
  cryptoToken: "ETH",
  exchangeRate: 0.00035,
  totalCost: 103.5,
  fees: {
    networkFeeBps: 50,
    providerFeeBps: 200,
    fixedFee: 0.5,
    totalFeePercent: 3.0,
  },
  estimatedTime: 10,
  requiresKyc: true,
  paymentMethods: ["credit_card", "debit_card"],
  regions: ["US", "EU", "UK"],
  expiresAt: Date.now() + 300000,
  ...overrides,
});

const makeResult = (overrides: Partial<OnRampResult> = {}): OnRampResult => ({
  completed: true,
  orderId: "order-123",
  cryptoAmount: 0.035,
  fiatAmount: 100,
  provider: "moonpay",
  ...overrides,
});

function makeCore(
  fetchQuotes: ReturnType<typeof vi.fn> = vi.fn(),
  redirectToProvider: ReturnType<typeof vi.fn> = vi.fn()
): OnRampWidgetCore {
  return new OnRampWidgetCore({
    params: {
      destinationAddress: "0xUser123",
      defaultFiatAmount: 100,
      defaultFiatCurrency: "USD",
      defaultCryptoToken: "ETH",
      userRegion: "US",
    },
    fetchQuotes,
    redirectToProvider,
  });
}

// ── Tests ──────────────────────────────────────────────────

describe("OnRampWidgetCore", () => {
  let fetchQuotes: ReturnType<typeof vi.fn>;
  let redirectToProvider: ReturnType<typeof vi.fn>;
  let core: OnRampWidgetCore;

  beforeEach(() => {
    fetchQuotes = vi.fn();
    redirectToProvider = vi.fn();
    core = makeCore(fetchQuotes, redirectToProvider);
  });

  // Test 1: Initial state
  it("initializes with idle state and defaults", () => {
    const state = core.state;
    expect(state.state).toBe("idle");
    expect(state.fiatAmount).toBe(100);
    expect(state.fiatCurrency).toBe("USD");
    expect(state.cryptoToken).toBe("ETH");
    expect(state.quotes).toEqual([]);
    expect(state.selectedProvider).toBeNull();
    expect(state.error).toBeNull();
    expect(state.lastResult).toBeNull();
  });

  // Test 2: Set fiat amount
  it("sets the fiat amount and clears existing quotes", () => {
    core.setFiatAmount(250);
    expect(core.state.fiatAmount).toBe(250);
    expect(core.state.quotes).toEqual([]);
  });

  // Test 3: Reject negative amounts
  it("rejects negative fiat amounts", () => {
    core.setFiatAmount(-50);
    expect(core.state.fiatAmount).toBe(100); // unchanged
  });

  // Test 4: Set fiat currency
  it("sets the fiat currency", () => {
    core.setFiatCurrency("EUR");
    expect(core.state.fiatCurrency).toBe("EUR");
  });

  // Test 5: Set crypto token
  it("sets the crypto token", () => {
    core.setCryptoToken("USDC");
    expect(core.state.cryptoToken).toBe("USDC");
  });

  // Test 6: Fetch quotes successfully
  it("fetches quotes from the aggregator", async () => {
    const quotes = [
      makeQuote({ provider: "moonpay", providerName: "MoonPay", cryptoAmount: 0.035 }),
      makeQuote({ provider: "ramp", providerName: "Ramp", cryptoAmount: 0.036 }),
    ];
    fetchQuotes.mockResolvedValue(quotes);

    await core.fetchQuotes();

    expect(core.state.state).toBe("quotes-ready");
    expect(core.state.quotes).toHaveLength(2);
    // Sorted by best rate (most crypto)
    expect(core.state.quotes[0].cryptoAmount).toBe(0.036);
    expect(core.state.quotes[1].cryptoAmount).toBe(0.035);
    expect(core.state.error).toBeNull();
  });

  // Test 7: Fetch quotes error handling
  it("handles fetch errors gracefully", async () => {
    fetchQuotes.mockRejectedValue(new Error("API unavailable"));

    await core.fetchQuotes();

    expect(core.state.state).toBe("error");
    expect(core.state.error).toBe("API unavailable");
    expect(core.state.quotes).toEqual([]);
  });

  // Test 8: Select provider
  it("selects a valid provider from available quotes", async () => {
    const quotes = [makeQuote({ provider: "moonpay" }), makeQuote({ provider: "ramp" })];
    fetchQuotes.mockResolvedValue(quotes);

    await core.fetchQuotes();
    core.selectProvider("ramp");

    expect(core.state.selectedProvider).toBe("ramp");
  });

  // Test 9: Redirect to provider
  it("redirects to the selected provider", async () => {
    const quote = makeQuote();
    const result = makeResult();
    fetchQuotes.mockResolvedValue([quote]);
    redirectToProvider.mockResolvedValue(result);

    await core.fetchQuotes();
    core.selectProvider("moonpay");

    const res = await core.redirectToProvider();

    expect(res).toEqual(result);
    expect(core.state.state).toBe("completed");
    expect(core.state.lastResult).toEqual(result);
  });

  // Test 10: Reset to initial state
  it("resets all state to defaults", async () => {
    const quote = makeQuote();
    const result = makeResult();
    fetchQuotes.mockResolvedValue([quote]);
    redirectToProvider.mockResolvedValue(result);

    await core.fetchQuotes();
    core.selectProvider("moonpay");
    await core.redirectToProvider();

    expect(core.state.state).toBe("completed");
    expect(core.state.quotes).toHaveLength(1);

    core.reset();

    expect(core.state.state).toBe("idle");
    expect(core.state.fiatAmount).toBe(100);
    expect(core.state.fiatCurrency).toBe("USD");
    expect(core.state.cryptoToken).toBe("ETH");
    expect(core.state.quotes).toEqual([]);
    expect(core.state.selectedProvider).toBeNull();
    expect(core.state.lastResult).toBeNull();
    expect(core.state.error).toBeNull();
  });
});
