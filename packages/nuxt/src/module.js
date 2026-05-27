import { defineNuxtModule, addPlugin, addImportsDir, addComponent, addTemplate, createResolver } from '@nuxt/kit';
/**
 * Cinacoin Nuxt module — provides wallet connection for Nuxt 3 apps.
 *
 * Automatically adds the @cinacoin/vue plugin, runtime config,
 * composables, and a connect-button component.
 */
export default defineNuxtModule({
    meta: {
        name: '@cinacoin/nuxt',
        configKey: 'cinacoin',
        compatibility: {
            nuxt: '^3.0.0',
        },
    },
    defaults: {
        networks: ['mainnet'],
        themeMode: 'auto',
        themeVariables: {},
    },
    setup(options, nuxt) {
        const { resolve } = createResolver(import.meta.url);
        // ── Runtime config ─────────────────────────────────────────────
        nuxt.options.runtimeConfig.public.cinacoin = {
            projectId: options.projectId,
            networks: options.networks,
            metadata: options.metadata,
            themeMode: options.themeMode,
            themeVariables: options.themeVariables,
        };
        // ── Vue plugin (auto-installs @cinacoin/vue) ───────────────
        addPlugin({
            src: resolve('./runtime/plugin'),
        });
        // ── Auto-import composables ────────────────────────────────────
        addImportsDir(resolve('./runtime/composables'));
        // ── Auto-import components ─────────────────────────────────────
        addComponent({
            name: 'NuxtConnectButton',
            filePath: resolve('./runtime/components/NuxtConnectButton.vue'),
        });
        addComponent({
            name: 'NuxtAccountButton',
            filePath: resolve('./runtime/components/NuxtAccountButton.vue'),
        });
        // ── CSS theme variables ────────────────────────────────────────
        addTemplate({
            filename: 'cinacoin-theme.css',
            getContents: () => {
                const palette = {
                    '--cinacoin-color-accent': '#4F46E5',
                    '--cinacoin-color-accent-hover': '#4338CA',
                    '--cinacoin-color-bg': '#ffffff',
                    '--cinacoin-color-bg-secondary': '#f9fafb',
                    '--cinacoin-color-text': '#111827',
                    '--cinacoin-color-text-secondary': '#6b7280',
                    '--cinacoin-color-border': '#e5e7eb',
                    '--cinacoin-color-success': '#10b981',
                    '--cinacoin-color-error': '#ef4444',
                    '--cinacoin-radius': '12px',
                };
                const darkPalette = {
                    '--cinacoin-color-bg': '#111827',
                    '--cinacoin-color-bg-secondary': '#1f2937',
                    '--cinacoin-color-text': '#f9fafb',
                    '--cinacoin-color-text-secondary': '#9ca3af',
                    '--cinacoin-color-border': '#374151',
                };
                const resolve = (vars) => Object.entries(vars)
                    .map(([k, v]) => `  ${k}: ${options.themeVariables?.[k] ?? v};`)
                    .join('\n');
                const rootVars = resolve(palette);
                const darkVars = resolve(darkPalette);
                const mode = options.themeMode ?? 'auto';
                let css = `:root {\n${rootVars}\n}`;
                if (mode === 'dark') {
                    css += `\n:root {\n${darkVars}\n}`;
                }
                else if (mode === 'auto') {
                    css += `\n@media (prefers-color-scheme: dark) {\n  :root {\n${darkVars}\n  }\n}`;
                }
                return css;
            },
            write: true,
        });
        // Inject generated CSS into the app
        nuxt.hook('app:resolve', (app) => {
            app.css.push('#build/cinacoin-theme.css');
        });
        // ── TypeScript augmentation ────────────────────────────────────
        nuxt.hook('prepare:types', ({ references }) => {
            references.push({ path: resolve('./runtime/types') });
        });
    },
});
//# sourceMappingURL=module.js.map