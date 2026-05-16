/**
 * Universal Link (iOS) / App Link (Android) support.
 *
 * Universal links provide a fallback when deep links fail — they open the
 * native app if installed, or fall back to the app store / web.
 */

/** Parameters for generating a universal link. */
export interface UniversalLinkParams {
  /** Universal link domain (e.g., 'metamask.app.link'). */
  domain: string;
  /** Path within the universal link (e.g., '/wc'). */
  path: string;
  /** Query parameters to include in the URL. */
  params?: Record<string, string>;
  /** Fallback URL if the app is not installed (typically app store or web). */
  fallbackUrl?: string;
}

/**
 * Generate a Universal Link URL for iOS or Android.
 *
 * Universal links are HTTPS URLs that iOS/Android route to the native app
 * if installed, otherwise they open in the browser (and can redirect to
 * the app store via the fallback URL).
 *
 * @param params - Universal link parameters.
 * @returns The complete universal link URL.
 */
export function generateUniversalLink(params: UniversalLinkParams): string {
  const { domain, path, params: queryParams, fallbackUrl } = params;

  let url = `https://${domain}${path}`;

  if (queryParams && Object.keys(queryParams).length > 0) {
    const qs = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    url += `?${qs}`;
  }

  // Some universal link providers support a fallback URL parameter.
  if (fallbackUrl) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}fallback=${encodeURIComponent(fallbackUrl)}`;
  }

  return url;
}

/**
 * Generate a WalletConnect v2 universal link.
 *
 * This is a convenience wrapper for the most common use case.
 *
 * @param walletId - Wallet identifier (e.g., 'metamask', 'rainbow').
 * @param wcUri - WalletConnect URI (wc:...).
 * @param fallbackUrl - URL to open if wallet app is not installed.
 * @returns Universal link URL.
 */
export function generateWalletConnectUniversalLink(
  walletId: string,
  wcUri: string,
  fallbackUrl?: string,
): string {
  const domainMap: Record<string, string> = {
    metamask: 'metamask.app.link',
    rainbow: 'rnbwapp.com',
    coinbase: 'go.cb-w.com',
    walletconnect: 'walletconnect.com',
    trust: 'link.trustwallet.com',
    phantom: 'phantom.app',
    zerion: 'links.zerion.io',
  };

  const domain = domainMap[walletId] || 'walletconnect.com';

  return generateUniversalLink({
    domain,
    path: '/wc',
    params: { uri: wcUri },
    fallbackUrl,
  });
}
