/**
 * OnRampWidgetCore — Framework-agnostic on-ramp widget controller.
 *
 * Manages quote fetching, provider selection, and provider redirect
 * for the OnRampWidget UI.
 */
import type { OnRampQuote, OnRampProviderId, OnRampResult } from "@cinacoin/onramp-sdk";
import type { OnRampWidgetCoreConfig, OnRampWidgetCoreState } from "./types.js";
/**
 * Core on-ramp widget controller (framework-agnostic).
 *
 * Usage:
 * ```ts
 * const core = new OnRampWidgetCore({
 *   params: { destinationAddress: '0x...', defaultFiatCurrency: 'USD' },
 *   fetchQuotes: async (params) => {...},
 *   redirectToProvider: async (quote) => {...},
 * });
 *
 * core.setFiatAmount(100);
 * core.setFiatCurrency('EUR');
 * core.setCryptoToken('ETH');
 * await core.fetchQuotes();
 * core.selectProvider('moonpay');
 * await core.redirectToProvider();
 * ```
 */
export declare class OnRampWidgetCore {
    private config;
    private _state;
    private _listeners;
    constructor(config: OnRampWidgetCoreConfig);
    get state(): Readonly<OnRampWidgetCoreState>;
    get canRedirect(): boolean;
    setFiatAmount(amount: number): void;
    setFiatCurrency(currency: string): void;
    setCryptoToken(token: string): void;
    setUserRegion(region: string): void;
    fetchQuotes(): Promise<void>;
    selectProvider(provider: OnRampProviderId): void;
    getSelectedQuote(): OnRampQuote | null;
    getBestQuote(): OnRampQuote | null;
    redirectToProvider(): Promise<OnRampResult | null>;
    reset(): void;
    onChange(listener: () => void): () => void;
    private _patch;
    private _clearQuotes;
    private _notify;
}
//# sourceMappingURL=OnRampWidgetCore.d.ts.map