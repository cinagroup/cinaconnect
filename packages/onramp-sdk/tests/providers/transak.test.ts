/**
 * Tests for Transak provider.
 */

import { describe, it, expect } from 'vitest';
import { TransakProvider } from '../src/providers/transak.js';
import type { TransakConfig } from '../src/providers/transak.js';

describe('TransakProvider', () => {
  const config: TransakConfig = {
    apiKey: 'test-api-key',
    environment: 'staging',
  };

  it('should create with config', () => {
    const provider = new TransakProvider(config);
    expect(provider.id).toBe('transak');
  });

  it('should return provider info', () => {
    const provider = new TransakProvider(config);
    const info = provider.getProviderInfo();
    expect(info.id).toBe('transak');
    expect(info.name).toBe('Transak');
    expect(info.supportedCurrencies).toContain('USD');
  });

  it('should generate widget URL', () => {
    const provider = new TransakProvider(config);
    const url = provider.getWidgetUrl({
      destinationAddress: '0x1234567890123456789012345678901234567890',
      defaultFiatAmount: 200,
      defaultFiatCurrency: 'GBP',
    });
    expect(url).toContain('transak.com');
    expect(url).toContain('0x1234567890123456789012345678901234567890');
  });

  it('should generate quote', async () => {
    const provider = new TransakProvider(config);
    const quote = await provider.getQuote({
      fiatCurrency: 'GBP',
      fiatAmount: 200,
      cryptoToken: 'BTC',
      chainId: 1,
      destinationAddress: '0x1234567890123456789012345678901234567890',
      userRegion: 'GB',
    });
    expect(quote.provider).toBe('transak');
    expect(quote.fiatAmount).toBe(200);
    expect(quote.cryptoToken).toBe('BTC');
  });

  it('should use staging URL by default', () => {
    const provider = new TransakProvider(config);
    const url = provider.getWidgetUrl({
      destinationAddress: '0xaddr',
    });
    expect(url).toContain('staging-global.transak.com');
  });

  it('should use production URL', () => {
    const provider = new TransakProvider({ ...config, environment: 'production' });
    const url = provider.getWidgetUrl({
      destinationAddress: '0xaddr',
    });
    expect(url).toContain('global.transak.com');
  });
});
