/**
 * @cinaconnect/vue
 *
 * Vue 3 adapter for CinaConnect white-label UI toolkit.
 */

export { default as CinaConnectProvider } from './CinaConnectProvider.vue.js';
export type { CinaConnectProviderProps } from './CinaConnectProvider.vue.js';

export { ONCHAINUX_KEY } from './types.js';
export type { CinaConnectConfig, CinaConnectContext, AccountState, Connector, ChainConfig, ThemeMode } from './types.js';

export { OcxConnectButton, OcxConnectModal, OcxChainSwitcher } from './components.js';

export {
  useCinaConnect,
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
