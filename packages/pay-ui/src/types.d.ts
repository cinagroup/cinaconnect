/**
 * Pay UI Widget Type Definitions
 *
 * Shared types for SwapWidget and OnRampWidget components.
 */
import type { Address } from "viem";
import type { SwapQuote, SwapQuoteParams, SwapTransaction, SwapReceipt, TokenInfo } from "@cinacoin/swap-sdk";
import type { OnRampQuote, OnRampQuoteParams, OnRampProviderId, OnRampWidgetParams, OnRampResult } from "@cinacoin/onramp-sdk";
/**
 * Slippage configuration for a swap.
 */
export interface SlippageConfig {
    /** Slippage tolerance in basis points (e.g., 50 = 0.5%) */
    slippageBps: number;
    /** Whether slippage is set to auto mode */
    autoSlippage: boolean;
    /** Custom slippage options available to the user */
    presets: number[];
}
/**
 * State of the SwapWidget.
 */
export type SwapWidgetState = "idle" | "selecting-token" | "fetching-quote" | "quote-ready" | "executing" | "success" | "error";
/**
 * Props for the SwapWidget React component.
 */
export interface SwapWidgetProps {
    /** Supported tokens to display */
    supportedTokens?: TokenInfo[];
    /** Default source token */
    defaultFromToken?: TokenInfo;
    /** Default destination token */
    defaultToToken?: TokenInfo;
    /** Default input amount */
    defaultAmount?: string;
    /** Chain ID for the swap */
    chainId: number;
    /** User wallet address */
    walletAddress?: Address;
    /** Theme mode */
    theme?: "light" | "dark";
    /** Custom primary color */
    primaryColor?: string;
    /** Callback when swap completes */
    onSwapComplete?: (receipt: SwapReceipt) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
    /** Additional class name */
    className?: string;
}
/**
 * Props for the SwapWidgetCore controller.
 */
export interface SwapWidgetCoreConfig {
    /** Chain ID */
    chainId: number;
    /** User wallet address */
    walletAddress?: Address;
    /** Quote fetcher function */
    fetchQuote: (params: SwapQuoteParams) => Promise<SwapQuote[]>;
    /** Transaction executor function */
    executeTransaction: (tx: SwapTransaction) => Promise<SwapReceipt>;
}
/**
 * Internal state of the SwapWidgetCore controller.
 */
export interface SwapWidgetCoreState {
    /** Current widget state */
    state: SwapWidgetState;
    /** Selected source token */
    fromToken: TokenInfo | null;
    /** Selected destination token */
    toToken: TokenInfo | null;
    /** User input amount (as string for display) */
    inputAmount: string;
    /** Fetched quotes */
    quotes: SwapQuote[];
    /** Best selected quote */
    selectedQuote: SwapQuote | null;
    /** Current error message */
    error: string | null;
    /** Slippage configuration */
    slippage: SlippageConfig;
    /** Last transaction receipt */
    lastReceipt: SwapReceipt | null;
}
/**
 * State of the OnRampWidget.
 */
export type OnRampWidgetState = "idle" | "input" | "fetching-quotes" | "quotes-ready" | "redirecting" | "completed" | "error";
/**
 * Props for the OnRampWidget React component.
 */
export interface OnRampWidgetProps {
    /** Default fiat amount */
    defaultFiatAmount?: number;
    /** Default fiat currency */
    defaultFiatCurrency?: string;
    /** Default crypto token */
    defaultCryptoToken?: string;
    /** Destination wallet address */
    destinationAddress: Address;
    /** User region */
    userRegion?: string;
    /** Enabled providers */
    enabledProviders?: OnRampProviderId[];
    /** Theme mode */
    theme?: "light" | "dark";
    /** Custom primary color */
    primaryColor?: string;
    /** Callback when on-ramp completes */
    onComplete?: (result: OnRampResult) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
    /** Additional class name */
    className?: string;
}
/**
 * Props for the OnRampWidgetCore controller.
 */
export interface OnRampWidgetCoreConfig {
    /** Default widget parameters */
    params: OnRampWidgetParams;
    /** Quote fetcher function */
    fetchQuotes: (params: OnRampQuoteParams) => Promise<OnRampQuote[]>;
    /** Provider redirect handler */
    redirectToProvider: (quote: OnRampQuote) => Promise<OnRampResult>;
}
/**
 * Internal state of the OnRampWidgetCore controller.
 */
export interface OnRampWidgetCoreState {
    /** Current widget state */
    state: OnRampWidgetState;
    /** Fiat amount */
    fiatAmount: number;
    /** Fiat currency */
    fiatCurrency: string;
    /** Selected crypto token */
    cryptoToken: string;
    /** Selected provider */
    selectedProvider: OnRampProviderId | null;
    /** Fetched quotes */
    quotes: OnRampQuote[];
    /** Current error */
    error: string | null;
    /** Last result */
    lastResult: OnRampResult | null;
}
//# sourceMappingURL=types.d.ts.map