/**
 * Smart redirect logic for wallet deep links.
 *
 * Detects platform (iOS/Android/Web), attempts deep link first,
 * falls back to universal link after timeout, then to QR code.
 */

import type { DeepLinkParams, Platform, RedirectOptions, RedirectResult } from './types.js';
import { generateDeepLink } from './deep-link.js';
import { generateUniversalLink, generateWalletConnectUniversalLink } from './universal-link.js';

/**
 * Detect the current platform.
 *
 * Uses navigator.userAgent on web, or React Native's Platform module.
 *
 * @returns Detected platform.
 */
export function detectPlatform(): Platform {
  // React Native detection.
  if (typeof navigator === 'undefined' && typeof global !== 'undefined') {
    // We're in React Native — platform is determined by the host app.
    // The caller should pass this explicitly in a React Native context.
    return 'web'; // Default fallback
  }

  // Web browser detection.
  const ua = navigator.userAgent || navigator.vendor || '';

  if (/iPad|iPhone|iPod/.test(ua) && !((window as unknown) as Record<string, unknown>).MSStream) {
    return 'ios';
  }

  if (/android/i.test(ua)) {
    return 'android';
  }

  return 'web';
}

/**
 * Smart redirect handler.
 *
 * Tries deep link first → timeout → universal link → fallback to QR code.
 *
 * @param params - Deep link parameters.
 * @param options - Redirect options including platform and callbacks.
 * @returns Promise resolving with the redirect result.
 */
export function smartRedirect(
  params: DeepLinkParams,
  options: RedirectOptions,
): Promise<RedirectResult> {
  return new Promise((resolve, reject) => {
    const { platform, timeoutMs = 1500, onFallback, onSuccess, onError } = options;
    const fallbackTimeout = params.fallbackTimeoutMs ?? timeoutMs;

    let resolved = false;
    let fallbackTriggered = false;

    const tryResolve = (result: RedirectResult) => {
      if (resolved) return;
      resolved = true;
      onSuccess?.(result);
      resolve(result);
    };

    const tryReject = (error: Error) => {
      if (resolved) return;
      resolved = true;
      onError?.(error);
      reject(error);
    };

    // On web platform, just open the universal link directly.
    if (platform === 'web') {
      const universalUrl = generateWalletConnectUniversalLink(
        params.walletId,
        params.uri,
        getAppStoreFallback(params.walletId),
      );
      tryResolve({
        success: true,
        method: 'universal-link',
        url: universalUrl,
        fallbackUsed: false,
      });
      window.open(universalUrl, '_blank');
      return;
    }

    // Step 1: Try the deep link.
    let deepLinkUrl: string;
    try {
      deepLinkUrl = generateDeepLink(params);
    } catch (e) {
      // If deep link generation fails, go straight to universal link.
      const universalUrl = generateWalletConnectUniversalLink(
        params.walletId,
        params.uri,
        getAppStoreFallback(params.walletId),
      );
      onFallback?.('universal-link', universalUrl);
      tryResolve({
        success: true,
        method: 'universal-link',
        url: universalUrl,
        fallbackUsed: true,
      });
      window.location.href = universalUrl;
      return;
    }

    // Attempt deep link navigation.
    window.location.href = deepLinkUrl;

    // Step 2: Set timeout fallback.
    const fallbackTimer = setTimeout(() => {
      fallbackTriggered = true;

      // Step 3: Try universal link as fallback.
      const universalUrl = generateWalletConnectUniversalLink(
        params.walletId,
        params.uri,
        getAppStoreFallback(params.walletId),
      );

      onFallback?.('universal-link', universalUrl);
      tryResolve({
        success: true,
        method: 'universal-link',
        url: universalUrl,
        fallbackUsed: true,
      });

      window.location.href = universalUrl;

      // Step 4: If universal link also doesn't work after another timeout,
      // suggest QR code as final fallback.
      setTimeout(() => {
        if (!resolved) {
          onFallback?.('qr-code', '');
          tryResolve({
            success: false,
            method: 'qr-code',
            url: '',
            fallbackUsed: true,
            error: 'App not detected. Please scan the QR code instead.',
          });
        }
      }, fallbackTimeout);
    }, fallbackTimeout);

    // Listen for page visibility change (user returned from app = success).
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && fallbackTriggered) {
        clearTimeout(fallbackTimer);
        // User came back to the browser after being redirected to the app.
        tryResolve({
          success: true,
          method: 'deep-link',
          url: deepLinkUrl,
          fallbackUsed: false,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: remove listener after resolution.
    const originalResolve = resolve;
    const wrappedResolve = (result: RedirectResult) => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(fallbackTimer);
      originalResolve(result);
    };

    // Override resolve to include cleanup.
    const originalReject = reject;
    const wrappedReject = (error: Error) => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(fallbackTimer);
      originalReject(error);
    };
  });
}

/**
 * Get the appropriate app store fallback URL for a wallet.
 *
 * @param walletId - Wallet identifier.
 * @returns App store URL or undefined.
 */
function getAppStoreFallback(walletId: string): string | undefined {
  const storeUrls: Record<string, string> = {
    metamask: 'https://metamask.io/download/',
    rainbow: 'https://rainbow.me/download',
    coinbase: 'https://www.coinbase.com/wallet/downloads',
    trust: 'https://trustwallet.com/download',
    phantom: 'https://phantom.app/download',
    zerion: 'https://zerion.io/download',
  };
  return storeUrls[walletId];
}
