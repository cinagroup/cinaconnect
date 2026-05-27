import type { MetaOptions } from '@cinacoin/core-sdk';
/**
 * Network identifiers supported by Cinacoin.
 */
export type CinacoinNetwork = 'mainnet' | 'testnet' | 'arbitrum' | 'arbitrum-sepolia' | 'base' | 'base-sepolia' | 'optimism' | 'optimism-sepolia' | 'polygon' | 'polygon-mumbai' | string;
/**
 * Module options for the Nuxt 3 Cinacoin module.
 */
export interface CinacoinModuleOptions {
    /**
     * Cinacoin project ID (from https://cloud.cinacoin.com).
     */
    projectId: string;
    /**
     * Network keys to enable (e.g. ['mainnet', 'arbitrum', 'base']).
     * Defaults to ['mainnet'].
     */
    networks?: CinacoinNetwork[];
    /**
     * WalletConnect metadata for the connection.
     */
    metadata?: MetaOptions;
    /**
     * Theme mode for the connect UI.
     * @default 'auto'
     */
    themeMode?: 'auto' | 'dark' | 'light';
    /**
     * Theme variables override.
     */
    themeVariables?: Record<string, string>;
}
/**
 * Cinacoin Nuxt module — provides wallet connection for Nuxt 3 apps.
 *
 * Automatically adds the @cinacoin/vue plugin, runtime config,
 * composables, and a connect-button component.
 */
declare const _default: import("nuxt/schema").NuxtModule<CinacoinModuleOptions, CinacoinModuleOptions, false>;
export default _default;
//# sourceMappingURL=module.d.ts.map