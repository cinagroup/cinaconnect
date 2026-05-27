import { InjectionToken } from '@angular/core';
import type { Chain, AppMetadata, Connector } from '@cinacoin/core-sdk';

/**
 * Configuration options for CinacoinModule.forRoot().
 */
export interface CinacoinAngularConfig {
  /** Project ID for relay connection. */
  projectId: string;

  /** Chains to support. */
  chains?: Chain[];

  /** dApp metadata for wallet pairing. */
  metadata?: AppMetadata;

  /** Relay server URL override. */
  relayUrl?: string;

  /** Custom connector instance. */
  connector?: Connector;

  /** Enable debug logging. */
  debug?: boolean;
}

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
export const CINA_CONNECT_OPTIONS = new InjectionToken<CinacoinAngularConfig>(
  'CINA_CONNECT_OPTIONS'
);

/**
 * Injection token for the Cinacoin SDK Connector instance.
 *
 * Created internally from `CINA_CONNECT_OPTIONS` and provided at the root level.
 */
export const CINA_CONNECT_INSTANCE = new InjectionToken<Connector>(
  'CINA_CONNECT_INSTANCE'
);
