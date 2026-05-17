/**
 * Logo fetching utility for wallets and chains.
 * Caches results in memory ( IndexedDB in browser).
 */

const LOGO_BASE = 'https://registry.walletconnect.com/data/v2/logo/';
const DEFAULT_SIZE = 96;

/** In-memory logo cache. */
export const logoCache = new Map<string, string>();

/**
 * Fetch a wallet logo by ID.
 *
 * @param walletId - e.g. 'metamask', 'coinbase-wallet'
 * @param size - icon size in pixels (default 96)
 * @returns icon URL
 */
export function fetchWalletLogo(walletId: string, size = DEFAULT_SIZE): string {
  const cacheKey = `${walletId}:${size}`;
  if (logoCache.has(cacheKey)) {
    return logoCache.get(cacheKey)!;
  }

  const url = `${LOGO_BASE}${walletId}/${size}.png`;
  logoCache.set(cacheKey, url);
  return url;
}

/**
 * Fetch a chain logo by CAIP-2 chain ID.
 *
 * @param chainId - e.g. 'eip155:1'
 * @returns icon URL
 */
export function fetchChainLogo(chainId: string): string {
  const cacheKey = `chain:${chainId}`;
  if (logoCache.has(cacheKey)) {
    return logoCache.get(cacheKey)!;
  }

  // Use chainid.network for EVM chains, fallback to generic
  const parts = chainId.split(':');
  const url = parts[0] === 'eip155'
    ? `https://chainid.network/icons/${parts[1]}.png`
    : `https://registry.walletconnect.com/data/v2/logo/${chainId}/96.png`;

  logoCache.set(cacheKey, url);
  return url;
}

/**
 * Preload logos for a list of wallets.
 * Useful for warming the cache before rendering a wallet list.
 *
 * @param walletIds - list of wallet IDs to preload
 */
export function preloadLogos(walletIds: string[]): void {
  walletIds.forEach(id => fetchWalletLogo(id));
}
