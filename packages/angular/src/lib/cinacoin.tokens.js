import { InjectionToken } from '@angular/core';
/**
 * Injection token for Cinacoin configuration options.
 *
 * Provided via `CinacoinModule.forRoot()`.
 *
 * ```ts
 * {
 *   provide: CINA_CONNECT_OPTIONS,
 *   useValue: { projectId: 'YOUR_PROJECT_ID', chains: [...] }
 * }
 * ```
 */
export const CINA_CONNECT_OPTIONS = new InjectionToken('CINA_CONNECT_OPTIONS');
/**
 * Injection token for the Cinacoin SDK Connector instance.
 *
 * Created internally from `CINA_CONNECT_OPTIONS` and provided at the root level.
 */
export const CINA_CONNECT_INSTANCE = new InjectionToken('CINA_CONNECT_INSTANCE');
//# sourceMappingURL=cinacoin.tokens.js.map