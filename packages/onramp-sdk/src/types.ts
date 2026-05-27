/**
 * On-Ramp SDK Type Definitions
 *
 * Defines core types for the Cinacoin On-Ramp Aggregator SDK.
 */

import type { Address } from "viem";

// ============================================================
// Provider Types
// ============================================================

/**
 * Supported on-ramp provider identifiers.
 */
export type OnRampProviderId =
  | "moonpay"
  | "ramp"
  | "transak"
  | "stripe"
  | "coinbase";

/**
 * Fee structure for an on-ramp provider.
 */
export interface OnRampFees {
  /** Network fee in basis points */
  networkFeeBps: number;
  /** Provider fee in basis points */
  providerFeeBps: number;
  /** Fixed fee in the source currency */
  fixedFee: number;
  /** Total effective fee percentage */
  totalFeePercent: number;
}

/**
 * An on-ramp provider configuration.
 */
export interface OnRampProvider {
  /** Provider identifier */
  id: OnRampProviderId;
  /** Display name */
  name: string;
  /** Icon URL */
  icon: string;
  /** Supported fiat currencies */
  supportedCurrencies: string[];
  /** Supported payment methods */
  supportedPaymentMethods: string[];
  /** Fee structure */
  fees: OnRampFees;
  /** Supported regions (ISO 3166-1 alpha-2) */
  regions: string[];
  /** Minimum purchase amount (in source currency) */
  minPurchaseAmount: number;
  /** Maximum purchase amount (in source currency) */
  maxPurchaseAmount: number;
  /** Estimated delivery time in minutes */
  estimatedTimeMinutes: number;
  /** Whether KYC is required */
  requiresKyc: boolean;
}

// ============================================================
// Quote Types
// ============================================================

/**
 * Parameters for requesting an on-ramp quote.
 */
export interface OnRampQuoteParams {
  /** Fiat currency code (e.g., 'USD', 'EUR', 'CNY') */
  fiatCurrency: string;
  /** Fiat amount */
  fiatAmount: number;
  /** Target crypto token address or symbol */
  cryptoToken: string;
  /** Target chain ID */
  chainId: number;
  /** Destination wallet address */
  destinationAddress: Address;
  /** User region (ISO 3166-1 alpha-2) */
  userRegion: string;
  /** Preferred payment method */
  paymentMethod?: string;
}

/**
 * A quote from a single on-ramp provider.
 */
export interface OnRampQuote {
  /** Provider identifier */
  provider: OnRampProviderId;
  /** Provider display name */
  providerName: string;
  /** Input fiat amount */
  fiatAmount: number;
  /** Fiat currency */
  fiatCurrency: string;
  /** Output crypto amount */
  cryptoAmount: number;
  /** Crypto token symbol */
  cryptoToken: string;
  /** Exchange rate (crypto per fiat unit) */
  exchangeRate: number;
  /** Total cost including all fees */
  totalCost: number;
  /** Fee breakdown */
  fees: OnRampFees;
  /** Estimated delivery time in minutes */
  estimatedTime: number;
  /** Whether this quote requires KYC */
  requiresKyc: boolean;
  /** Supported payment methods for this quote */
  paymentMethods: string[];
  /** Supported regions */
  regions: string[];
  /** Quote expiration timestamp */
  expiresAt: number;
  /** Widget URL for this quote (if available) */
  widgetUrl?: string;
}

/**
 * Result from an on-ramp widget session.
 */
export interface OnRampResult {
  /** Whether the purchase was completed */
  completed: boolean;
  /** Order ID from the provider */
  orderId?: string;
  /** Transaction hash (if on-chain) */
  txHash?: `0x${string}`;
  /** Amount of crypto received */
  cryptoAmount?: number;
  /** Amount of fiat spent */
  fiatAmount?: number;
  /** Provider used */
  provider?: OnRampProviderId;
  /** Error message if failed */
  error?: string;
}

// ============================================================
// Widget Types
// ============================================================

/**
 * Parameters for configuring the on-ramp widget.
 */
export interface OnRampWidgetParams {
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
  /** Enabled providers (empty = all) */
  enabledProviders?: OnRampProviderId[];
  /** Theme mode */
  theme?: "light" | "dark";
  /** Custom primary color */
  primaryColor?: string;
  /** Callback URL after purchase */
  redirectUrl?: string;
  /** Whether to close widget on completion */
  closeOnComplete?: boolean;
}

/**
 * User preferences for provider selection.
 */
export interface UserPreferences {
  /** Preferred payment methods */
  preferredPaymentMethods?: string[];
  /** Maximum acceptable fee percentage */
  maxFeePercent?: number;
  /** Maximum acceptable delivery time */
  maxDeliveryTimeMinutes?: number;
  /** Whether to skip KYC-required providers */
  skipKyc?: boolean;
}
