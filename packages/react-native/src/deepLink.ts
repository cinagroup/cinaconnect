/**
 * deepLink.ts — DeepLinkManager for @cinacoin/react-native
 *
 * Singleton deep-link manager that handles custom URI schemes,
 * wallet app redirects, and return-callback listening via
 * React Native's `Linking` API.
 *
 * Supported wallets:
 *   - MetaMask   (metamask://)
 *   - Rainbow    (rainbow://)
 *   - Trust      (trust://)
 *   - Coinbase   (cbwallet://)
 *   - WalletConnect (wc:)
 */

import { Linking, Platform } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Wallet deep-link configuration. */
export interface WalletSchemeConfig {
  /** Wallet identifier (e.g. 'metamask', 'rainbow'). */
  walletId: string;
  /** Display name. */
  name: string;
  /** Custom URI scheme prefix (e.g. 'metamask://'). */
  scheme: string;
  /** WalletConnect sub-path inside the scheme (e.g. '/wc?uri='). */
  wcPath?: string;
  /** Universal-link domain for fallback (e.g. 'metamask.app.link'). */
  universalLinkDomain?: string;
  /** App Store URL. */
  appStoreUrl?: string;
  /** Google Play URL. */
  playStoreUrl?: string;
}

/** Result of a deep-link open attempt. */
export interface DeepLinkResult {
  /** Whether the link was successfully opened. */
  success: boolean;
  /** Method used to open ('deep-link', 'universal-link', 'app-store'). */
  method: string;
  /** The URL that was opened. */
  url: string;
  /** Error message if unsuccessful. */
  error?: string;
}

/** Parsed deep-link payload. */
export interface ParsedDeepLink {
  /** Original URL string. */
  url: string;
  /** Wallet ID if extracted (e.g. 'metamask'). */
  walletId?: string;
  /** Action if extracted (e.g. 'wc', 'dapp', 'wc?uri='). */
  action?: string;
  /** URI parameter (WalletConnect pairing URI). */
  uri?: string;
  /** Return URL embedded by the calling dApp. */
  returnUrl?: string;
  /** Raw parsed query parameters. */
  params: Record<string, string>;
}

// ─── Wallet Registry ────────────────────────────────────────────────────────

/**
 * Built-in wallet deep-link configurations.
 * Keys are wallet IDs; values are scheme + URL patterns.
 */
const WALLET_SCHEMES: Record<string, WalletSchemeConfig> = {
  metamask: {
    walletId: 'metamask',
    name: 'MetaMask',
    scheme: 'metamask://',
    wcPath: '/wc?uri=',
    universalLinkDomain: 'metamask.app.link',
    appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
  },
  rainbow: {
    walletId: 'rainbow',
    name: 'Rainbow',
    scheme: 'rainbow://',
    wcPath: '/wc?uri=',
    universalLinkDomain: 'rnbwapp.com',
    appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
  },
  trust: {
    walletId: 'trust',
    name: 'Trust Wallet',
    scheme: 'trust://',
    wcPath: '/wc?uri=',
    universalLinkDomain: 'link.trustwallet.com',
    appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
  },
  coinbase: {
    walletId: 'coinbase',
    name: 'Coinbase Wallet',
    scheme: 'cbwallet://',
    wcPath: '/wc?uri=',
    universalLinkDomain: 'go.cb-w.com',
    appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
  },
  walletconnect: {
    walletId: 'walletconnect',
    name: 'WalletConnect',
    scheme: 'wc:',
    wcPath: '',
    universalLinkDomain: 'walletconnect.com',
  },
};

// ─── DeepLinkManager ────────────────────────────────────────────────────────

/**
 * Singleton manager for deep-link operations in React Native.
 *
 * Usage:
 * ```ts
 * const dl = DeepLinkManager.getInstance();
 * await dl.init('cinacoin://');
 *
 * const url = dl.buildWalletUrl('metamask', 'wc', { uri: 'wc:...' });
 * await dl.openWallet(url);
 * ```
 */
export class DeepLinkManager {
  /** Singleton instance. */
  private static _instance: DeepLinkManager | null = null;

  /** Registered custom URI scheme for this app. */
  private _appScheme: string | null = null;

