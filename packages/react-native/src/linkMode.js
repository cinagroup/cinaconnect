/**
 * linkMode.ts — LinkModeManager for @cinacoin/react-native
 *
 * High-level link-mode integration that coordinates deep linking with
 * wallet connection flows. Automatically detects if a wallet is installed
 * and uses a deep link; otherwise falls back to QR code.
 *
 * Usage:
 * ```ts
 * import { LinkModeManager } from '@cinacoin/react-native';
 *
 * const lm = LinkModeManager.getInstance();
 * await lm.init('cinacoin://');
 *
 * const result = await lm.connectWithLink('metamask', 'eip155');
 * ```
 */
import { AppState } from 'react-native';
import { DeepLinkManager } from './deepLink.js';
// ─── LinkModeManager ────────────────────────────────────────────────────────
/**
 * High-level manager for wallet link-mode connections.
 *
 * Coordinates deep-link detection, wallet opening, and return handling.
 */
export class LinkModeManager {
    constructor() {
        /** Whether this manager has been initialised. */
        this._initialised = false;
        /** Registered wallet-return callbacks. */
        this._returnCallbacks = [];
        /** AppState subscription for detecting app foreground after wallet return. */
        this._appStateSub = null;
        /** Track if we are resuming from a wallet redirect. */
        this._resumingFromWallet = false;
        /** The wallet ID we last opened. */
        this._lastOpenedWalletId = null;
        /** Handle app-state changes. */
        this._handleAppStateChange = (state) => {
            if (state === 'active' && this._resumingFromWallet) {
                this._resumingFromWallet = false;
                // Already handled via _handleWalletReturn; just reset flag.
            }
            // If app becomes active and we had a pending wallet action,
            // the user may have returned without a deep-link callback firing.
            if (state === 'active' && this._lastOpenedWalletId) {
                const walletId = this._lastOpenedWalletId;
                this._lastOpenedWalletId = null;
                this._deepLinkManager.clearPendingAction();
                const data = { walletId, url: '', timestamp: Date.now() };
                for (const cb of this._returnCallbacks) {
                    try {
                        cb(data);
                    }
                    catch {
                        // ignore
                    }
                }
            }
        };
        this._deepLinkManager = DeepLinkManager.getInstance();
    }
    /** Get (or create) the singleton instance. */
    static getInstance() {
        if (!LinkModeManager._instance) {
            LinkModeManager._instance = new LinkModeManager();
        }
        return LinkModeManager._instance;
    }
    /** Reset the singleton (testing). */
    static resetInstance() {
        if (LinkModeManager._instance) {
            LinkModeManager._instance.destroy();
        }
        LinkModeManager._instance = null;
    }
    // ── Lifecycle ───────────────────────────────────────────────────────────
    /**
     * Initialise the link-mode manager.
     *
     * Sets up deep-link listeners, app-state monitoring, and return-callback
     * routing.
     *
     * @param appScheme — The app's custom URI scheme (e.g. `'cinacoin://'`).
     */
    async init(appScheme) {
        if (this._initialised)
            return;
        // Initialise the underlying deep-link manager
        await this._deepLinkManager.init(appScheme);
        // Set up deep-link callbacks
        this._deepLinkManager.onLink((url) => {
            this._handleDeepLink(url);
        });
        this._deepLinkManager.onWalletReturn((url) => {
            this._handleWalletReturn(url);
        });
        // Monitor app state changes to detect return from wallet
        this._appStateSub = AppState.addEventListener('change', this._handleAppStateChange);
        this._initialised = true;
    }
    /** Tear down all listeners. */
    destroy() {
        this._appStateSub?.remove();
        this._appStateSub = null;
        this._returnCallbacks = [];
        this._deepLinkManager.destroy();
        this._initialised = false;
    }
    // ── Connection ──────────────────────────────────────────────────────────
    /**
     * Connect to a wallet via deep link.
     *
     * Auto-detects if the wallet is installed:
     *   1. If installed → opens via deep link
     *   2. Falls back to universal link
     *   3. Falls back to QR code (returns with method: 'qr-code')
     *
     * @param walletId — Wallet identifier (e.g. `'metamask'`, `'rainbow'`).
     * @param namespace — CAIP-2 namespace (e.g. `'eip155'`, `'solana'`).
     * @param wcUri — WalletConnect pairing URI (from WC v2).
     * @returns Result of the connection attempt.
     */
    async connectWithLink(walletId, namespace, wcUri) {
        const cfg = this._deepLinkManager.getWalletConfig(walletId);
        if (!cfg) {
            return {
                method: 'qr-code',
                walletInstalled: false,
                error: `Unknown wallet ID: ${walletId}.`,
            };
        }
        const returnUrl = this._deepLinkManager.getAppReturnUrl();
        // Build the wallet-specific URL
        let walletUrl;
        if (wcUri) {
            walletUrl = this._deepLinkManager.buildWalletUrl(walletId, 'wc', { uri: wcUri });
        }
        else {
            walletUrl = this._deepLinkManager.buildWalletUrl(walletId, 'connect', {
                namespace,
            });
        }
        // Track pending action for return callback matching
        this._deepLinkManager.trackPendingAction(walletId, returnUrl);
        this._lastOpenedWalletId = walletId;
        this._resumingFromWallet = false;
        // Open the wallet
        const result = await this._deepLinkManager.openWallet(walletUrl, returnUrl);
        if (!result.success) {
            this._deepLinkManager.clearPendingAction();
            this._lastOpenedWalletId = null;
        }
        return {
            method: result.method,
            walletInstalled: result.method === 'deep-link' || result.method === 'universal-link',
            url: result.url,
            error: result.error,
        };
    }
    // ── Return handling ─────────────────────────────────────────────────────
    /**
     * Register a callback for when the user returns from a wallet app.
     *
     * This is called when:
     *   - The deep-link manager receives a URL matching the app's scheme
     *   - The app is brought to foreground after being backgrounded by a wallet
     *
     * @param callback — Called with wallet ID, return URL, and timestamp.
     */
    onWalletReturn(callback) {
        this._returnCallbacks.push(callback);
    }
    /** Unregister a return callback. */
    offWalletReturn(callback) {
        const idx = this._returnCallbacks.indexOf(callback);
        if (idx >= 0)
            this._returnCallbacks.splice(idx, 1);
    }
    /** Clear all return callbacks. */
    clearWalletReturnCallbacks() {
        this._returnCallbacks = [];
    }
    // ── Wallet detection ────────────────────────────────────────────────────
    /**
     * Check if a wallet app is installed on the device.
     *
     * Uses `Linking.canOpenURL()` which requires the scheme to be listed in
     * `LSApplicationQueriesSchemes` (iOS) or the scheme to be registered
     * (Android).
     *
     * @param walletId — Wallet identifier.
     * @returns Promise resolving to `true` if the wallet appears installed.
     */
    async isWalletInstalled(walletId) {
        const cfg = this._deepLinkManager.getWalletConfig(walletId);
        if (!cfg)
            return false;
        try {
            return await DeepLinkManager.platform === 'ios'
                ? this._checkIosInstalled(cfg.scheme)
                : this._checkAndroidInstalled(cfg.scheme);
        }
        catch {
            return false;
        }
    }
    /**
     * Check if any registered wallet is installed.
     *
     * @returns Map of wallet ID → installed status.
     */
    async scanInstalledWallets(walletIds) {
        const ids = walletIds ?? this._deepLinkManager.listWallets();
        const results = {};
        for (const id of ids) {
            results[id] = await this.isWalletInstalled(id);
        }
        return results;
    }
    // ── Internal handlers ───────────────────────────────────────────────────
    /** Handle an incoming deep link. */
    _handleDeepLink(url) {
        const parsed = this._deepLinkManager.handleUrl(url);
        // If this URL contains a WalletConnect URI, it's likely a return payload
        if (parsed.uri && parsed.uri.startsWith('wc:')) {
            this._resumingFromWallet = true;
        }
    }
    /** Handle a return from a wallet app. */
    _handleWalletReturn(url) {
        this._resumingFromWallet = true;
        const walletId = this._lastOpenedWalletId ?? 'unknown';
        const data = { walletId, url, timestamp: Date.now() };
        for (const cb of this._returnCallbacks) {
            try {
                cb(data);
            }
            catch {
                // Don't let one callback break the chain
            }
        }
        this._lastOpenedWalletId = null;
    }
    /** iOS-specific installed check. */
    async _checkIosInstalled(scheme) {
        // On iOS, canOpenURL requires LSApplicationQueriesSchemes entries
        const testUrl = scheme.replace('://', '://ping');
        return await (import('react-native').then((rn) => rn.Linking.canOpenURL(testUrl)));
    }
    /** Android-specific installed check. */
    async _checkAndroidInstalled(scheme) {
        const { Linking } = await import('react-native');
        return Linking.canOpenURL(scheme);
    }
}
LinkModeManager._instance = null;
/** Convenience: get the singleton instance. */
export const linkModeManager = LinkModeManager.getInstance();
export default LinkModeManager;
//# sourceMappingURL=linkMode.js.map