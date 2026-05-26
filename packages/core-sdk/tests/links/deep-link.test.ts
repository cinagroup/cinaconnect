/**
 * Deep Link tests.
 *
 * Tests cover registerWalletDeepLink and getAppStoreUrl.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateDeepLink,
  registerWalletDeepLink,
  getAppStoreUrl,
} from '../../src/links/deep-link.js';

/* ------------------------------------------------------------------ */
/*  registerWalletDeepLink                                             */
/* ------------------------------------------------------------------ */

describe('registerWalletDeepLink', () => {
  it('is a function', () => {
    expect(typeof registerWalletDeepLink).toBe('function');
  });

  it('registers a custom wallet deep link', () => {
    registerWalletDeepLink('custom-wallet', {
      scheme: 'customwallet://',
      pathTemplate: '/wc?uri={uri}',
      appStoreUrl: 'https://apps.apple.com/app/custom-wallet',
      playStoreUrl: 'https://play.google.com/store/apps/custom-wallet',
    });

    // Now generateDeepLink should work for the registered wallet
    const url = generateDeepLink({
      walletId: 'custom-wallet',
      uri: 'wc:test123',
    });
    expect(url).toContain('customwallet://');
    expect(url).toContain('wc%3Atest123');
  });

  it('registered wallet returns app store URLs', () => {
    registerWalletDeepLink('my-wallet', {
      scheme: 'mywallet://',
      appStoreUrl: 'https://apps.apple.com/app/my-wallet',
      playStoreUrl: 'https://play.google.com/store/apps/my-wallet',
    });

    const iosUrl = getAppStoreUrl('my-wallet', 'ios');
    expect(iosUrl).toBe('https://apps.apple.com/app/my-wallet');

    const androidUrl = getAppStoreUrl('my-wallet', 'android');
    expect(androidUrl).toBe('https://play.google.com/store/apps/my-wallet');
  });

  it('getAppStoreUrl returns undefined for unknown wallet', () => {
    expect(getAppStoreUrl('nonexistent-wallet', 'ios')).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  getAppStoreUrl                                                     */
/* ------------------------------------------------------------------ */

describe('getAppStoreUrl', () => {
  it('returns platform-specific URLs', () => {
    registerWalletDeepLink('test-appstore-wallet', {
      scheme: 'testapp://',
      appStoreUrl: 'https://ios.example.com/app',
      playStoreUrl: 'https://android.example.com/app',
    });

    expect(getAppStoreUrl('test-appstore-wallet', 'ios')).toBe('https://ios.example.com/app');
    expect(getAppStoreUrl('test-appstore-wallet', 'android')).toBe('https://android.example.com/app');
  });
});

/* ------------------------------------------------------------------ */
/*  generateDeepLink - additional coverage                             */
/* ------------------------------------------------------------------ */

describe('generateDeepLink', () => {
  it('uses pathTemplate for registered wallets', () => {
    registerWalletDeepLink('path-template-wallet', {
      scheme: 'pathwallet://',
      pathTemplate: '/connect?data={uri}',
      appStoreUrl: 'https://example.com/app',
      playStoreUrl: 'https://example.com/app',
    });

    const url = generateDeepLink({
      walletId: 'path-template-wallet',
      uri: 'wc:abc',
    });
    expect(url).toContain('pathwallet://');
    expect(url).toContain('/connect?data=');
  });

  it('throws for unknown wallet IDs', () => {
    expect(() => generateDeepLink({
      walletId: 'definitely-not-registered-xyz',
      uri: 'wc:test',
    })).toThrow('Unknown wallet ID');
  });

  it('includes additional query parameters', () => {
    registerWalletDeepLink('param-test', {
      scheme: 'paramtest://',
      appStoreUrl: 'https://example.com',
      playStoreUrl: 'https://example.com',
    });

    const url = generateDeepLink({
      walletId: 'param-test',
      uri: 'wc:hello',
      params: { extra: 'value', mode: 'dark' },
    });
    expect(url).toContain('extra=value');
    expect(url).toContain('mode=dark');
  });
});