  /** Additional wallet schemes registered at runtime. */
  private _customSchemes: Record<string, WalletSchemeConfig> = {};

  /** Whether the manager has been initialised. */
  private _initialised = false;

  /** Subscription token for the Linking event listener. */
  private _linkingSubscription: { remove: () => void } | null = null;

  /** Callback fired when a deep link is received. */
  private _onLinkCallback: ((url: string) => void) | null = null;

  /** Callback fired when the user returns from a wallet app. */
  private _onReturnCallback: ((url: string) => void) | null = null;

  /** Pending action awaiting a return from a wallet. */
  private _pendingAction: { walletId: string; returnUrl: string; ts: number } | null = null;

  private constructor() {}

  /** Get (or create) the singleton instance. */
  static getInstance(): DeepLinkManager {
    if (!DeepLinkManager._instance) {
      DeepLinkManager._instance = new DeepLinkManager();
    }
    return DeepLinkManager._instance;
  }

  /** Reset the singleton (primarily for testing). */
  static resetInstance(): void {
    if (DeepLinkManager._instance?._linkingSubscription) {
      DeepLinkManager._instance._linkingSubscription.remove();
    }
    DeepLinkManager._instance = null;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Initialise the deep-link manager.
   *
   * Registers the app's own URI scheme so that wallets can return to it,
   * and sets up the `Linking` event listener.
   *
   * @param scheme — The custom URI scheme for this app (e.g. `cinacoin://`).
   */
  async init(scheme: string): Promise<void> {
    if (this._initialised) return;

    this._appScheme = scheme;

    // Set up event listener for incoming deep links
    this._linkingSubscription = Linking.addEventListener('url', this._handleIncomingLink);

    // Check if the app was launched via deep link
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      this._handleIncomingLink({ url: initialUrl });
    }

    this._initialised = true;
  }

  /** Tear down listeners. */
  destroy(): void {
    this._linkingSubscription?.remove();
    this._linkingSubscription = null;
    this._onLinkCallback = null;
    this._onReturnCallback = null;
    this._pendingAction = null;
    this._initialised = false;
  }

  // ── Scheme registration ─────────────────────────────────────────────────

  /**
   * Register a custom wallet URI scheme at runtime.
   *
   * @param config — Wallet scheme configuration.
   */
  registerScheme(config: WalletSchemeConfig): void {
    this._customSchemes[config.walletId] = { ...config };
  }

  /** Get the resolved config for a wallet ID. */
  getWalletConfig(walletId: string): WalletSchemeConfig | undefined {
    return this._customSchemes[walletId] ?? WALLET_SCHEMES[walletId];
  }

  /** List all known wallet IDs (built-in + custom). */
  listWallets(): string[] {
    return [...new Set([...Object.keys(WALLET_SCHEMES), ...Object.keys(this._customSchemes)])];
  }

  // ── URL handling ────────────────────────────────────────────────────────

  /**
   * Parse an incoming deep-link URL into structured data.
   *
   * Recognises common patterns:
   *   - `wc:<pairing_uri>` → WalletConnect URI
   *   - `<scheme>://wc?uri=<encoded_wc_uri>` → Wallet app redirect
   *   - `<scheme>://dapp?...` → Generic dApp action
   */
  handleUrl(url: string): ParsedDeepLink {
    const parsed: ParsedDeepLink = {
      url,
      params: {},
    };

    try {
      // WalletConnect bare URI: wc:abc123...
      if (url.startsWith('wc:')) {
        parsed.action = 'wc';
        parsed.uri = url;
        return parsed;
      }

      const u = new URL(url);
      const host = u.hostname;
      const pathname = u.pathname;
      const scheme = u.protocol.replace(':', '');

      // Detect wallet by scheme
      for (const [id, cfg] of Object.entries(this._getAllSchemes())) {
        if (scheme === cfg.scheme.replace('://', '').replace(':', '')) {
          parsed.walletId = id;
          break;
        }
      }

      // Extract `uri` query parameter (standard WalletConnect relay)
      const uriParam = u.searchParams.get('uri');
      if (uriParam) {
        parsed.uri = uriParam;
        parsed.action = 'wc';
      } else if (pathname.includes('wc') || pathname.includes('/wc')) {
        parsed.action = 'wc';
      }

      // Extract return URL
      const ret = u.searchParams.get('returnUrl') ?? u.searchParams.get('redirect');
      if (ret) {
        parsed.returnUrl = ret;
      }

      // Collect remaining query params
      u.searchParams.forEach((value, key) => {
        if (key !== 'uri' && key !== 'returnUrl' && key !== 'redirect') {
          parsed.params[key] = value;
        }
      });
    } catch {
      // If URL parsing fails, return raw data
    }

    return parsed;
  }

