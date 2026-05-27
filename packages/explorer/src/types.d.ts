/**
 * @fileoverview Type definitions for @cinacoin/explorer
 * Core data shapes used across wallet, dApp, and chain discovery.
 */
/** Platform where a wallet can be used. */
export type WalletPlatform = 'browser' | 'mobile' | 'desktop' | 'extension';
/** Deep-link configuration for launching a wallet. */
export interface WalletDeepLinks {
    /** Native app scheme, e.g. `metamask://` */
    native?: string;
    /** Universal HTTPS link, e.g. `https://metamask.app.link/...` */
    universal?: string;
}
/** Metadata for a single wallet entry in the registry. */
export interface WalletInfo {
    /**
     * Unique slug identifier, e.g. `'metamask'`, `'rainbow'`, `'coinbase-wallet'`
     */
    id: string;
    /** Human-readable wallet name. */
    name: string;
    /**
     * Icon URL or inline data URI.  Resolved at runtime by {@link LogoFetcher}.
     */
    icon: string;
    /** Platforms where this wallet is available. */
    platforms: WalletPlatform[];
    /**
     * CAIP-2 chain IDs the wallet supports, e.g.
     * `['eip155:1', 'eip155:137', 'eip155:8453']`.
     */
    supportedChains: string[];
    /**
     * Reverse Domain Name Identification string (EIP-6963).
     * Example: `io.metamask`
     */
    rdns?: string;
    /** Deep-link configuration for launching the wallet app. */
    deepLinks?: WalletDeepLinks;
    /** Short description shown in search results. */
    description?: string;
    /** Official homepage URL. */
    homepage?: string;
    /**
     * Whether this wallet is in the "popular" tier (top ~20 by usage).
     * Used for {@link Registry.getPopularWallets}.
     */
    popular?: boolean;
}
/** Category classification for a dApp. */
export type DappCategory = 'defi' | 'nft' | 'gaming' | 'social' | 'dao' | 'marketplace' | 'lending' | 'dex' | 'bridge' | 'other';
/** Metadata for a known dApp. */
export interface DappInfo {
    /** Unique slug, e.g. `'uniswap'`, `'opensea'`. */
    id: string;
    /** Human-readable name. */
    name: string;
    /** dApp icon URL or data URI. */
    icon: string;
    /** HTTPS URL of the dApp. */
    url: string;
    /** Category classification. */
    category: DappCategory;
    /** CAIP-2 chains the dApp operates on. */
    supportedChains: string[];
    /** Short tagline. */
    description?: string;
}
/** Block-explorer definition for a chain. */
export interface BlockExplorer {
    name: string;
    url: string;
    apiUrl?: string;
}
/** Extended chain metadata beyond @cinacoin/chains. */
export interface ChainInfo {
    /** CAIP-2 chain ID, e.g. `'eip155:1'`. */
    id: string;
    /** CAIP chain namespace, e.g. `'eip155'`. */
    namespace: string;
    /** Numeric chain ID, e.g. `1`. */
    chainId: number;
    /** Human-readable name, e.g. `'Ethereum Mainnet'`. */
    name: string;
    /** Short name / ticker symbol. */
    shortName?: string;
    /** Native currency symbol, e.g. `'ETH'`. */
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
    /** Icon URL or data URI for the chain. */
    icon?: string;
    /** Whether the chain is a testnet. */
    testnet?: boolean;
    /** Block explorers configured for this chain. */
    explorers?: BlockExplorer[];
    /** Faucet URLs (relevant for testnets). */
    faucets?: string[];
    /** RPC endpoint URLs. */
    rpcUrls?: string[];
}
/** Union type for any entry stored in the registry. */
export type RegistryEntry = WalletInfo | DappInfo | ChainInfo;
/** Discriminated union tag used by the generic registry store. */
export type RegistryEntryType = 'wallet' | 'dapp' | 'chain';
/** Search result envelope. */
export interface SearchResult<T extends RegistryEntry> {
    item: T;
    score: number;
    type: RegistryEntryType;
}
/** Filter options for wallet search. */
export interface WalletFilter {
    /** Limit results to wallets supporting this chain ID. */
    chainId?: string;
    /** Limit results to wallets available on this platform. */
    platform?: WalletPlatform;
}
//# sourceMappingURL=types.d.ts.map