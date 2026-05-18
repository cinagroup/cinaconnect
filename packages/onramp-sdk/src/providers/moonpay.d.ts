/**
 * MoonPay Provider
 *
 * Integration with MoonPay's on-ramp API and widget.
 * Documentation: https://dev.moonpay.com/
 */
import type { OnRampProviderAdapter } from "../aggregator.js";
import type { OnRampProvider, OnRampQuote, OnRampQuoteParams, OnRampWidgetParams } from "../types.js";
export interface MoonPayConfig {
    /** MoonPay API key (publishable for widget, secret for server) */
    apiKey: string;
    /** Environment: sandbox or production */
    environment: "sandbox" | "production";
}
export declare class MoonPayProvider implements OnRampProviderAdapter {
    readonly id = "moonpay";
    private config;
    constructor(config: MoonPayConfig);
    getProviderInfo(): OnRampProvider;
    getQuote(params: OnRampQuoteParams): Promise<OnRampQuote>;
    getWidgetUrl(params: OnRampWidgetParams): string;
    private estimateQuote;
}
//# sourceMappingURL=moonpay.d.ts.map