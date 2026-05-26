/**
 * Vue composables for CinaConnect.
 *
 * All composables require being used within <CinaConnectProvider>.
 */

import { inject } from 'vue';
import { ONCHAINUX_KEY, type CinaConnectContext } from './types.js';

/**
 * useCinaConnect — access the full CinaConnect context.
 *
 * ```vue
 * <script setup>
 * const { connect, disconnect, account, status } = useCinaConnect()
 * </script>
 * ```
 */
export function useCinaConnect(): CinaConnectContext {
  const ctx = inject<CinaConnectContext | null>(ONCHAINUX_KEY, null);
  if (!ctx) {
    throw new Error('useCinaConnect must be used within <CinaConnectProvider>');
  }
  return ctx;
}

/**
 * useAccount — access the current account state.
 *
 * ```vue
 * <script setup>
 * const { address, balance, chainSymbol } = useAccount()
 * </script>
 * ```
 */
export function useAccount() {
  const { account } = useCinaConnect();
  return account;
}

/**
 * useChainId — access the current chain ID.
 */
export function useChainId() {
  const { account } = useCinaConnect();
  return account.value.chainId;
}

/**
 * useConnect — connect to a wallet.
 */
export function useConnect() {
  const { connect, status, isSwitchingChain } = useCinaConnect();
  return { connect, status, isSwitchingChain };
}

/**
 * useDisconnect — disconnect from the current wallet.
 */
export function useDisconnect() {
  const { disconnect } = useCinaConnect();
  return { disconnect };
}

// EIP-5792 composables
export {
  useWalletCapabilities,
  useSendCalls,
  useAtomicBatch,
  useCallsStatus,
} from './composables/useEIP5792.js';

export type {
  UseWalletCapabilitiesReturn,
  UseSendCallsReturn,
  UseAtomicBatchReturn,
  UseCallsStatusReturn,
  SendCallsOptions,
  AtomicBatchOptions,
} from './composables/useEIP5792.js';
