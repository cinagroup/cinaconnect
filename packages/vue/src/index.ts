/**
 * @onchainux/vue
 *
 * Vue 3 adapter for OnChainUX white-label UI toolkit.
 */

export { default as OnChainUXProvider } from './OnChainUXProvider.vue.js';
export type { OnChainUXProviderProps } from './OnChainUXProvider.vue.js';

export { ONCHAINUX_KEY } from './types.js';
export type { OnChainUXConfig, OnChainUXContext, AccountState, Connector, ChainConfig, ThemeMode } from './types.js';

export { OcxConnectButton, OcxConnectModal, OcxChainSwitcher } from './components.js';

export {
  useOnChainUX,
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
} from './composables.js';
