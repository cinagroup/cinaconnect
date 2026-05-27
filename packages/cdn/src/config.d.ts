/**
 * CDN global configuration via window.Cinacoin.
 *
 * Users can set configuration before loading the CDN bundle:
 *
 * ```html
 * <script>
 *   window.Cinacoin = {
 *     projectId: 'your-project-id',
 *     theme: 'dark',
 *     primaryColor: '#6366F1',
 *     chains: [1, 10, 137],
 *   };
 * </script>
 * <script src="https://cdn.cinacoin.dev/connect.js"></script>
 * ```
 */
export interface CinacoinConfig {
    /** WalletConnect Project ID */
    projectId?: string;
    /** Theme mode */
    theme?: "light" | "dark";
    /** Custom primary color */
    primaryColor?: string;
    /** Default chain IDs */
    chains?: number[];
    /** Default chain ID */
    defaultChainId?: number;
    /** Wallet metadata */
    metadata?: {
        name: string;
        description: string;
        url: string;
        icons: string[];
    };
    /** Whether to show recent connections */
    showRecent?: boolean;
    /** Supported wallet types */
    wallets?: string[];
    /** RPC URLs per chain */
    rpcUrls?: Record<number, string>;
}
/**
 * Global configuration interface on window.
 */
declare global {
    interface Window {
        Cinacoin?: CinacoinConfig;
    }
}
/**
 * Get the merged configuration from window.Cinacoin.
 * Falls back to defaults for any missing values.
 */
export declare function getConfig(): CinacoinConfig;
/**
 * Validate that required configuration is present.
 * Returns a list of missing keys.
 */
export declare function validateConfig(config: CinacoinConfig): string[];
//# sourceMappingURL=config.d.ts.map