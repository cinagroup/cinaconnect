/**
 * Tests for Ramp provider.
 */

import { describe, it, expect } from 'vitest';
import { RampProvider } from '../src/providers/ramp.js';
import type { RampConfig } from '../src/providers/ramp.js';

describe('RampProvider', () => {
  const config: RampConfig = {
    apiKey: 'test-api-key',
  };

  it('should create with config', () => {
    const provider = new RampProvider(config);
    expect(provider.id).toBe('ramp');
  });

  it('should return provider info', () => {
    const provider = new RampProvider(config);
    const info = provider.getProviderInfo();
    expect(info.id).toBe('ramp');
    expect(info.name).toBe('Ramp');
    expect(info.supportedCurrencies).toContain('USD');
  });

  it('should generate widget URL', () => {
    const provider = new RampProvider(config);
    const url = provider.getWidgetUrl({
      destinationAddress: '0x1234567890123456789012345678901234567890',
      defaultFiatAmount: 50,
      defaultFiatCurrency: 'EUR',
    });
    expect(url).toContain('ramp.network');
    expect(url).toContain('0x1234567890123456789012345678901234567890');
  });

  it('should generate quote', async () => {
    const provider = new RampProvider(config);
    const quote = await provider.getQuote({
      fiatCurrency: 'EUR',
      fiatAmount: 50,
      cryptoToken: 'USDC',
      chainId: 1,
      destinationAddress: '0x1234567890123456789012345678901234567890',
      userRegion: 'GB',
    });
    expect(quote.provider).toBe('ramp');
    expect(quote.fiatAmount).toBe(50);
    expect(quote.fiatCurrency).toBe('EUR');
    expect(quote.cryptoToken).toBe('USDC');
  });

  it('should generate widget URL with different fiat currencies', () => {
    const provider = new RampProvider(config);
    const url = provider.getWidgetUrl({
      destinationAddress: '0x1234567890123456789012345678901234567890',
      defaultFiatAmount: 100,
      defaultFiatCurrency: 'GBP',
    });
    expect(url).toContain('GBP');
    expect(url).toContain('100');
  });

  it('should generate widget URL without optional params', () => {
    const provider = new RampProvider(config);
    const url = provider.getWidgetUrl({
      destinationAddress: '0x1234567890123456789012345678901234567890',
    });
    expect(url).toContain('ramp.network');
    expect(url).toContain('0x1234567890123456789012345678901234567890');
  });
});
