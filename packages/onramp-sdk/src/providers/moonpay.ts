/**
 * MoonPay Provider
 *
 * Integration with MoonPay's on-ramp API and widget.
 * Documentation: https://dev.moonpay.com/
 */

import type { OnRampProviderAdapter } from "../aggregator.js";
import type { OnRampProvider, OnRampQuote, OnRampQuoteParams, OnRampWidgetParams } from "../types.js";

const MOONPAY_API_BASE = "https://api.moonpay.com";
const MOONPAY_WIDGET_BASE = "https://buy.moonpay.com";

export interface MoonPayConfig {
  /** MoonPay API key (publishable for widget, secret for server) */
  apiKey: string;
  /** Environment: sandbox or production */
  environment: "sandbox" | "production";
}

export class MoonPayProvider implements OnRampProviderAdapter {
  public readonly id = "moonpay";

  private config: MoonPayConfig;

  constructor(config: MoonPayConfig) {
    this.config = config;
  }

  getProviderInfo(): OnRampProvider {
    return {
      id: "moonpay",
      name: "MoonPay",
      icon: "https://static.moonpay.com/web/favicon/favicon-32x32.png",
      supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD", "CNY", "JPY"],
      supportedPaymentMethods: ["credit_card", "debit_card", "bank_transfer", "apple_pay"],
      fees: {
        networkFeeBps: 100,
        providerFeeBps: 350,
        fixedFee: 4.99,
        totalFeePercent: 4.5,
      },
      regions: ["US", "CA", "GB", "AU", "DE", "FR", "JP", "KR", "SG", "HK"],
      minPurchaseAmount: 30,
      maxPurchaseAmount: 20000,
      estimatedTimeMinutes: 10,
      requiresKyc: true,
    };
  }

  async getQuote(params: OnRampQuoteParams): Promise<OnRampQuote> {
    const info = this.getProviderInfo();
    const url = new URL(`${MOONPAY_API_BASE}/v4/currencies/${params.cryptoToken.toLowerCase()}`);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
    });

    if (!res.ok) {
      // Return estimated quote
      return this.estimateQuote(params, info);
    }

    const data = await res.json();
    const exchangeRate = data.price?.amount || 0;
    const cryptoAmount = params.fiatAmount / exchangeRate;

    const totalCost = params.fiatAmount * (info.fees.totalFeePercent / 100);

    return {
      provider: "moonpay",
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
  }

  getWidgetUrl(params: OnRampWidgetParams): string {
    const url = new URL(MOONPAY_WIDGET_BASE);
    url.searchParams.set("apiKey", this.config.apiKey);
    url.searchParams.set("currencyCode", params.defaultCryptoToken?.toLowerCase() || "eth");
    url.searchParams.set("walletAddress", params.destinationAddress);

    if (params.defaultFiatAmount) {
      url.searchParams.set("baseCurrencyAmount", params.defaultFiatAmount.toString());
    }
    if (params.defaultFiatCurrency) {
      url.searchParams.set("baseCurrencyCode", params.defaultFiatCurrency.toLowerCase());
    }
    if (params.theme) {
      url.searchParams.set("theme", params.theme);
    }
    if (params.redirectUrl) {
      url.searchParams.set("redirectURL", params.redirectUrl);
    }

    return url.toString();
  }

  private estimateQuote(
    params: OnRampQuoteParams,
    info: OnRampProvider,
  ): OnRampQuote {
    // Simplified estimate when API is unavailable
    const estimatedRate = 1 / 3000; // rough ETH/USD
    const cryptoAmount = params.fiatAmount * estimatedRate;
    const totalCost = params.fiatAmount * (info.fees.totalFeePercent / 100) + info.fees.fixedFee;

    return {
      provider: "moonpay",
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
