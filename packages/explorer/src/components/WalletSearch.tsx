import React from 'react';
import { useExplorer } from '@cinaconnect/explorer';
import type { SearchFilter } from '@cinaconnect/explorer';

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
    <div className={`cinaconnect-wallet-search ${className}`}>
      <input
        type="text"
        placeholder="Search wallets..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="cinaconnect-search-input"
      />
      <div className="cinaconnect-wallet-list">
        {wallets.map(wallet => (
          <button
            key={wallet.id}
            onClick={() => onConnect(wallet.id)}
            className="cinaconnect-wallet-list-item"
          >
            <img
              src={getWalletLogo(wallet.id)}
              alt={wallet.name}
              width={32}
              height={32}
              className="cinaconnect-wallet-icon"
            />
            <span className="cinaconnect-wallet-name">{wallet.name}</span>
            {wallet.popular && <span className="cinaconnect-popular-badge">Popular</span>}
          </button>
        ))}
        {wallets.length === 0 && (
          <p className="cinaconnect-empty-state">No wallets found</p>
        )}
      </div>
    </div>
  );
}
