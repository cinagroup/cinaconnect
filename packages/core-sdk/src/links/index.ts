/**
 * OnChainUX Deep Linking Module
 *
 * Provides deep link generation, universal link support, and smart redirect
 * logic for wallet connections across iOS, Android, and web platforms.
 */

export { generateDeepLink, registerWalletDeepLink, getAppStoreUrl, WALLET_DEEP_LINKS } from './deep-link';
export { generateUniversalLink, generateWalletConnectUniversalLink } from './universal-link';
export { smartRedirect, detectPlatform } from './redirect';
export type {
  DeepLinkParams,
  Platform,
  RedirectResult,
  RedirectOptions,
  WalletDeepLinkConfig,
  UniversalLinkParams,
} from './types';
