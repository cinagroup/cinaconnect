/**
 * @cinacoin/vue
 *
 * Vue 3 adapter for Cinacoin white-label UI toolkit.
 */

export { default as CinaCoinProvider } from './CinaCoinProvider.vue.js';
export type { CinaCoinProviderProps } from './CinaCoinProvider.vue.js';

export { ONCHAINUX_KEY } from './types.js';
export type { CinacoinConfig, CinacoinContext, AccountState, Connector, ChainConfig, ThemeMode } from './types.js';

export { OcxConnectButton, OcxConnectModal, OcxChainSwitcher } from './components.js';

export {
  useCinacoin,
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
} from './composables.js';

// EIP-5792 Wallet Call API composables
export {
  useWalletCapabilities,
  useSendCalls,
  useAtomicBatch,
  useCallsStatus,
} from './composables.js';

export type {
  UseWalletCapabilitiesReturn,
  UseSendCallsReturn,
  UseAtomicBatchReturn,
  UseCallsStatusReturn,
  SendCallsOptions,
  AtomicBatchOptions,
} from './composables.js';

// Connector manager for real wallet connections
export { ConnectorManager } from './connectorManager.js';
