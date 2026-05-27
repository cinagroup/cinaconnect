import { defineNuxtPlugin, useRuntimeConfig } from '#imports';
import { Cinacoin } from '@cinacoin/vue';
/**
 * Nuxt runtime plugin that creates a Cinacoin application instance
 * and provides it via Vue's dependency injection.
 *
 * Reads configuration from `runtimeConfig.public.cinacoin`.
 */
export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig().public.cinacoin;
    const app = new Cinacoin({
        projectId: config.projectId,
        networks: config.networks,
        metadata: config.metadata,
        themeMode: config.themeMode,
        themeVariables: config.themeVariables,
    });
    nuxtApp.provide('cinaConnect', app);
    return {
        provide: {
            cinaConnect: app,
        },
    };
});
//# sourceMappingURL=plugin.js.map