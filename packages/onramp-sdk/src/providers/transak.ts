/**
 * Transak Provider
 *
 * Integration with Transak's on-ramp API and widget.
 * Documentation: https://docs.transak.com/
 */

import type { OnRampProviderAdapter } from "../aggregator.js";
import type { OnRampProvider, OnRampQuote, OnRampQuoteParams, OnRampWidgetParams } from "../types.js";

const TRANSAK_WIDGET_BASE = "https://global.transak.com";
const TRANSAK_API_BASE = "https://api.transak.com";

export interface TransakConfig {
  /** Transak API key */
  apiKey: string;
  /** Environment */
  environment: "sandbox" | "production";
}

export class TransakProvider implements OnRampProviderAdapter {
  public readonly id = "transak";

  private config: TransakConfig;

  constructor(config: TransakConfig) {
    this.config = config;
  }

  getProviderInfo(): OnRampProvider {
    return {
      id: "transak",
      name: "Transak",
      icon: "https://s3.amazonaws.com/static.transak.com/favicon-32x32.png",
      supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "BRL"],
      supportedPaymentMethods: ["credit_card", "debit_card", "bank_transfer", "upi"],
      fees: {
        networkFeeBps: 120,
        providerFeeBps: 300,
        fixedFee: 3.50,
        totalFeePercent: 4.2,
      },
      regions: ["US", "CA", "GB", "DE", "FR", "IN", "BR", "AU", "SG", "NG", "KE"],
      minPurchaseAmount: 30,
      maxPurchaseAmount: 15000,
      estimatedTimeMinutes: 12,
      requiresKyc: true,
    };
  }

  async getQuote(params: OnRampQuoteParams): Promise<OnRampQuote> {
    const info = this.getProviderInfo();

    try {
      const url = new URL(`${TRANSAK_API_BASE}/api/v1/currencies/crypto-currencies`);
      const res = await fetch(url.toString());
      // In production, parse response for token-specific pricing
    } catch {
      // Continue to estimate
    }

    return this.estimateQuote(params, info);
  }

  getWidgetUrl(params: OnRampWidgetParams): string {
    const baseUrl = this.config.environment === "sandbox"
      ? "https://staging-global.transak.com"
      : TRANSAK_WIDGET_BASE;

    const url = new URL(baseUrl);
    url.searchParams.set("apiKey", this.config.apiKey);
    url.searchParams.set("walletAddress", params.destinationAddress);

    if (params.defaultCryptoToken) {
      url.searchParams.set("cryptocurrency", params.defaultCryptoToken.toUpperCase());
    }
    if (params.defaultFiatAmount) {
      url.searchParams.set("defaultCryptoAmount", params.defaultFiatAmount.toString());
    }
    if (params.defaultFiatCurrency) {
      url.searchParams.set("fiatCurrency", params.defaultFiatCurrency);
    }
    if (params.theme) {
      url.searchParams.set("theme", params.theme);
    }
    if (params.redirectUrl) {
      url.searchParams.set("redirectURL", params.redirectUrl);
    }
    if (params.primaryColor) {
      url.searchParams.set("color", params.primaryColor);
    }

    return url.toString();
  }

  private estimateQuote(
    params: OnRampQuoteParams,
    info: OnRampProvider,
  ): OnRampQuote {
    const estimatedRate = 1 / 3000;
    const cryptoAmount = params.fiatAmount * estimatedRate;
    const totalCost = params.fiatAmount * (info.fees.totalFeePercent / 100) + info.fees.fixedFee;

    return {
      provider: "transak",
      providerName: info.name,
      fiatAmount: params.fiatAmount,
      fiatCurrency: params.fiatCurrency,
      cryptoAmount,
      cryptoToken: params.cryptoToken,
      exchangeRate: estimatedRate,
      totalCost,
      fees: info.fees,
      estimatedTime: info.estimatedTimeMinutes,
      requiresKyc: info.requiresKyc,
      paymentMethods: info.supportedPaymentMethods,
      regions: info.regions,
      expiresAt: Date.now() + 60_000,
    };
  }
}
