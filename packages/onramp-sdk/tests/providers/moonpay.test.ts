/**
 * Tests for MoonPay provider.
 */

import { describe, it, expect } from 'vitest';
import { MoonPayProvider } from '../src/providers/moonpay.js';
import type { MoonPayConfig } from '../src/providers/moonpay.js';

describe('MoonPayProvider', () => {
  const config: MoonPayConfig = {
    apiKey: 'test-api-key',
    environment: 'sandbox',
  };

  it('should create with config', () => {
    const provider = new MoonPayProvider(config);
    expect(provider.id).toBe('moonpay');
  });

  it('should return provider info', () => {
    const provider = new MoonPayProvider(config);
    const info = provider.getProviderInfo();
    expect(info.id).toBe('moonpay');
    expect(info.name).toBe('MoonPay');
    expect(info.supportedCurrencies).toContain('USD');
    expect(info.supportedCurrencies).toContain('EUR');
  });

  it('should generate widget URL', () => {
    const provider = new MoonPayProvider(config);
    const url = provider.getWidgetUrl({
      destinationAddress: '0x1234567890123456789012345678901234567890',
      defaultFiatAmount: 100,
      defaultFiatCurrency: 'USD',
    });
    expect(url).toContain('moonpay.com');
    expect(url).toContain('0x1234567890123456789012345678901234567890');
  });

  it('should generate quote', async () => {
    const provider = new MoonPayProvider(config);
    const quote = await provider.getQuote({
      fiatCurrency: 'USD',
      fiatAmount: 100,
      cryptoToken: 'ETH',
      chainId: 1,
      destinationAddress: '0x1234567890123456789012345678901234567890',
      userRegion: 'US',
    });
    expect(quote.provider).toBe('moonpay');
    expect(quote.fiatAmount).toBe(100);
    expect(quote.fiatCurrency).toBe('USD');
    expect(quote.cryptoToken).toBe('ETH');
  });

  it('should return sandbox URL by default', () => {
    const provider = new MoonPayProvider(config);
    const url = provider.getWidgetUrl({
      destinationAddress: '0xaddr',
    });
    expect(url).toContain('sandbox.moonpay.com');
  });

  it('should return production URL', () => {
    const provider = new MoonPayProvider({ ...config, environment: 'production' });
    const url = provider.getWidgetUrl({
      destinationAddress: '0xaddr',
    });
    expect(url).toContain('buy.moonpay.com');
  });
});
