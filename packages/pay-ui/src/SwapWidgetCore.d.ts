/**
 * SwapWidgetCore — Framework-agnostic swap widget controller.
 *
 * Manages quote fetching, slippage calculation, and transaction building
 * for the SwapWidget UI.
 */
import type { SwapQuote, SwapTransaction, SwapReceipt, TokenInfo } from "@cinacoin/swap-sdk";
import type { SwapWidgetCoreConfig, SwapWidgetCoreState, SlippageConfig } from "./types.js";
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
export declare class SwapWidgetCore {
    private config;
    private _state;
    private _listeners;
    constructor(config: SwapWidgetCoreConfig);
    get state(): Readonly<SwapWidgetCoreState>;
    get isReady(): boolean;
    get canSwap(): boolean;
    setFromToken(token: TokenInfo | null): void;
    setToToken(token: TokenInfo | null): void;
    swapTokens(): void;
    setInputAmount(amount: string): void;
    setSlippage(config: Partial<SlippageConfig>): void;
    getSlippagePercent(): string;
    getMinimumReceived(fromAmountWei: bigint, outputAmountWei: bigint): bigint;
    fetchQuote(): Promise<void>;
    selectQuote(quote: SwapQuote): void;
    executeSwap(): Promise<SwapReceipt | null>;
    buildTransaction(): SwapTransaction;
    reset(): void;
    onChange(listener: () => void): () => void;
    private _patch;
    private _clearQuote;
    private _notify;
    private _parseAmount;
}
//# sourceMappingURL=SwapWidgetCore.d.ts.map