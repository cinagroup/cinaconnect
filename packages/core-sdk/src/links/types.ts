/**
 * Deep Linking & Universal Link types.
 */

/** Platform detection result for redirect decisions. */
export type Platform = 'ios' | 'android' | 'web';

/** Parameters for generating a deep link. */
export interface DeepLinkParams {
  /** Wallet identifier (e.g., 'metamask', 'walletconnect', 'rainbow'). */
  walletId: string;
  /** URI to pass to the wallet (e.g., WalletConnect URI, transaction request). */
  uri: string;
  /** Additional query parameters to append to the deep link. */
  params?: Record<string, string>;
  /** Timeout in milliseconds before falling back (default: 1500). */
  fallbackTimeoutMs?: number;
}

/** Configuration for a specific wallet's deep link scheme. */
export interface WalletDeepLinkConfig {
  /** URL scheme prefix (e.g., 'metamask://', 'rainbow://'). */
  scheme: string;
  /** Universal link domain for fallback (e.g., 'metamask.app.link'). */
  universalDomain?: string;
  /** App Store URL if the wallet app is not installed. */
  appStoreUrl?: string;
  /** Google Play URL for Android. */
  playStoreUrl?: string;
  /** Path template for the deep link (e.g., '/wc?uri={uri}'). */
  pathTemplate?: string;
}

/** Result of a redirect attempt. */
export interface RedirectResult {
  /** Whether the redirect was initiated successfully. */
  success: boolean;
  /** Method used for the redirect. */
  method: 'deep-link' | 'universal-link' | 'app-store' | 'qr-code';
  /** The URL that was used. */
  url: string;
  /** Whether the fallback was triggered. */
  fallbackUsed: boolean;
  /** Error message if the redirect failed. */
  error?: string;
}

/** Universal link generation params. */
export interface UniversalLinkParams {
  walletId: string;
  uri: string;
  params?: Record<string, string>;
}

/** Redirect handler options. */
export interface RedirectOptions {
  /** Target platform. */
  platform: Platform;
  /** Timeout before falling back to the next method (ms). */
  timeoutMs?: number;
  /** Callback invoked when fallback is triggered. */
  onFallback?: (method: RedirectResult['method'], url: string) => void;
  /** Callback invoked on success. */
  onSuccess?: (result: RedirectResult) => void;
  /** Callback invoked on failure. */
  onError?: (error: Error) => void;
}
