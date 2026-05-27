/**
 * @cinacoin/onramp-sdk
 *
 * Cinacoin On-Ramp Aggregator SDK — multi-provider fiat-to-crypto gateway.
 *
 * @example
 * ```ts
 * import {
 *   OnRampAggregator,
 *   OnRampWidget,
 *   MoonPayProvider,
 *   RampProvider,
 *   TransakProvider,
 * } from '@cinacoin/onramp-sdk';
 *
 * const aggregator = new OnRampAggregator();
 *
 * aggregator.registerProvider(new MoonPayProvider({
 *   apiKey: process.env.MOONPAY_API_KEY,
 *   environment: 'production',
 * }));
 * aggregator.registerProvider(new RampProvider({
 *   apiKey: process.env.RAMP_API_KEY,
 * }));
 * aggregator.registerProvider(new TransakProvider({
 *   apiKey: process.env.TRANSAK_API_KEY,
 *   environment: 'production',
 * }));
 *
 * const bestQuote = await aggregator.getBestQuote({
 *   fiatCurrency: 'USD',
 *   fiatAmount: 100,
 *   cryptoToken: 'ETH',
 *   chainId: 1,
 *   destinationAddress: '0x...',
 *   userRegion: 'US',
 * });
 *
 * console.log(`Best on-ramp: ${bestQuote.providerName} — ${bestQuote.cryptoAmount} ETH`);
 * ```
 */
export type { OnRampProviderId, OnRampFees, OnRampProvider, OnRampQuoteParams, OnRampQuote, OnRampResult, OnRampWidgetParams, UserPreferences, } from "./types.js";
export { OnRampAggregator } from "./aggregator.js";
export type { OnRampProviderAdapter, AggregatorConfig } from "./aggregator.js";
export { MoonPayProvider } from "./providers/moonpay.js";
export type { MoonPayConfig } from "./providers/moonpay.js";
export { RampProvider } from "./providers/ramp.js";
export type { RampConfig } from "./providers/ramp.js";
export { TransakProvider } from "./providers/transak.js";
export type { TransakConfig } from "./providers/transak.js";
export { OnRampWidget } from "./widget.js";
export type { WidgetConfig, OnRampWidgetEvent, OnRampWidgetCallback, } from "./widget.js";
//# sourceMappingURL=index.d.ts.map