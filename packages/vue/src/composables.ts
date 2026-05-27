/**
 * Vue composables for Cinacoin.
 *
 * All composables require being used within <CinacoinProvider>.
 */

import { inject } from 'vue';
import { ONCHAINUX_KEY, type CinacoinContext } from './types.js';

/**
 * useCinacoin — access the full Cinacoin context.
 *
 * ```vue
 * <script setup>
 * const { connect, disconnect, account, status } = useCinacoin()
 * </script>
 * ```
 */
export function useCinacoin(): CinacoinContext {
  const ctx = inject<CinacoinContext | null>(ONCHAINUX_KEY, null);
  if (!ctx) {
    throw new Error('useCinacoin must be used within <CinacoinProvider>');
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
  const { account } = useCinacoin();
  return account;
}

/**
 * useChainId — access the current chain ID.
 */
export function useChainId() {
  const { account } = useCinacoin();
  return account.value.chainId;
}

/**
 * useConnect — connect to a wallet.
 */
export function useConnect() {
  const { connect, status, isSwitchingChain } = useCinacoin();
  return { connect, status, isSwitchingChain };
}

/**
 * useDisconnect — disconnect from the current wallet.
 */
export function useDisconnect() {
  const { disconnect } = useCinacoin();
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
