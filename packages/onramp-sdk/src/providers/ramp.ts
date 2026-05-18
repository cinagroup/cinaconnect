/**
 * Ramp Provider
 *
 * Integration with Ramp Network's on-ramp API and widget.
 * Documentation: https://ramp.network/
 */

import type { OnRampProviderAdapter } from "../aggregator.js";
import type { OnRampProvider, OnRampQuote, OnRampQuoteParams, OnRampWidgetParams } from "../types.js";

const RAMP_WIDGET_BASE = "https://buy.ramp.network";
const RAMP_API_BASE = "https://api-instant.ramp.network";

export interface RampConfig {
  /** Ramp partner ID / API key */
  apiKey: string;
  /** Partner name for branding */
  partnerName?: string;
}

export class RampProvider implements OnRampProviderAdapter {
  public readonly id = "ramp";

  private config: RampConfig;

  constructor(config: RampConfig) {
    this.config = config;
  }

  getProviderInfo(): OnRampProvider {
    return {
      id: "ramp",
      name: "Ramp Network",
      icon: "https://ramp.network/assets/images/logo.png",
      supportedCurrencies: ["USD", "EUR", "GBP", "PLN", "CAD", "AUD"],
      supportedPaymentMethods: ["credit_card", "debit_card", "bank_transfer", "apple_pay", "google_pay"],
      fees: {
        networkFeeBps: 80,
        providerFeeBps: 250,
        fixedFee: 2.99,
        totalFeePercent: 3.3,
      },
      regions: ["US", "CA", "GB", "DE", "FR", "PL", "NL", "ES", "IT", "AU", "SG", "JP"],
      minPurchaseAmount: 20,
      maxPurchaseAmount: 20000,
      estimatedTimeMinutes: 8,
      requiresKyc: true,
    };
  }

  async getQuote(params: OnRampQuoteParams): Promise<OnRampQuote> {
    const info = this.getProviderInfo();
    const url = new URL(`${RAMP_API_BASE}/api/host-api/get-token-price/`);
    url.searchParams.set("symbol", params.cryptoToken.toLowerCase());

    try {
      const res = await fetch(url.toString());
      const data = await res.json();
      const exchangeRate = data.price || 0;
      const cryptoAmount = params.fiatAmount / exchangeRate;
      const totalCost = params.fiatAmount * (info.fees.totalFeePercent / 100) + info.fees.fixedFee;

      return {
        provider: "ramp",
        providerName: info.name,
        fiatAmount: params.fiatAmount,
        fiatCurrency: params.fiatCurrency,
        cryptoAmount,
        cryptoToken: params.cryptoToken,
        exchangeRate,
        totalCost,
        fees: info.fees,
        estimatedTime: info.estimatedTimeMinutes,
        requiresKyc: info.requiresKyc,
        paymentMethods: info.supportedPaymentMethods,
        regions: info.regions,
        expiresAt: Date.now() + 60_000,
      };
    } catch {
      return this.estimateQuote(params, info);
    }
  }

  getWidgetUrl(params: OnRampWidgetParams): string {
    const url = new URL(RAMP_WIDGET_BASE);
    url.searchParams.set("hostApiKey", this.config.apiKey);
    url.searchParams.set("userAddress", params.destinationAddress);

    if (params.defaultCryptoToken) {
      url.searchParams.set("swapAsset", params.defaultCryptoToken.toUpperCase());
    }
    if (params.defaultFiatAmount) {
      url.searchParams.set("fiatCurrency", params.defaultFiatCurrency || "USD");
      url.searchParams.set("fiatValue", params.defaultFiatAmount.toString());
    }
    if (params.theme) {
      url.searchParams.set("theme", params.theme);
    }
    if (params.redirectUrl) {
      url.searchParams.set("url", params.redirectUrl);
    }
    if (params.primaryColor) {
      url.searchParams.set("defaultTheme", params.primaryColor.replace("#", ""));
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
      provider: "ramp",
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