  // ── Wallet opening ──────────────────────────────────────────────────────

  /**
   * Open a native wallet app via deep link.
   *
   * Falls back through deep link → universal link → app store.
   *
   * @param walletDeepLink — The deep-link URL to open.
   * @param returnUrl — Optional return URL the wallet should redirect back to.
   */
  async openWallet(walletDeepLink: string, returnUrl?: string): Promise<DeepLinkResult> {
    // Append return URL if provided
    let targetUrl = walletDeepLink;
    if (returnUrl && targetUrl.includes('?')) {
      if (!targetUrl.includes('returnUrl')) {
        targetUrl += `&returnUrl=${encodeURIComponent(returnUrl)}`;
      }
    } else if (returnUrl && !targetUrl.includes('?')) {
      targetUrl += `?returnUrl=${encodeURIComponent(returnUrl)}`;
    }

    try {
      // Check if the deep-link scheme is supported on this device
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (canOpen) {
        await Linking.openURL(targetUrl);
        return { success: true, method: 'deep-link', url: targetUrl };
      }
    } catch {
      // canOpenURL may throw on iOS simulator for non-standard schemes
    }

    // Attempt universal-link fallback
    const universalUrl = this._extractUniversalLink(targetUrl);
    if (universalUrl) {
      try {
        const canOpenUniversal = await Linking.canOpenURL(universalUrl);
        if (canOpenUniversal) {
          await Linking.openURL(universalUrl);
          return { success: true, method: 'universal-link', url: universalUrl };
        }
      } catch {
        // ignore
      }
    }

    // Fall back to app store
    const storeUrl = this._extractStoreUrl(targetUrl);
    if (storeUrl) {
      try {
        await Linking.openURL(storeUrl);
        return { success: true, method: 'app-store', url: storeUrl };
      } catch {
        // ignore
      }
    }

    return {
      success: false,
      method: 'none',
      url: targetUrl,
      error: 'Could not open wallet app via deep link, universal link, or app store.',
    };
  }

  // ── URL builder ─────────────────────────────────────────────────────────

  /**
   * Construct a wallet-specific deep-link URL.
   *
   * @param walletId — Wallet identifier (e.g. `'metamask'`).
   * @param action — Action path (e.g. `'wc'`, `'dapp'`, `'send'`).
   * @param params — Query parameters to append (e.g. `{ uri: 'wc:abc123...' }`).
   * @returns The constructed deep-link URL string.
   */
  buildWalletUrl(
    walletId: string,
    action: string,
    params?: Record<string, string>,
  ): string {
    const cfg = this.getWalletConfig(walletId);
    if (!cfg) {
      throw new Error(`Unknown wallet ID: ${walletId}. Register it via registerScheme().`);
    }

    // Build base URL
    const scheme = cfg.scheme; // e.g. "metamask://"
    const wcPath = cfg.wcPath ?? `/${action}?`;

    // For WalletConnect bare scheme, it's simply "wc:<uri>"
    if (walletId === 'walletconnect' && params?.uri) {
      return params.uri.startsWith('wc:') ? params.uri : `wc:${params.uri}`;
    }

    let url = scheme;

    if (action === 'wc' && params?.uri) {
      // Standard WalletConnect pattern: metamask://wc?uri=<wc_uri>
      url += `wc?uri=${encodeURIComponent(params.uri)}`;
    } else {
      url += `${action}`;
    }

    // Append additional query parameters
    if (params) {
      const sep = url.includes('?') ? '&' : '?';
      const qs = Object.entries(params)
        .filter(([key]) => key !== 'uri')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      if (qs) {
        url += `${sep}${qs}`;
      }
    }

    return url;
  }

