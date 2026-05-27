import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Connector, CinacoinCore } from '@cinacoin/core-sdk';

/** @deprecated Use CinacoinAngularConfig instead. */
export type CinacoinOptions = Parameters<typeof CinacoinModule.forRoot>[0];
import { CinacoinService } from './cinacoin.service.js';
import {
  CINA_CONNECT_OPTIONS,
  CINA_CONNECT_INSTANCE,
  type CinacoinAngularConfig,
} from './cinacoin.tokens.js';

// Standalone Components
import { ConnectButtonComponent } from './components/connect-button.component.js';
import { AccountButtonComponent } from './components/account-button.component.js';
import { NetworkButtonComponent } from './components/network-button.component.js';

// Pipes
import { AddressPipe } from './pipes/address.pipe.js';
import { BalancePipe } from './pipes/balance.pipe.js';

// Directives
import { ConnectDirective } from './directives/connect.directive.js';

// EIP-5792
export { Eip5792Service } from './eip5792/eip5792.service.js';

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
@NgModule({
  imports: [
    CommonModule,
    // Standalone components imported directly
    ConnectButtonComponent,
    AccountButtonComponent,
    NetworkButtonComponent,
  ],
  declarations: [
    // Non-standalone declarations still need to be declared
    AddressPipe,
    BalancePipe,
    ConnectDirective,
  ],
  providers: [CinacoinService],
  exports: [
    // Standalone components re-exported
    ConnectButtonComponent,
    AccountButtonComponent,
    NetworkButtonComponent,
    // Non-standalone declarations
    AddressPipe,
    BalancePipe,
    ConnectDirective,
  ],
})
export class CinacoinModule {
  /**
   * Configure Cinacoin at the root level.
   *
   * Call this exactly once in your root `AppModule`.
   *
   * @param config - Project configuration including projectId and chains.
   * @returns Module with providers.
   */
  static forRoot(config: CinacoinAngularConfig): ModuleWithProviders<CinacoinModule> {
    return {
      ngModule: CinacoinModule,
      providers: [
        {
          provide: CINA_CONNECT_OPTIONS,
          useValue: config,
        },
        {
          provide: CINA_CONNECT_INSTANCE,
          useFactory: (options: CinacoinAngularConfig): Connector | CinacoinCore => {
            if (options.connector) {
              return options.connector;
            }
            // Create a default connector instance from core SDK
            const core = new CinacoinCore({
              projectId: options.projectId,
              chains: options.chains,
              metadata: options.metadata,
              relayUrl: options.relayUrl,
              debug: options.debug,
            });
            return core.getConnector();
          },
          deps: [CINA_CONNECT_OPTIONS],
        },
      ],
    };
  }
}
