import type { Cinacoin } from '@cinacoin/vue';
declare module '#app' {
    interface NuxtApp {
        /**
         * Cinacoin application instance, provided by `@cinacoin/nuxt`.
         * Access via `useNuxtApp().cinaConnect` or `nuxtApp.$cinaConnect`.
         */
        cinaConnect: Cinacoin;
        $cinaConnect: Cinacoin;
    }
}
declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $cinaConnect: Cinacoin;
    }
}
export {};
//# sourceMappingURL=types.d.ts.map