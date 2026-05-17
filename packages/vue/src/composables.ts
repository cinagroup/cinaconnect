/**
 * Vue composables for OnChainUX.
 *
 * All composables require being used within <OnChainUXProvider>.
 */

import { inject } from 'vue';
import { ONCHAINUX_KEY, type OnChainUXContext } from './types.js';

/**
 * useOnChainUX — access the full OnChainUX context.
 *
 * ```vue
 * <script setup>
 * const { connect, disconnect, account, status } = useOnChainUX()
 * </script>
 * ```
 */
export function useOnChainUX(): OnChainUXContext {
  const ctx = inject<OnChainUXContext | null>(ONCHAINUX_KEY, null);
  if (!ctx) {
    throw new Error('useOnChainUX must be used within <OnChainUXProvider>');
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
  const { account } = useOnChainUX();
  return account;
}

/**
 * useChainId — access the current chain ID.
 */
export function useChainId() {
  const { account } = useOnChainUX();
  return account.value.chainId;
}

/**
 * useConnect — connect to a wallet.
 */
export function useConnect() {
  const { connect, status, isSwitchingChain } = useOnChainUX();
  return { connect, status, isSwitchingChain };
}

/**
 * useDisconnect — disconnect from the current wallet.
 */
export function useDisconnect() {
  const { disconnect } = useOnChainUX();
  return { disconnect };
}
