import { defineNuxtModule, addPlugin, addImportsDir, addComponent, addTemplate, createResolver } from '@nuxt/kit'

import type { MetaOptions } from '@cinaconnect/core-sdk'

/**
 * Network identifiers supported by CinaConnect.
 */
export type CinaConnectNetwork = 'mainnet' | 'testnet' | 'arbitrum' | 'arbitrum-sepolia' | 'base' | 'base-sepolia' | 'optimism' | 'optimism-sepolia' | 'polygon' | 'polygon-mumbai' | string

/**
 * Module options for the Nuxt 3 CinaConnect module.
 */
export interface CinaConnectModuleOptions {
  /**
   * CinaConnect project ID (from https://cloud.cinaconnect.com).
   */
  projectId: string

  /**
   * Network keys to enable (e.g. ['mainnet', 'arbitrum', 'base']).
   * Defaults to ['mainnet'].
   */
  networks?: CinaConnectNetwork[]

  /**
   * WalletConnect metadata for the connection.
   */
  metadata?: MetaOptions

  /**
   * Theme mode for the connect UI.
   * @default 'auto'
   */
  themeMode?: 'auto' | 'dark' | 'light'

  /**
   * Theme variables override.
   */
  themeVariables?: Record<string, string>
}

/**
 * CinaConnect Nuxt module — provides wallet connection for Nuxt 3 apps.
 *
 * Automatically adds the @cinaconnect/vue plugin, runtime config,
 * composables, and a connect-button component.
 */
export default defineNuxtModule<CinaConnectModuleOptions>({
  meta: {
    name: '@cinaconnect/nuxt',
    configKey: 'cinaconnect',
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
    const { resolve } = createResolver(import.meta.url)

    // ── Runtime config ─────────────────────────────────────────────
    nuxt.options.runtimeConfig.public.cinaconnect = {
      projectId: options.projectId,
      networks: options.networks,
      metadata: options.metadata,
      themeMode: options.themeMode,
      themeVariables: options.themeVariables,
    }

    // ── Vue plugin (auto-installs @cinaconnect/vue) ───────────────
    addPlugin({
      src: resolve('./runtime/plugin'),
    })

    // ── Auto-import composables ────────────────────────────────────
    addImportsDir(resolve('./runtime/composables'))

    // ── Auto-import components ─────────────────────────────────────
    addComponent({
      name: 'NuxtConnectButton',
      filePath: resolve('./runtime/components/NuxtConnectButton.vue'),
    })

    addComponent({
      name: 'NuxtAccountButton',
      filePath: resolve('./runtime/components/NuxtAccountButton.vue'),
    })

    // ── CSS theme variables ────────────────────────────────────────
    addTemplate({
      filename: 'cinaconnect-theme.css',
      getContents: () => {
        const palette: Record<string, string> = {
          '--cinaconnect-color-accent': '#4F46E5',
          '--cinaconnect-color-accent-hover': '#4338CA',
          '--cinaconnect-color-bg': '#ffffff',
          '--cinaconnect-color-bg-secondary': '#f9fafb',
          '--cinaconnect-color-text': '#111827',
          '--cinaconnect-color-text-secondary': '#6b7280',
          '--cinaconnect-color-border': '#e5e7eb',
          '--cinaconnect-color-success': '#10b981',
          '--cinaconnect-color-error': '#ef4444',
          '--cinaconnect-radius': '12px',
        }

        const darkPalette: Record<string, string> = {
          '--cinaconnect-color-bg': '#111827',
          '--cinaconnect-color-bg-secondary': '#1f2937',
          '--cinaconnect-color-text': '#f9fafb',
          '--cinaconnect-color-text-secondary': '#9ca3af',
          '--cinaconnect-color-border': '#374151',
        }

        const resolve = (vars: Record<string, string>) =>
          Object.entries(vars)
            .map(([k, v]) => `  ${k}: ${options.themeVariables?.[k] ?? v};`)
            .join('\n')

        const rootVars = resolve(palette)
        const darkVars = resolve(darkPalette)
        const mode = options.themeMode ?? 'auto'

        let css = `:root {\n${rootVars}\n}`

        if (mode === 'dark') {
          css += `\n:root {\n${darkVars}\n}`
        } else if (mode === 'auto') {
          css += `\n@media (prefers-color-scheme: dark) {\n  :root {\n${darkVars}\n  }\n}`
        }

        return css
      },
      write: true,
    })

    // Inject generated CSS into the app
    nuxt.hook('app:resolve', (app) => {
      app.css.push('#build/cinaconnect-theme.css')
    })

    // ── TypeScript augmentation ────────────────────────────────────
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: resolve('./runtime/types') })
    })
  },
})
