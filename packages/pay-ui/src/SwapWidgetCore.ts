/**
 * SwapWidgetCore — Framework-agnostic swap widget controller.
 *
 * Manages quote fetching, slippage calculation, and transaction building
 * for the SwapWidget UI.
 */

import type {
  SwapQuote,
  SwapQuoteParams,
  SwapTransaction,
  SwapReceipt,
  TokenInfo,
} from "@cinacoin/swap-sdk";
import {
  calculateMinimumReceived,
  calculatePriceImpact,
} from "@cinacoin/swap-sdk";
import type {
  SwapWidgetCoreConfig,
  SwapWidgetCoreState,
  SwapWidgetState,
  SlippageConfig,
} from "./types.js";

const DEFAULT_SLIPPAGE_BPS = 50;
const DEFAULT_SLIPPAGE_PRESETS = [10, 25, 50, 100, 200]; // 0.1% – 2%

const defaultSlippage: SlippageConfig = {
  slippageBps: DEFAULT_SLIPPAGE_BPS,
  autoSlippage: true,
  presets: DEFAULT_SLIPPAGE_PRESETS,
};

/**
 * Core swap widget controller (framework-agnostic).
 *
 * Usage:
 * ```ts
 * const core = new SwapWidgetCore({
 *   chainId: 1,
 *   fetchQuote: async (params) => {...},
 *   executeTransaction: async (tx) => {...},
 * });
 *
 * core.setFromToken(tokenA);
 * core.setToToken(tokenB);
 * core.setInputAmount("100");
 * await core.fetchQuote();
 * await core.executeSwap();
 * ```
 */
export class SwapWidgetCore {
  private config: SwapWidgetCoreConfig;
  private _state: SwapWidgetCoreState;
  private _listeners: Set<() => void> = new Set();

  constructor(config: SwapWidgetCoreConfig) {
    this.config = config;
    this._state = {
      state: "idle",
      fromToken: null,
      toToken: null,
      inputAmount: "",
      quotes: [],
      selectedQuote: null,
      error: null,
      slippage: { ...defaultSlippage },
      lastReceipt: null,
    };
  }

  // ── Getters ──────────────────────────────────────────────

  get state(): Readonly<SwapWidgetCoreState> {
    return this._state;
  }

  get isReady(): boolean {
    return this._state.state === "quote-ready";
  }

  get canSwap(): boolean {
    return (
      this._state.fromToken !== null &&
      this._state.toToken !== null &&
      this._state.inputAmount !== "" &&
      this._state.selectedQuote !== null
    );
  }

  // ── Token Selection ──────────────────────────────────────

  setFromToken(token: TokenInfo | null): void {
    this._patch({ fromToken: token });
    this._clearQuote();
  }

  setToToken(token: TokenInfo | null): void {
    this._patch({ toToken: token });
    this._clearQuote();
  }

  swapTokens(): void {
    const { fromToken, toToken } = this._state;
    this._patch({ fromToken: toToken, toToken: fromToken });
    this._clearQuote();
  }

  // ── Amount Input ─────────────────────────────────────────

  setInputAmount(amount: string): void {
    // Allow only valid numeric input
    if (amount !== "" && !/^\d*\.?\d*$/.test(amount)) return;
    this._patch({ inputAmount: amount });
    this._clearQuote();
  }

  // ── Slippage ─────────────────────────────────────────────

  setSlippage(config: Partial<SlippageConfig>): void {
    this._patch({
      slippage: { ...this._state.slippage, ...config },
    });
  }

  getSlippagePercent(): string {
    return (this._state.slippage.slippageBps / 100).toFixed(2);
  }

  getMinimumReceived(fromAmountWei: bigint, outputAmountWei: bigint): bigint {
    return calculateMinimumReceived(
      outputAmountWei,
      this._state.slippage.slippageBps
    );
  }

  // ── Quote Fetching ───────────────────────────────────────

  async fetchQuote(): Promise<void> {
    const { fromToken, toToken, inputAmount, chainId, walletAddress } =
      this._state;

    if (!fromToken || !toToken || inputAmount === "") {
      this._patch({ error: "Please select tokens and enter an amount." });
      return;
    }

    if (fromToken.address === toToken.address) {
      this._patch({ error: "Source and destination tokens must differ." });
      return;
    }

    this._patch({ state: "fetching-quote", error: null });

    try {
      const fromAmount = this._parseAmount(inputAmount, fromToken.decimals);

      const params: SwapQuoteParams = {
        fromToken: fromToken.address as `0x${string}`,
        toToken: toToken.address as `0x${string}`,
        fromAmount,
        chainId,
        slippageBps: this._state.slippage.slippageBps,
        recipient: walletAddress,
      };

      const quotes = await this.config.fetchQuote(params);

      // Annotate quotes with minimum received
      const annotated = quotes.map((q) => ({
        ...q,
        minimumReceived: calculateMinimumReceived(
          q.toAmount,
          this._state.slippage.slippageBps
        ),
      }));

      this._patch({
        state: "quote-ready",
        quotes: annotated,
        selectedQuote: annotated[0] ?? null,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch quote";
      this._patch({ state: "error", error: message, quotes: [] });
    }
  }

  selectQuote(quote: SwapQuote): void {
    this._patch({ selectedQuote: quote });
  }

  // ── Swap Execution ───────────────────────────────────────

  async executeSwap(): Promise<SwapReceipt | null> {
    if (!this._state.selectedQuote) {
      this._patch({ error: "No quote selected" });
      return null;
    }

    this._patch({ state: "executing", error: null });

    try {
      const tx = this.buildTransaction();
      const receipt = await this.config.executeTransaction(tx);
      this._patch({
        state: "success",
        lastReceipt: receipt,
        error: null,
      });
      return receipt;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Transaction failed";
      this._patch({ state: "error", error: message });
      return null;
    }
  }

  buildTransaction(): SwapTransaction {
    const quote = this._state.selectedQuote;
    if (!quote?.tx) {
      throw new Error("No transaction data available");
    }
    return {
      ...quote.tx,
      to: quote.tx.to,
    };
  }

  // ── Reset ────────────────────────────────────────────────

  reset(): void {
    this._patch({
      state: "idle",
      inputAmount: "",
      quotes: [],
      selectedQuote: null,
      error: null,
      lastReceipt: null,
    });
  }

  // ── Change Notifications ─────────────────────────────────

  onChange(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // ── Private Helpers ──────────────────────────────────────

  private _patch(partial: Partial<SwapWidgetCoreState>): void {
    this._state = { ...this._state, ...partial };
    this._notify();
  }

  private _clearQuote(): void {
    this._patch({
      state: this._state.state === "success" ? "success" : "idle",
      quotes: [],
      selectedQuote: null,
      error: null,
    });
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // swallow
      }
    }
  }

  private _parseAmount(input: string, decimals: number): bigint {
    const parts = input.split(".");
    const whole = parts[0] || "0";
    let fractional = parts[1] || "";

    // Pad or truncate fractional to decimals
    if (fractional.length > decimals) {
      fractional = fractional.slice(0, decimals);
    } else {
      fractional = fractional.padEnd(decimals, "0");
    }

    return BigInt(whole + fractional);
  }
}
