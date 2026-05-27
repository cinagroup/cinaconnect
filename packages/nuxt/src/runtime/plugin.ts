import type { CinacoinModuleOptions } from '#build/types'

import { defineNuxtPlugin, useRuntimeConfig, useNuxtApp } from '#imports'
import { Cinacoin } from '@cinacoin/vue'

/**
 * Nuxt runtime plugin that creates a Cinacoin application instance
 * and provides it via Vue's dependency injection.
 *
 * Reads configuration from `runtimeConfig.public.cinacoin`.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.cinacoin as CinacoinModuleOptions & {
    themeMode?: 'auto' | 'dark' | 'light'
    themeVariables?: Record<string, string>
  }

  const app = new Cinacoin({
    projectId: config.projectId,
    networks: config.networks,
    metadata: config.metadata,
    themeMode: config.themeMode,
    themeVariables: config.themeVariables,
  })

  nuxtApp.provide('cinaConnect', app)

  return {
    provide: {
      cinaConnect: app,
    },
  }
})
