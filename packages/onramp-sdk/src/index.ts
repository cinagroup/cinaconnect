/**
 * @onchainux/onramp-sdk
 *
 * OnChainUX On-Ramp Aggregator SDK — multi-provider fiat-to-crypto gateway.
 *
 * @example
 * ```ts
 * import {
 *   OnRampAggregator,
 *   OnRampWidget,
 *   MoonPayProvider,
 *   RampProvider,
 *   TransakProvider,
 * } from '@onchainux/onramp-sdk';
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

// Types
export type {
  OnRampProviderId,
  OnRampFees,
  OnRampProvider,
  OnRampQuoteParams,
  OnRampQuote,
  OnRampResult,
  OnRampWidgetParams,
  UserPreferences,
} from "./types.js.js";

// Aggregator
export { OnRampAggregator } from "./aggregator.js.js";
export type { OnRampProviderAdapter, AggregatorConfig } from "./aggregator.js.js";

// Providers
export { MoonPayProvider } from "./providers/moonpay.js.js";
export type { MoonPayConfig } from "./providers/moonpay.js.js";
export { RampProvider } from "./providers/ramp.js.js";
export type { RampConfig } from "./providers/ramp.js.js";
export { TransakProvider } from "./providers/transak.js.js";
export type { TransakConfig } from "./providers/transak.js.js";

// Widget
export { OnRampWidget } from "./widget.js.js";
export type {
  WidgetConfig,
  OnRampWidgetEvent,
  OnRampWidgetCallback,
} from "./widget.js.js";
