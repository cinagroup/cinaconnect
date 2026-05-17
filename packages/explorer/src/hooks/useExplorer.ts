import { useState, useMemo } from 'react';
import { registry } from '../registry';
import { fetchWalletLogo } from '../logoFetcher';
import type { WalletInfo, SearchFilter } from '../types';

/**
 * React hook for wallet/dApp discovery and logo fetching.
 *
 * @example
 * ```tsx
 * const { searchWallets, getWallet, getWalletLogo, getPopularWallets } = useExplorer();
 * ```
 */
export function useExplorer() {
  const [searchQuery, setSearchQuery] = useState('');

  const popularWallets = useMemo(() => registry.getPopularWallets(), []);

  const searchWallets = (filter?: SearchFilter): WalletInfo[] => {
    return registry.searchWallets({
      ...filter,
      query: searchQuery || filter?.query,
    });
  };

  const getWallet = (walletId: string): WalletInfo | undefined => {
    return registry.getWallet(walletId);
  };

  const getWalletLogo = (walletId: string, size = 96): string => {
    const cached = registry.getCachedLogo(walletId);
    if (cached) return cached;
    return fetchWalletLogo(walletId, size);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchWallets,
    getWallet,
    getWalletLogo,
    getPopularWallets: () => popularWallets,
  };
}
