/**
 * On-Ramp Aggregator — Fetches quotes from multiple fiat-to-crypto providers
 * and selects the best one based on cost, speed, and user preferences.
 *
 * Supported providers: MoonPay, Ramp, Transak, Stripe, Coinbase.
 */

import type {
  OnRampQuote,
  OnRampQuoteParams,
  OnRampProvider,
  OnRampResult,
  OnRampWidgetParams,
  UserPreferences,
} from "./types.js";

// ============================================================
// Provider Interface
// ============================================================

export interface OnRampProviderAdapter {
  /** Provider ID */
  id: string;
  /** Get provider metadata */
  getProviderInfo(): OnRampProvider;
  /** Get a quote for the given parameters */
  getQuote(params: OnRampQuoteParams): Promise<OnRampQuote>;
  /** Get the widget URL for a quote */
  getWidgetUrl(params: OnRampWidgetParams): string;
}

// ============================================================
// Aggregator Config
// ============================================================

export interface AggregatorConfig {
  /** Maximum time to wait for all quotes (ms) */
  quoteTimeoutMs: number;
  /** Default user region */
  defaultRegion: string;
  /** Cache TTL for provider info (ms) */
  providerInfoTTL: number;
}

const DEFAULT_CONFIG: AggregatorConfig = {
  quoteTimeoutMs: 8000,
  defaultRegion: "US",
  providerInfoTTL: 5 * 60 * 1000,
};

// ============================================================
// Response Validation
// ============================================================

/**
 * Validate an on-ramp quote returned by a provider adapter.
 * Throws a descriptive error on invalid or missing fields.
 */
function validateOnRampQuote(data: unknown, providerId: string): OnRampQuote {
  if (!data || typeof data !== "object") {
    throw new Error(
      `onramp-sdk (${providerId}): expected object response for quote, got ${typeof data}`
    );
  }
  const d = data as Record<string, unknown>;

  // Required fields
  if (typeof d.provider !== "string") {
    throw new Error(`onramp-sdk (${providerId}): missing or invalid 'provider' field`);
  }
  if (typeof d.providerName !== "string") {
    throw new Error(`onramp-sdk (${providerId}): missing or invalid 'providerName' field`);
  }
  if (typeof d.fiatAmount !== "number" || d.fiatAmount <= 0) {
    throw new Error(
      `onramp-sdk (${providerId}): invalid fiatAmount (expected positive number, got ${d.fiatAmount})`
    );
  }
  if (typeof d.fiatCurrency !== "string") {
    throw new Error(`onramp-sdk (${providerId}): missing or invalid 'fiatCurrency' field`);
  }
  if (typeof d.cryptoAmount !== "number" || d.cryptoAmount <= 0) {
    throw new Error(
      `onramp-sdk (${providerId}): invalid cryptoAmount (expected positive number, got ${d.cryptoAmount})`
    );
  }
  if (typeof d.cryptoToken !== "string") {
    throw new Error(`onramp-sdk (${providerId}): missing or invalid 'cryptoToken' field`);
  }
  if (typeof d.exchangeRate !== "number" || d.exchangeRate <= 0) {
    throw new Error(
      `onramp-sdk (${providerId}): invalid exchangeRate (expected positive number, got ${d.exchangeRate})`
    );
  }
  if (typeof d.totalCost !== "number" || d.totalCost < 0) {
    throw new Error(
      `onramp-sdk (${providerId}): invalid totalCost (expected non-negative number, got ${d.totalCost})`
    );
  }

  // Validate fees object
  if (!d.fees || typeof d.fees !== "object") {
    throw new Error(`onramp-sdk (${providerId}): missing or invalid 'fees' object`);
  }
  const fees = d.fees as Record<string, unknown>;
  if (typeof fees.totalFeePercent !== "number" || fees.totalFeePercent < 0) {
    throw new Error(
      `onramp-sdk (${providerId}): fees.totalFeePercent is invalid (expected non-negative number)`
    );
  }

  // Validate estimatedTime
  if (typeof d.estimatedTime !== "number" || d.estimatedTime < 0) {
    throw new Error(
      `onramp-sdk (${providerId}): invalid estimatedTime (expected non-negative number, got ${d.estimatedTime})`
    );
  }

  // Validate expiresAt
  if (typeof d.expiresAt !== "number" || d.expiresAt <= 0) {
    throw new Error(
      `onramp-sdk (${providerId}): invalid expiresAt (expected positive timestamp)`
    );
  }

  return d as unknown as OnRampQuote;
}

