import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useExplorer } from '@cinacoin/explorer';
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
export function WalletSearch({ onConnect, filter, maxResults = 20, className = '', }) {
    const { searchQuery, setSearchQuery, searchWallets, getWalletLogo, getPopularWallets } = useExplorer();
    const wallets = searchQuery
        ? searchWallets(filter).slice(0, maxResults)
        : getPopularWallets().slice(0, maxResults);
    return (_jsxs("div", { className: `cinacoin-wallet-search ${className}`, children: [_jsx("input", { type: "text", placeholder: "Search wallets...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), className: "cinacoin-search-input" }), _jsxs("div", { className: "cinacoin-wallet-list", children: [wallets.map(wallet => (_jsxs("button", { onClick: () => onConnect(wallet.id), className: "cinacoin-wallet-list-item", children: [_jsx("img", { src: getWalletLogo(wallet.id), alt: wallet.name, width: 32, height: 32, className: "cinacoin-wallet-icon" }), _jsx("span", { className: "cinacoin-wallet-name", children: wallet.name }), wallet.popular && _jsx("span", { className: "cinacoin-popular-badge", children: "Popular" })] }, wallet.id))), wallets.length === 0 && (_jsx("p", { className: "cinacoin-empty-state", children: "No wallets found" }))] })] }));
}
//# sourceMappingURL=WalletSearch.js.map