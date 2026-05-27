export { CinacoinModule, CinacoinOptions } from './lib/cinacoin.module';
export { CinacoinService } from './lib/cinacoin.service';
export { CINA_CONNECT_OPTIONS, CINA_CONNECT_INSTANCE } from './lib/cinacoin.tokens';

// Components
export { ConnectButtonComponent } from './lib/components/connect-button.component';
export { AccountButtonComponent } from './lib/components/account-button.component';
export { NetworkButtonComponent } from './lib/components/network-button.component';

// Pipes
export { AddressPipe } from './lib/pipes/address.pipe';
export { BalancePipe } from './lib/pipes/balance.pipe';

// Directives
export { ConnectDirective } from './lib/directives/connect.directive';

// EIP-5792
export {
  Eip5792Service,
  type SendCallsResultObs,
  type SendCallsOptions,
  type AtomicBatchOptions,
  type GetCallsStatusOptions,
  type CallsStatusObs,
} from './lib/eip5792/eip5792.service';
