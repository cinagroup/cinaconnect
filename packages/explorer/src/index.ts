/**
 * @cinacoin/explorer
 *
 * Wallet/dApp discovery, logo fetching, and registry for 600+ wallets.
 *
 * @example
 * ```ts
 * import { registry, useExplorer, WalletSearch } from '@cinacoin/explorer';
 *
 * // Search wallets
 * const wallets = registry.search('meta', 'wallet');
 *
 * // Get wallet details
 * const metamask = registry.getWallet('metamask');
 *
 * // Get wallets for a specific chain
 * const ethWallets = registry.getWalletsForChain('eip155:1');
 * ```
 */

export { WalletRegistry } from './registry';
export { fetchWalletLogo, fetchChainLogo, logoCache } from './logoFetcher';
export { useExplorer } from './hooks/useExplorer';
export { WalletSearch } from './components/WalletSearch';
export type {
  WalletInfo,
  DappInfo,
  ChainInfo,
  RegistryEntry,
  Platform,
  DeepLinks,
  SearchFilter,
} from './types';
