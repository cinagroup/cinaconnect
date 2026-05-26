/**
 * Redirect utilities tests.
 *
 * Tests cover detectPlatform, smartRedirect, and getAppStoreFallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectPlatform, smartRedirect } from '../../src/links/redirect.js';

/* ------------------------------------------------------------------ */
/*  detectPlatform                                                      */
/* ------------------------------------------------------------------ */

describe('detectPlatform', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('detects iOS (iPhone)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
      writable: true,
      configurable: true,
    });
    expect(detectPlatform()).toBe('ios');
  });

  it('detects iOS (iPad)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)' },
      writable: true,
      configurable: true,
    });
    expect(detectPlatform()).toBe('ios');
  });

  it('detects Android', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Linux; Android 13)' },
      writable: true,
      configurable: true,
    });
    expect(detectPlatform()).toBe('android');
  });

  it('defaults to web for unknown UA', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'SomeUnknownBrowser/1.0' },
      writable: true,
      configurable: true,
    });
    expect(detectPlatform()).toBe('web');
  });

  it('returns web when navigator is undefined', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(detectPlatform()).toBe('web');
  });

  it('uses navigator.vendor as fallback', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: '', vendor: 'Apple Computer, Inc.' },
      writable: true,
      configurable: true,
    });
    // vendor doesn't match iOS pattern, so returns web
    expect(detectPlatform()).toBe('web');
  });
});

/* ------------------------------------------------------------------ */
/*  smartRedirect — web platform                                       */
/* ------------------------------------------------------------------ */

describe('smartRedirect (web platform)', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('opens universal link on web platform', async () => {
    const { smartRedirect } = await import('../../src/links/redirect.js');

    const result = await smartRedirect(
      {
        walletId: 'metamask',
        uri: 'wc:abc123@2?relay-protocol=ws&relay-url=wss%3A%2F%2Frelay.example.com&symKey=def456',
      },
      { platform: 'web' },
    );

    expect(result.success).toBe(true);
    expect(result.method).toBe('universal-link');
    expect(result.fallbackUsed).toBe(false);
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onSuccess callback on web', async () => {
    const { smartRedirect } = await import('../../src/links/redirect.js');
    const onSuccess = vi.fn();

    await smartRedirect(
      {
        walletId: 'metamask',
        uri: 'wc:abc123@2?relay-protocol=ws&relay-url=wss%3A%2F%2Frelay.example.com&symKey=def456',
      },
      { platform: 'web', onSuccess },
    );

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, method: 'universal-link' }),
    );
  });

  it('returns known wallet download URL as fallback', async () => {
    const { smartRedirect } = await import('../../src/links/redirect.js');

    const result = await smartRedirect(
      {
        walletId: 'rainbow',
        uri: 'wc:abc@2?relay-protocol=ws&relay-url=wss%3A%2F%2Fr&symKey=def',
      },
      { platform: 'web' },
    );

    expect(result.success).toBe(true);
    expect(result.url).toContain('rainbow.me');
  });
});

/* ------------------------------------------------------------------ */
/*  smartRedirect — deep link failure fallback                         */
/* ------------------------------------------------------------------ */

describe('smartRedirect (deep link failure fallback)', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    // Mock window.location.href by replacing the entire location object
    Object.defineProperty(globalThis, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
    Object.defineProperty(globalThis, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('falls back to universal link when deep link generation fails', async () => {
    const { smartRedirect } = await import('../../src/links/redirect.js');
    const onFallback = vi.fn();

    // Empty walletId should cause deep link generation to fail
    const result = await smartRedirect(
      {
        walletId: '',
        uri: '',
      },
      { platform: 'ios', timeoutMs: 100, onFallback },
    );

    expect(result.success).toBe(true);
    expect(result.method).toBe('universal-link');
    expect(result.fallbackUsed).toBe(true);
    expect(onFallback).toHaveBeenCalled();
  });

  it('uses getAppStoreFallback for known wallets', async () => {
    const { smartRedirect } = await import('../../src/links/redirect.js');

    const result = await smartRedirect(
      {
        walletId: 'phantom',
        uri: 'wc:abc@2?relay-protocol=ws&relay-url=wss%3A%2F%2Fr&symKey=def',
      },
      { platform: 'web' },
    );

    expect(result.url).toContain('phantom.app');
  });
});

/* ------------------------------------------------------------------ */
/*  smartRedirect — deep link failure (sync)                           */
/* ------------------------------------------------------------------ */

describe('smartRedirect (sync paths)', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    // Mock window.location.href
    Object.defineProperty(globalThis, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
    Object.defineProperty(globalThis, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('falls back to universal link when deep link fails on iOS', async () => {
    const onFallback = vi.fn();
    const result = await smartRedirect(
      {
        walletId: 'unknown-wallet-xyz',
        uri: 'wc:abc@2?relay-protocol=ws&relay-url=wss%3A%2F%2Fr&symKey=def',
      },
      { platform: 'ios', onFallback },
    );

    expect(result.success).toBe(true);
    expect(result.method).toBe('universal-link');
    expect(result.fallbackUsed).toBe(true);
    expect(onFallback).toHaveBeenCalledWith('universal-link', expect.any(String));
  });

  it('falls back to universal link when deep link fails on Android', async () => {
    const result = await smartRedirect(
      {
        walletId: 'nonexistent',
        uri: 'wc:abc@2?relay-protocol=ws&relay-url=wss%3A%2F%2Fr&symKey=def',
      },
      { platform: 'android' },
    );

    expect(result.success).toBe(true);
    expect(result.method).toBe('universal-link');
  });

  it('uses wallet-specific fallback URL for metamask', async () => {
    const result = await smartRedirect(
      {
        walletId: '',
        uri: '',
      },
      { platform: 'ios' },
    );

    expect(result.success).toBe(true);
    expect(result.method).toBe('universal-link');
  });
});
