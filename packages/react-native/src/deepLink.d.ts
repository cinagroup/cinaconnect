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
export declare class DeepLinkManager {
    /** Singleton instance. */
    private static _instance;
    /** Registered custom URI scheme for this app. */
    private _appScheme;
    /** Additional wallet schemes registered at runtime. */
    private _customSchemes;
    /** Whether the manager has been initialised. */
    private _initialised;
    /** Subscription token for the Linking event listener. */
    private _linkingSubscription;
    /** Callback fired when a deep link is received. */
    private _onLinkCallback;
    /** Callback fired when the user returns from a wallet app. */
    private _onReturnCallback;
    /** Pending action awaiting a return from a wallet. */
    private _pendingAction;
    private constructor();
    /** Get (or create) the singleton instance. */
    static getInstance(): DeepLinkManager;
    /** Reset the singleton (primarily for testing). */
    static resetInstance(): void;
    /**
     * Initialise the deep-link manager.
     *
     * Registers the app's own URI scheme so that wallets can return to it,
     * and sets up the `Linking` event listener.
     *
     * @param scheme — The custom URI scheme for this app (e.g. `cinacoin://`).
     */
    init(scheme: string): Promise<void>;
    /** Tear down listeners. */
    destroy(): void;
    /**
     * Register a custom wallet URI scheme at runtime.
     *
     * @param config — Wallet scheme configuration.
     */
    registerScheme(config: WalletSchemeConfig): void;
    /** Get the resolved config for a wallet ID. */
    getWalletConfig(walletId: string): WalletSchemeConfig | undefined;
    /** List all known wallet IDs (built-in + custom). */
    listWallets(): string[];
    /**
     * Parse an incoming deep-link URL into structured data.
     *
     * Recognises common patterns:
     *   - `wc:<pairing_uri>` → WalletConnect URI
     *   - `<scheme>://wc?uri=<encoded_wc_uri>` → Wallet app redirect
     *   - `<scheme>://dapp?...` → Generic dApp action
     */
    handleUrl(url: string): ParsedDeepLink;
    /**
     * Open a native wallet app via deep link.
     *
     * Falls back through deep link → universal link → app store.
     *
     * @param walletDeepLink — The deep-link URL to open.
     * @param returnUrl — Optional return URL the wallet should redirect back to.
     */
    openWallet(walletDeepLink: string, returnUrl?: string): Promise<DeepLinkResult>;
    /**
     * Construct a wallet-specific deep-link URL.
     *
     * @param walletId — Wallet identifier (e.g. `'metamask'`).
     * @param action — Action path (e.g. `'wc'`, `'dapp'`, `'send'`).
     * @param params — Query parameters to append (e.g. `{ uri: 'wc:abc123...' }`).
     * @returns The constructed deep-link URL string.
     */
    buildWalletUrl(walletId: string, action: string, params?: Record<string, string>): string;
    /**
     * Get the return URL for the current app so wallets can redirect back.
     *
     * Returns the registered app scheme or a platform-appropriate default.
     */
    getAppReturnUrl(): string;
    /**
     * Register a callback for incoming deep links.
     *
     * @param callback — Fired with the URL string whenever a link arrives.
     */
    onLink(callback: (url: string) => void): void;
    /**
     * Register a callback for when the user returns from a wallet app.
     *
     * This fires after `openWallet` and the wallet redirects back.
     *
     * @param callback — Fired with the return URL.
     */
    onWalletReturn(callback: (url: string) => void): void;
    /**
     * Track a pending wallet action so we can match return callbacks.
     *
     * @param walletId — Wallet that was opened.
     * @param returnUrl — Expected return URL.
     */
    trackPendingAction(walletId: string, returnUrl: string): void;
    /** Clear any pending action. */
    clearPendingAction(): void;
    /** Returns the current platform identifier: 'ios' | 'android'. */
    static get platform(): 'ios' | 'android';
    /**
     * Whether the current platform uses universal links (iOS) or app links (Android).
     * Returns `'universal'` on iOS, `'app-link'` on Android.
     */
    static get linkType(): 'universal' | 'app-link';
    /** Merge built-in and custom wallet configs. */
    private _getAllSchemes;
    /** Extract a universal-link URL from a deep-link URL. */
    private _extractUniversalLink;
    /** Extract an app-store URL from a deep-link URL. */
    private _extractStoreUrl;
    /** Internal handler for incoming Linking events. */
    private _handleIncomingLink;
}
/** Convenience: get the singleton instance. */
export declare const deepLinkManager: DeepLinkManager;
export default DeepLinkManager;
//# sourceMappingURL=deepLink.d.ts.map