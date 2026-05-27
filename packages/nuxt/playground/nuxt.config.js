import { defineNuxtConfig } from 'nuxt/config';
/**
 * Playground Nuxt config for testing @cinacoin/nuxt locally.
 *
 * Run with: `pnpm dev` from the nuxt package root.
 */
export default defineNuxtConfig({
    modules: ['../src/module'],
    cinacoin: {
        projectId: process.env.NUXT_PUBLIC_CINACOIN_PROJECT_ID ?? 'YOUR_PROJECT_ID',
        networks: ['mainnet', 'arbitrum', 'base'],
        metadata: {
            name: 'Cinacoin Nuxt Playground',
            description: 'Development playground for @cinacoin/nuxt',
            url: 'https://localhost:3000',
        },
        themeMode: 'auto',
    },
    devtools: { enabled: true },
    compatibilityDate: '2025-01-01',
});
//# sourceMappingURL=nuxt.config.js.map