// ============================================================
// OnRampAggregator
// ============================================================

export class OnRampAggregator {
  private providers: Map<string, OnRampProviderAdapter>;
  private config: AggregatorConfig;

  constructor(config?: Partial<AggregatorConfig>) {
    this.providers = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a provider adapter.
   */
  registerProvider(provider: OnRampProviderAdapter): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a provider by ID.
   */
  unregisterProvider(id: string): void {
    this.providers.delete(id);
  }

  /**
   * Get all registered providers.
   */
  getProviders(region?: string): OnRampProvider[] {
    const results: OnRampProvider[] = [];

    for (const adapter of this.providers.values()) {
      try {
        const info = adapter.getProviderInfo();
        if (region && !info.regions.includes(region)) {
          continue;
        }
        results.push(info);
      } catch (err) {
        console.warn('[onramp-sdk/aggregator] Provider info failed:', err);
      }
    }

    return results;
  }

  /**
   * Fetch quotes from all available providers concurrently.
   */
  async getQuotes(params: OnRampQuoteParams): Promise<OnRampQuote[]> {
    const quotePromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          this.config.quoteTimeoutMs,
        );

        const rawQuote = await provider.getQuote(params);
        clearTimeout(timeout);
        const validated = validateOnRampQuote(rawQuote, provider.id);
        return validated;
      } catch (err) {
        console.warn(`Quote failed for ${provider.id}:`, err);
        return null;
      }
    });

    const results = await Promise.allSettled(quotePromises);

    return results
      .filter(
        (r): r is PromiseFulfilledResult<OnRampQuote | null> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value)
      .filter((q): q is OnRampQuote => q !== null);
  }

  /**
   * Get the best quote based on user preferences.
   *
   * Selection priority:
   * 1. Lowest total cost
   * 2. Shortest delivery time
   * 3. Preferred payment method match
   */
  async getBestQuote(
    params: OnRampQuoteParams,
    preferences?: UserPreferences,
  ): Promise<OnRampQuote | null> {
    const quotes = await this.getQuotes(params);

    if (quotes.length === 0) {
      return null;
    }

    const sorted = this.sortQuotes(quotes, preferences);
    return sorted[0];
  }

  /**
   * Sort quotes by preference.
   */
  private sortQuotes(
    quotes: OnRampQuote[],
    preferences?: UserPreferences,
  ): OnRampQuote[] {
    return [...quotes].sort((a, b) => {
      // 1. Total cost (lower is better)
      if (a.totalCost !== b.totalCost) {
        return a.totalCost - b.totalCost;
      }

      // 2. Delivery time (shorter is better)
      if (a.estimatedTime !== b.estimatedTime) {
        return a.estimatedTime - b.estimatedTime;
      }

      // 3. Fee percentage
      return a.fees.totalFeePercent - b.fees.totalFeePercent;
    });
  }

  /**
   * Get the widget URL for the best available quote.
   */
  getWidgetUrl(params: OnRampWidgetParams): string | null {
    const providerId = params.enabledProviders?.[0];
    if (providerId) {
      const provider = this.providers.get(providerId);
      if (provider) {
        return provider.getWidgetUrl(params);
      }
    }

    // Use the first available provider
    for (const adapter of this.providers.values()) {
      try {
        return adapter.getWidgetUrl(params);
      } catch (err) {
        console.warn('[onramp-sdk/aggregator] getWidgetUrl failed for provider:', err);
      }
    }

    return null;
  }

  /**
   * Handle the result of a widget session.
   */
  handleWidgetResult(result: OnRampResult): void {
    if (result.completed) {
      console.log(
        `On-ramp purchase completed: ${result.cryptoAmount} via ${result.provider}`,
      );
    } else {
      console.warn(
        `On-ramp purchase failed or cancelled: ${result.error}`,
      );
    }
  }
}
