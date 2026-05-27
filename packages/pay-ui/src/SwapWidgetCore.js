/**
 * SwapWidgetCore — Framework-agnostic swap widget controller.
 *
 * Manages quote fetching, slippage calculation, and transaction building
 * for the SwapWidget UI.
 */
import { calculateMinimumReceived, } from "@cinacoin/swap-sdk";
const DEFAULT_SLIPPAGE_BPS = 50;
const DEFAULT_SLIPPAGE_PRESETS = [10, 25, 50, 100, 200]; // 0.1% – 2%
const defaultSlippage = {
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
    constructor(config) {
        this._listeners = new Set();
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
    get state() {
        return this._state;
    }
    get isReady() {
        return this._state.state === "quote-ready";
    }
    get canSwap() {
        return (this._state.fromToken !== null &&
            this._state.toToken !== null &&
            this._state.inputAmount !== "" &&
            this._state.selectedQuote !== null);
    }
    // ── Token Selection ──────────────────────────────────────
    setFromToken(token) {
        this._patch({ fromToken: token });
        this._clearQuote();
    }
    setToToken(token) {
        this._patch({ toToken: token });
        this._clearQuote();
    }
    swapTokens() {
        const { fromToken, toToken } = this._state;
        this._patch({ fromToken: toToken, toToken: fromToken });
        this._clearQuote();
    }
    // ── Amount Input ─────────────────────────────────────────
    setInputAmount(amount) {
        // Allow only valid numeric input
        if (amount !== "" && !/^\d*\.?\d*$/.test(amount))
            return;
        this._patch({ inputAmount: amount });
        this._clearQuote();
    }
    // ── Slippage ─────────────────────────────────────────────
    setSlippage(config) {
        this._patch({
            slippage: { ...this._state.slippage, ...config },
        });
    }
    getSlippagePercent() {
        return (this._state.slippage.slippageBps / 100).toFixed(2);
    }
    getMinimumReceived(fromAmountWei, outputAmountWei) {
        return calculateMinimumReceived(outputAmountWei, this._state.slippage.slippageBps);
    }
    // ── Quote Fetching ───────────────────────────────────────
    async fetchQuote() {
        const { fromToken, toToken, inputAmount, chainId, walletAddress } = this._state;
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
            const params = {
                fromToken: fromToken.address,
                toToken: toToken.address,
                fromAmount,
                chainId,
                slippageBps: this._state.slippage.slippageBps,
                recipient: walletAddress,
            };
            const quotes = await this.config.fetchQuote(params);
            // Annotate quotes with minimum received
            const annotated = quotes.map((q) => ({
                ...q,
                minimumReceived: calculateMinimumReceived(q.toAmount, this._state.slippage.slippageBps),
            }));
            this._patch({
                state: "quote-ready",
                quotes: annotated,
                selectedQuote: annotated[0] ?? null,
                error: null,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Failed to fetch quote";
            this._patch({ state: "error", error: message, quotes: [] });
        }
    }
    selectQuote(quote) {
        this._patch({ selectedQuote: quote });
    }
    // ── Swap Execution ───────────────────────────────────────
    async executeSwap() {
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
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Transaction failed";
            this._patch({ state: "error", error: message });
            return null;
        }
    }
    buildTransaction() {
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
    reset() {
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
    onChange(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }
    // ── Private Helpers ──────────────────────────────────────
    _patch(partial) {
        this._state = { ...this._state, ...partial };
        this._notify();
    }
    _clearQuote() {
        this._patch({
            state: this._state.state === "success" ? "success" : "idle",
            quotes: [],
            selectedQuote: null,
            error: null,
        });
    }
    _notify() {
        for (const listener of this._listeners) {
            try {
                listener();
            }
            catch {
                // swallow
            }
        }
    }
    _parseAmount(input, decimals) {
        const parts = input.split(".");
        const whole = parts[0] || "0";
        let fractional = parts[1] || "";
        // Pad or truncate fractional to decimals
        if (fractional.length > decimals) {
            fractional = fractional.slice(0, decimals);
        }
        else {
            fractional = fractional.padEnd(decimals, "0");
        }
        return BigInt(whole + fractional);
    }
}
//# sourceMappingURL=SwapWidgetCore.js.map