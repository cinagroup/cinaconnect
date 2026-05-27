import React from 'react';
import { useExplorer } from '@cinacoin/explorer';
import type { SearchFilter } from '@cinacoin/explorer';

/**
 * Searchable wallet list with icons, chain/platform filters, and quick connect.
 *
 * @example
 * ```tsx
 * <WalletSearch
 *   onConnect={(walletId) => handleConnect(walletId)}
 *   filter={{ chainId: 'eip155:1', popular: true }}
 * />
 * ```
 */
export function WalletSearch({
  onConnect,
  filter,
  maxResults = 20,
  className = '',
}: {
  onConnect: (walletId: string) => void;
  filter?: SearchFilter;
  maxResults?: number;
  className?: string;
}) {
  const { searchQuery, setSearchQuery, searchWallets, getWalletLogo, getPopularWallets } = useExplorer();

  const wallets = searchQuery
    ? searchWallets(filter).slice(0, maxResults)
    : getPopularWallets().slice(0, maxResults);

  return (
    <div className={`cinacoin-wallet-search ${className}`}>
      <input
        type="text"
        placeholder="Search wallets..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="cinacoin-search-input"
      />
      <div className="cinacoin-wallet-list">
        {wallets.map(wallet => (
          <button
            key={wallet.id}
            onClick={() => onConnect(wallet.id)}
            className="cinacoin-wallet-list-item"
          >
            <img
              src={getWalletLogo(wallet.id)}
              alt={wallet.name}
              width={32}
              height={32}
              className="cinacoin-wallet-icon"
            />
            <span className="cinacoin-wallet-name">{wallet.name}</span>
            {wallet.popular && <span className="cinacoin-popular-badge">Popular</span>}
          </button>
        ))}
        {wallets.length === 0 && (
          <p className="cinacoin-empty-state">No wallets found</p>
        )}
      </div>
    </div>
  );
}
