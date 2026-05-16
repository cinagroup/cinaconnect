/**
 * Wallet Registry — Known wallet deep link schemes and metadata.
 *
 * Provides wallet discovery data for the connect modal, including
 * deep link schemes, universal links, and app store URLs for
 * major mobile wallets.
 */

import type { WalletRegistryEntry } from './types.js';

/**
 * Registry of well-known wallets with their deep link schemes,
 * universal links, and app store URLs.
 */
export const WALLET_REGISTRY: ReadonlyArray<WalletRegistryEntry> = [
  {
    id: 'metamask',
    name: 'MetaMask',
    homepage: 'https://metamask.io',
    deepLink: 'metamask://',
    universalLink: 'https://metamask.app.link',
    appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
    imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/metamask',
    supportsWcV2: true,
    chains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10', 'eip155:56'],
    rdns: 'io.metamask',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    homepage: 'https://rainbow.me',
    deepLink: 'rainbow://',
    universalLink: 'https://rnbwapp.com',
    appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
    imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/rainbow',
    supportsWcV2: true,
    chains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10', 'eip155:8453'],
    rdns: 'me.rainbow',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    homepage: 'https://www.coinbase.com/wallet',
    deepLink: 'cbwallet://',
    universalLink: 'https://go.cb-w.com',
    appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
    imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/coinbase',
    supportsWcV2: true,
    chains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10', 'eip155:8453', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    rdns: 'com.coinbase.wallet',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    homepage: 'https://trustwallet.com',
    deepLink: 'trust://',
    universalLink: 'https://link.trustwallet.com',
    appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/trust',
    supportsWcV2: true,
    chains: ['eip155:1', 'eip155:56', 'eip155:137', 'eip155:43114', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    rdns: 'com.trustwallet.app',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    homepage: 'https://phantom.app',
    deepLink: 'phantom://',
    universalLink: 'https://phantom.app',
    appStoreUrl: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phantom.app',
    imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/phantom',
    supportsWcV2: true,
    chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'eip155:1', 'eip155:137'],
    rdns: 'app.phantom',
  },
  {
    id: 'zerion',
    name: 'Zerion',
    homepage: 'https://zerion.io',
    deepLink: 'zerion://',
    universalLink: 'https://app.zerion.io',
    appStoreUrl: 'https://apps.apple.com/app/zerion/id1456732164',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.zerion.android',
    imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/zerion',
    supportsWcV2: true,
    chains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10'],
    rdns: 'io.zerion.wallet',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    homepage: 'https://walletconnect.com',
    deepLink: 'wc://',
    universalLink: 'https://walletconnect.com',
    imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/walletconnect',
    supportsWcV2: true,
    chains: ['eip155:1', 'eip155:137', 'eip155:42161'],
  },
  {
    id: 'rabby',
    name: 'Rabby',
    homepage: 'https://rabby.io',
    deepLink: 'rabby://',
    imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/rabby',
    supportsWcV2: true,
    chains: ['eip155:1', 'eip155:137', 'eip155:42161'],
    rdns: 'io.rabby',
  },
];

/**
 * Get a wallet entry by ID.
 *
 * @param id - Wallet ID.
 * @returns Wallet entry or undefined.
 */
export function getWalletById(id: string): WalletRegistryEntry | undefined {
  return WALLET_REGISTRY.find((w) => w.id === id);
}

/**
 * Build a deep link URL for a wallet with a WC v2 URI.
 *
 * @param walletId - Wallet ID.
 * @param wcUri - WalletConnect v2 URI.
 * @returns Deep link URL or undefined.
 */
export function buildWalletDeepLink(walletId: string, wcUri: string): string | undefined {
  const wallet = getWalletById(walletId);
  if (!wallet || !wallet.deepLink) return undefined;

  return `${wallet.deepLink}wc?uri=${encodeURIComponent(wcUri)}`;
}

/**
 * Build a universal link URL for a wallet with a WC v2 URI.
 *
 * @param walletId - Wallet ID.
 * @param wcUri - WalletConnect v2 URI.
 * @returns Universal link URL or undefined.
 */
export function buildWalletUniversalLink(walletId: string, wcUri: string): string | undefined {
  const wallet = getWalletById(walletId);
  if (!wallet || !wallet.universalLink) return undefined;

  return `${wallet.universalLink}/wc?uri=${encodeURIComponent(wcUri)}`;
}

/**
 * Get wallets that support a specific chain.
 *
 * @param chain - CAIP-2 chain ID (e.g., 'eip155:1').
 * @returns Array of wallet entries that support the chain.
 */
export function getWalletsForChain(chain: string): WalletRegistryEntry[] {
  return WALLET_REGISTRY.filter(
    (w) => w.chains?.includes(chain) ?? false,
  );
}
