import { ModuleWithProviders } from '@angular/core';
import { type CinacoinAngularConfig } from './cinacoin.tokens.js';
/**
 * Angular module for Cinacoin.
 *
 * Use `CinacoinModule.forRoot()` in your root `AppModule` to configure
 * the SDK with your project ID and chain list.
 *
 * ```ts
 * @NgModule({
 *   imports: [
 *     CinacoinModule.forRoot({
 *       projectId: 'YOUR_PROJECT_ID',
 *       chains: [mainnet, arbitrum, base],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export declare class CinacoinModule {
    /**
     * Configure Cinacoin at the root level.
     *
     * Call this exactly once in your root `AppModule`.
     *
     * @param config - Project configuration including projectId and chains.
     * @returns Module with providers.
     */
    static forRoot(config: CinacoinAngularConfig): ModuleWithProviders<CinacoinModule>;
}
//# sourceMappingURL=cinacoin.module.d.ts.map