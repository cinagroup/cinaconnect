/**
 * Deep link URL generation for wallet apps.
 *
 * Supports MetaMask, WalletConnect, Rainbow, Coinbase Wallet, and custom schemes.
 */

import type { DeepLinkParams, WalletDeepLinkConfig } from './types';

/** Built-in wallet deep link configurations. */
export const WALLET_DEEP_LINKS: Record<string, WalletDeepLinkConfig> = {
  metamask: {
    scheme: 'metamask://',
    universalDomain: 'metamask.app.link',
    appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
    pathTemplate: '/wc?uri={uri}',
  },
  walletconnect: {
    scheme: 'wc://',
    universalDomain: 'walletconnect.com',
    pathTemplate: '/wc?uri={uri}',
  },
  rainbow: {
    scheme: 'rainbow://',
    universalDomain: 'rnbwapp.com',
    appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
    pathTemplate: '/wc?uri={uri}',
  },
  coinbase: {
    scheme: 'cbwallet://',
    universalDomain: 'go.cb-w.com',
    appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
    pathTemplate: '/wc?uri={uri}',
  },
  trust: {
    scheme: 'trust://',
    universalDomain: 'link.trustwallet.com',
    appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    pathTemplate: '/wc?uri={uri}',
  },
  phantom: {
    scheme: 'phantom://',
    universalDomain: 'phantom.app',
    appStoreUrl: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=app.phantom',
    pathTemplate: '/wc?uri={uri}',
  },
  zerion: {
    scheme: 'zerion://',
    universalDomain: 'links.zerion.io',
    appStoreUrl: 'https://apps.apple.com/app/zerion-crypto-web3-wallet/id1456732032',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.zerion.android',
    pathTemplate: '/wc?uri={uri}',
  },
};

/**
 * Generate a deep link URL for a specific wallet.
 *
 * @param params - Deep link parameters including wallet ID and URI.
 * @returns The complete deep link URL string.
 * @throws Error if the wallet ID is not recognized.
 */
export function generateDeepLink(params: DeepLinkParams): string {
  const { walletId, uri, params: queryParams } = params;
  const config = WALLET_DEEP_LINKS[walletId];

  if (!config) {
    throw new Error(`Unknown wallet ID: ${walletId}. Register it in WALLET_DEEP_LINKS.`);
  }

  let url = config.scheme;

  // Apply path template if available.
  if (config.pathTemplate) {
    url += config.pathTemplate.replace('{uri}', encodeURIComponent(uri));
  } else {
    // Default: append URI as query parameter.
    url += `?uri=${encodeURIComponent(uri)}`;
  }

  // Append additional query parameters.
  if (queryParams && Object.keys(queryParams).length > 0) {
    const separator = url.includes('?') ? '&' : '?';
    const qs = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    url += separator + qs;
  }

  return url;
}

/**
 * Register a custom wallet deep link configuration.
 *
 * @param walletId - Unique wallet identifier.
 * @param config - Deep link configuration for the wallet.
 */
export function registerWalletDeepLink(walletId: string, config: WalletDeepLinkConfig): void {
  WALLET_DEEP_LINKS[walletId] = config;
}

/**
 * Get the app store URL for a wallet on a given platform.
 *
 * @param walletId - Wallet identifier.
 * @param platform - Target platform ('ios' or 'android').
 * @returns App store URL or undefined if not available.
 */
export function getAppStoreUrl(walletId: string, platform: 'ios' | 'android'): string | undefined {
  const config = WALLET_DEEP_LINKS[walletId];
  if (!config) return undefined;
  return platform === 'ios' ? config.appStoreUrl : config.playStoreUrl;
}
