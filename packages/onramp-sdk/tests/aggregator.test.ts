/**
 * Tests for OnRamp Aggregator SDK.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnRampAggregator } from '../src/aggregator.js';
import type { OnRampProviderAdapter, AggregatorConfig } from '../src/aggregator.js';
import type { OnRampQuote, OnRampProvider, OnRampQuoteParams, OnRampWidgetParams } from '../src/types.js';

function createMockProvider(id: string, feeBps: number, deliveryMin: number): OnRampProviderAdapter {
  return {
    id,
    getProviderInfo: (): OnRampProvider => ({
      id: id as any,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      icon: `https://${id}.com/icon.png`,
      supportedCurrencies: ['USD', 'EUR'],
      supportedPaymentMethods: ['credit_card', 'bank_transfer'],
      fees: { networkFeeBps: 100, providerFeeBps: feeBps, fixedFee: 1, totalFeePercent: (feeBps / 100) },
      regions: ['US', 'GB'],
      minPurchaseAmount: 10,
      maxPurchaseAmount: 10000,
      estimatedTimeMinutes: deliveryMin,
      requiresKyc: id === 'moonpay',
    }),
    getQuote: async (params: OnRampQuoteParams): Promise<OnRampQuote> => ({
      provider: id as any,
      providerName: id.charAt(0).toUpperCase() + id.slice(1),
      fiatAmount: params.fiatAmount,
      fiatCurrency: params.fiatCurrency,
      cryptoAmount: params.fiatAmount / (100 + feeBps / 100),
      cryptoToken: params.cryptoToken,
      exchangeRate: 1 / (100 + feeBps / 100),
      totalCost: params.fiatAmount * (feeBps / 10000),
      fees: { networkFeeBps: 100, providerFeeBps: feeBps, fixedFee: 1, totalFeePercent: feeBps / 100 },
      estimatedTime: deliveryMin,
      requiresKyc: id === 'moonpay',
      paymentMethods: ['credit_card'],
      regions: ['US', 'GB'],
      expiresAt: Date.now() + 300000,
    }),
    getWidgetUrl: (params: OnRampWidgetParams): string =>
      `https://${id}.com/widget?addr=${params.destinationAddress}`,
  };
}

describe('OnRampAggregator', () => {
  let aggregator: OnRampAggregator;

  beforeEach(() => {
    aggregator = new OnRampAggregator();
  });

  it('should have default config', () => {
    expect(aggregator.getProviders()).toEqual([]);
  });

  it('should register a provider', () => {
    const provider = createMockProvider('moonpay', 250, 15);
    aggregator.registerProvider(provider);
    expect(aggregator.getProviders()).toHaveLength(1);
  });

  it('should unregister a provider', () => {
    const provider = createMockProvider('moonpay', 250, 15);
    aggregator.registerProvider(provider);
    aggregator.unregisterProvider('moonpay');
    expect(aggregator.getProviders()).toHaveLength(0);
  });

  it('should filter providers by region', () => {
    const moonpay = createMockProvider('moonpay', 250, 15);
    const ramp = createMockProvider('ramp', 200, 10);
    aggregator.registerProvider(moonpay);
    aggregator.registerProvider(ramp);

    const usProviders = aggregator.getProviders('US');
    expect(usProviders.length).toBeGreaterThanOrEqual(1);
  });

  it('should get quotes from multiple providers', async () => {
    const moonpay = createMockProvider('moonpay', 300, 15);
    const ramp = createMockProvider('ramp', 200, 10);
    aggregator.registerProvider(moonpay);
    aggregator.registerProvider(ramp);

    const quotes = await aggregator.getQuotes({
      fiatCurrency: 'USD',
      fiatAmount: 100,
      cryptoToken: 'ETH',
      chainId: 1,
      destinationAddress: '0x1234567890123456789012345678901234567890',
      userRegion: 'US',
    });

    expect(quotes.length).toBe(2);
  });

  it('should handle provider failures gracefully', async () => {
    const failingProvider: OnRampProviderAdapter = {
      id: 'broken',
      getProviderInfo: () => {
        throw new Error('Provider broken');
      },
      getQuote: async () => {
        throw new Error('Quote failed');
      },
      getWidgetUrl: () => 'https://broken.com',
    };

    const good = createMockProvider('moonpay', 250, 15);
    aggregator.registerProvider(failingProvider);
    aggregator.registerProvider(good);

    const quotes = await aggregator.getQuotes({
      fiatCurrency: 'USD',
      fiatAmount: 100,
      cryptoToken: 'ETH',
      chainId: 1,
      destinationAddress: '0x1234567890123456789012345678901234567890',
      userRegion: 'US',
    });

    expect(quotes.length).toBe(1);
    expect(quotes[0].provider).toBe('moonpay');
  });

  it('should return best quote (lowest cost)', async () => {
    // Provider A: 3% fee
    const providerA = createMockProvider('moonpay', 300, 15);
    // Provider B: 1% fee (cheaper)
    const providerB = createMockProvider('ramp', 100, 20);
    aggregator.registerProvider(providerA);
    aggregator.registerProvider(providerB);

    const best = await aggregator.getBestQuote({
      fiatCurrency: 'USD',
      fiatAmount: 100,
      cryptoToken: 'ETH',
      chainId: 1,
      destinationAddress: '0x1234567890123456789012345678901234567890',
      userRegion: 'US',
    });

    expect(best).not.toBeNull();
    expect(best!.provider).toBe('ramp'); // Lower fee
  });

  it('should return null when no providers', async () => {
    const best = await aggregator.getBestQuote({
      fiatCurrency: 'USD',
      fiatAmount: 100,
      cryptoToken: 'ETH',
      chainId: 1,
      destinationAddress: '0x1234567890123456789012345678901234567890',
      userRegion: 'US',
    });
    expect(best).toBeNull();
  });

  it('should get widget URL', () => {
    const moonpay = createMockProvider('moonpay', 250, 15);
    aggregator.registerProvider(moonpay);

    const url = aggregator.getWidgetUrl({
      destinationAddress: '0x1234',
    });
    expect(url).toContain('moonpay.com');
  });

  it('should return null widget URL when no providers', () => {
    expect(aggregator.getWidgetUrl({ destinationAddress: '0x1234' })).toBeNull();
  });

  it('should handle widget result', () => {
    const logSpy = vi.spyOn(console, 'log');
    aggregator.handleWidgetResult({
      completed: true,
      orderId: 'order-123',
      cryptoAmount: 0.05,
      fiatAmount: 100,
      provider: 'moonpay',
    });
    expect(logSpy).toHaveBeenCalled();
  });

  it('should warn on failed widget result', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    aggregator.handleWidgetResult({
      completed: false,
      error: 'Transaction failed',
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('should respect custom config', () => {
    const customConfig: Partial<AggregatorConfig> = {
      quoteTimeoutMs: 3000,
      defaultRegion: 'GB',
    };
    const agg = new OnRampAggregator(customConfig);
    expect(agg.getProviders()).toEqual([]);
  });
});