  // ── App return URL ──────────────────────────────────────────────────────

  /**
   * Get the return URL for the current app so wallets can redirect back.
   *
   * Returns the registered app scheme or a platform-appropriate default.
   */
  getAppReturnUrl(): string {
    if (this._appScheme) {
      return this._appScheme;
    }
    // Platform-appropriate defaults
    if (Platform.OS === 'ios') {
      return 'https://'; // Universal-link style
    }
    return 'cinacoin://';
  }

  // ── Callbacks ───────────────────────────────────────────────────────────

  /**
   * Register a callback for incoming deep links.
   *
   * @param callback — Fired with the URL string whenever a link arrives.
   */
  onLink(callback: (url: string) => void): void {
    this._onLinkCallback = callback;
  }

  /**
   * Register a callback for when the user returns from a wallet app.
   *
   * This fires after `openWallet` and the wallet redirects back.
   *
   * @param callback — Fired with the return URL.
   */
  onWalletReturn(callback: (url: string) => void): void {
    this._onReturnCallback = callback;
  }

  /**
   * Track a pending wallet action so we can match return callbacks.
   *
   * @param walletId — Wallet that was opened.
   * @param returnUrl — Expected return URL.
   */
  trackPendingAction(walletId: string, returnUrl: string): void {
    this._pendingAction = { walletId, returnUrl, ts: Date.now() };
  }

  /** Clear any pending action. */
  clearPendingAction(): void {
    this._pendingAction = null;
  }

  // ── Platform helpers ────────────────────────────────────────────────────

  /** Returns the current platform identifier: 'ios' | 'android'. */
  static get platform(): 'ios' | 'android' {
    return Platform.OS as 'ios' | 'android';
  }

  /**
   * Whether the current platform uses universal links (iOS) or app links (Android).
   * Returns `'universal'` on iOS, `'app-link'` on Android.
   */
  static get linkType(): 'universal' | 'app-link' {
    return Platform.OS === 'ios' ? 'universal' : 'app-link';
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /** Merge built-in and custom wallet configs. */
  private _getAllSchemes(): Record<string, WalletSchemeConfig> {
    return { ...WALLET_SCHEMES, ...this._customSchemes };
  }

  /** Extract a universal-link URL from a deep-link URL. */
  private _extractUniversalLink(url: string): string | null {
    try {
      const u = new URL(url);
      for (const cfg of Object.values(this._getAllSchemes())) {
        if (cfg.universalLinkDomain) {
          const domain = cfg.universalLinkDomain;
          // Rebuild as universal link
          const uriParam = u.searchParams.get('uri');
          if (uriParam) {
            return `https://${domain}/wc?uri=${encodeURIComponent(uriParam)}`;
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  /** Extract an app-store URL from a deep-link URL. */
  private _extractStoreUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const scheme = u.protocol.replace(':', '');
      for (const cfg of Object.values(this._getAllSchemes())) {
        const cfgScheme = cfg.scheme.replace('://', '').replace(':', '');
        if (scheme === cfgScheme) {
          if (DeepLinkManager.platform === 'ios') {
            return cfg.appStoreUrl ?? null;
          }
          return cfg.playStoreUrl ?? null;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  /** Internal handler for incoming Linking events. */
  private _handleIncomingLink = (event: { url: string }): void => {
    const url = event.url;

    // Fire generic link callback
    this._onLinkCallback?.(url);

    // Check if this is a return from a wallet
    if (this._pendingAction) {
      const { returnUrl, walletId } = this._pendingAction;
      if (url.includes(returnUrl) || url.startsWith(this._appScheme ?? '')) {
        this._onReturnCallback?.(url);
        this._pendingAction = null;
        return;
      }
    }

    // Check if URL matches the app's own scheme (return from wallet)
    if (this._appScheme && url.startsWith(this._appScheme)) {
      this._onReturnCallback?.(url);
    }
  };
}

/** Convenience: get the singleton instance. */
export const deepLinkManager = DeepLinkManager.getInstance();

export default DeepLinkManager;
