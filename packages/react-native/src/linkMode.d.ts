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
/**
 * High-level manager for wallet link-mode connections.
 *
 * Coordinates deep-link detection, wallet opening, and return handling.
 */
export declare class LinkModeManager {
    private static _instance;
    /** Reference to the underlying deep-link manager. */
    private _deepLinkManager;
    /** Whether this manager has been initialised. */
    private _initialised;
    /** Registered wallet-return callbacks. */
    private _returnCallbacks;
    /** AppState subscription for detecting app foreground after wallet return. */
    private _appStateSub;
    /** Track if we are resuming from a wallet redirect. */
    private _resumingFromWallet;
    /** The wallet ID we last opened. */
    private _lastOpenedWalletId;
    private constructor();
    /** Get (or create) the singleton instance. */
    static getInstance(): LinkModeManager;
    /** Reset the singleton (testing). */
    static resetInstance(): void;
    /**
     * Initialise the link-mode manager.
     *
     * Sets up deep-link listeners, app-state monitoring, and return-callback
     * routing.
     *
     * @param appScheme — The app's custom URI scheme (e.g. `'cinacoin://'`).
     */
    init(appScheme: string): Promise<void>;
    /** Tear down all listeners. */
    destroy(): void;
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
    connectWithLink(walletId: string, namespace: string, wcUri?: string): Promise<LinkConnectResult>;
    /**
     * Register a callback for when the user returns from a wallet app.
     *
     * This is called when:
     *   - The deep-link manager receives a URL matching the app's scheme
     *   - The app is brought to foreground after being backgrounded by a wallet
     *
     * @param callback — Called with wallet ID, return URL, and timestamp.
     */
    onWalletReturn(callback: WalletReturnCallback): void;
    /** Unregister a return callback. */
    offWalletReturn(callback: WalletReturnCallback): void;
    /** Clear all return callbacks. */
    clearWalletReturnCallbacks(): void;
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
    isWalletInstalled(walletId: string): Promise<boolean>;
    /**
     * Check if any registered wallet is installed.
     *
     * @returns Map of wallet ID → installed status.
     */
    scanInstalledWallets(walletIds?: string[]): Promise<Record<string, boolean>>;
    /** Handle an incoming deep link. */
    private _handleDeepLink;
    /** Handle a return from a wallet app. */
    private _handleWalletReturn;
    /** Handle app-state changes. */
    private _handleAppStateChange;
    /** iOS-specific installed check. */
    private _checkIosInstalled;
    /** Android-specific installed check. */
    private _checkAndroidInstalled;
}
/** Convenience: get the singleton instance. */
export declare const linkModeManager: LinkModeManager;
export default LinkModeManager;
//# sourceMappingURL=linkMode.d.ts.map