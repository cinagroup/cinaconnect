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

import { Platform, AppState, type AppStateStatus } from 'react-native';
import { DeepLinkManager } from './deepLink.js';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Result of a link-mode connection attempt. */
export interface LinkConnectResult {
  /** Connection method used. */
  method: 'deep-link' | 'universal-link' | 'qr-code' | 'app-store';
  /** Whether the wallet app was detected as installed. */
  walletInstalled: boolean;
  /** The URL that was opened (if applicable). */
  url?: string;
  /** Error message on failure. */
  error?: string;
}

/** Callback fired when the user returns from a wallet app. */
export type WalletReturnCallback = (data: {
  walletId: string;
  url: string;
  timestamp: number;
}) => void;

// ─── LinkModeManager ────────────────────────────────────────────────────────

/**
 * High-level manager for wallet link-mode connections.
 *
 * Coordinates deep-link detection, wallet opening, and return handling.
 */
export class LinkModeManager {
  private static _instance: LinkModeManager | null = null;

  /** Reference to the underlying deep-link manager. */
  private _deepLinkManager: DeepLinkManager;

  /** Whether this manager has been initialised. */
  private _initialised = false;

  /** Registered wallet-return callbacks. */
  private _returnCallbacks: WalletReturnCallback[] = [];

  /** AppState subscription for detecting app foreground after wallet return. */
  private _appStateSub: { remove: () => void } | null = null;

  /** Track if we are resuming from a wallet redirect. */
  private _resumingFromWallet = false;

  /** The wallet ID we last opened. */
  private _lastOpenedWalletId: string | null = null;

  private constructor() {
    this._deepLinkManager = DeepLinkManager.getInstance();
  }

  /** Get (or create) the singleton instance. */
  static getInstance(): LinkModeManager {
    if (!LinkModeManager._instance) {
      LinkModeManager._instance = new LinkModeManager();
    }
    return LinkModeManager._instance;
  }

  /** Reset the singleton (testing). */
  static resetInstance(): void {
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
  async init(appScheme: string): Promise<void> {
    if (this._initialised) return;

    // Initialise the underlying deep-link manager
    await this._deepLinkManager.init(appScheme);

    // Set up deep-link callbacks
    this._deepLinkManager.onLink((url: string) => {
      this._handleDeepLink(url);
    });

    this._deepLinkManager.onWalletReturn((url: string) => {
      this._handleWalletReturn(url);
    });

    // Monitor app state changes to detect return from wallet
    this._appStateSub = AppState.addEventListener('change', this._handleAppStateChange);

    this._initialised = true;
  }

  /** Tear down all listeners. */
  destroy(): void {
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
  async connectWithLink(
    walletId: string,
    namespace: string,
    wcUri?: string,
  ): Promise<LinkConnectResult> {
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
    let walletUrl: string;
    if (wcUri) {
      walletUrl = this._deepLinkManager.buildWalletUrl(walletId, 'wc', { uri: wcUri });
    } else {
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
      method: result.method as LinkConnectResult['method'],
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
  onWalletReturn(callback: WalletReturnCallback): void {
    this._returnCallbacks.push(callback);
  }

  /** Unregister a return callback. */
  offWalletReturn(callback: WalletReturnCallback): void {
    const idx = this._returnCallbacks.indexOf(callback);
    if (idx >= 0) this._returnCallbacks.splice(idx, 1);
  }

  /** Clear all return callbacks. */
  clearWalletReturnCallbacks(): void {
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
  async isWalletInstalled(walletId: string): Promise<boolean> {
    const cfg = this._deepLinkManager.getWalletConfig(walletId);
    if (!cfg) return false;

    try {
      return await DeepLinkManager.platform === 'ios'
        ? this._checkIosInstalled(cfg.scheme)
        : this._checkAndroidInstalled(cfg.scheme);
    } catch {
      return false;
    }
  }

  /**
   * Check if any registered wallet is installed.
   *
   * @returns Map of wallet ID → installed status.
   */
  async scanInstalledWallets(walletIds?: string[]): Promise<Record<string, boolean>> {
    const ids = walletIds ?? this._deepLinkManager.listWallets();
    const results: Record<string, boolean> = {};

    for (const id of ids) {
      results[id] = await this.isWalletInstalled(id);
    }

    return results;
  }

  // ── Internal handlers ───────────────────────────────────────────────────

  /** Handle an incoming deep link. */
  private _handleDeepLink(url: string): void {
    const parsed = this._deepLinkManager.handleUrl(url);

    // If this URL contains a WalletConnect URI, it's likely a return payload
    if (parsed.uri && parsed.uri.startsWith('wc:')) {
      this._resumingFromWallet = true;
    }
  }

  /** Handle a return from a wallet app. */
  private _handleWalletReturn(url: string): void {
    this._resumingFromWallet = true;

    const walletId = this._lastOpenedWalletId ?? 'unknown';
    const data = { walletId, url, timestamp: Date.now() };

    for (const cb of this._returnCallbacks) {
      try {
        cb(data);
      } catch {
        // Don't let one callback break the chain
      }
    }

    this._lastOpenedWalletId = null;
  }

  /** Handle app-state changes. */
  private _handleAppStateChange = (state: AppStateStatus): void => {
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
        } catch {
          // ignore
        }
      }
    }
  };

  /** iOS-specific installed check. */
  private async _checkIosInstalled(scheme: string): Promise<boolean> {
    // On iOS, canOpenURL requires LSApplicationQueriesSchemes entries
    const testUrl = scheme.replace('://', '://ping');
    return await (import('react-native').then((rn) => rn.Linking.canOpenURL(testUrl)));
  }

  /** Android-specific installed check. */
  private async _checkAndroidInstalled(scheme: string): Promise<boolean> {
    const { Linking } = await import('react-native');
    return Linking.canOpenURL(scheme);
  }
}

/** Convenience: get the singleton instance. */
export const linkModeManager = LinkModeManager.getInstance();

export default LinkModeManager;
