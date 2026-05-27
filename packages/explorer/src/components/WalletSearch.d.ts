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
export declare function WalletSearch({ onConnect, filter, maxResults, className, }: {
    onConnect: (walletId: string) => void;
    filter?: SearchFilter;
    maxResults?: number;
    className?: string;
}): JSX.Element;
//# sourceMappingURL=WalletSearch.d.ts.map