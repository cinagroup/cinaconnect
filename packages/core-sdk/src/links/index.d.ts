/**
 * Cinacoin Deep Linking Module
 *
 * Provides deep link generation, universal link support, and smart redirect
 * logic for wallet connections across iOS, Android, and web platforms.
 */
export { generateDeepLink, registerWalletDeepLink, getAppStoreUrl, WALLET_DEEP_LINKS } from './deep-link.js';
export { generateUniversalLink, generateWalletConnectUniversalLink } from './universal-link.js';
export { smartRedirect, detectPlatform } from './redirect.js';
export type { DeepLinkParams, Platform, RedirectResult, RedirectOptions, WalletDeepLinkConfig, UniversalLinkParams, } from './types.js';
//# sourceMappingURL=index.d.ts.map