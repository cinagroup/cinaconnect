/**
 * @file Nuxt composables for CinaConnect.
 *
 * These are auto-imported into every Nuxt page/component when
 * `@cinaconnect/nuxt` is installed.
 *
 * Includes:
 * - useCinaConnect, useCinaConnectAccount, useCinaConnectNetwork (base)
 * - useWalletCapabilities, useSendCalls, useCallsStatus, useAtomicBatch (EIP-5792)
 */
import type { CinaConnect } from '@cinaconnect/vue'
import { useNuxtApp } from '#imports'

// Re-export EIP-5792 composables from @cinaconnect/vue for auto-import in Nuxt
export {
  useWalletCapabilities,
  useSendCalls,
  useCallsStatus,
  useAtomicBatch,
} from '@cinaconnect/vue'

export type {
  UseWalletCapabilitiesReturn,
  UseSendCallsReturn,
  UseCallsStatusReturn,
  UseAtomicBatchReturn,
  SendCallsOptions,
  AtomicBatchOptions,
} from '@cinaconnect/vue'

/**
 * Access the CinaConnect application instance.
 *
 * @example
 * ```ts
 * const { cinaConnect } = useCinaConnect()
 * await cinaConnect.connect()
 * ```
 */
export function useCinaConnect() {
  const nuxtApp = useNuxtApp()
  const cinaConnect = nuxtApp.$cinaConnect as CinaConnect

  return { cinaConnect }
}

/**
 * Reactive account state — address, balance, chain, connected flag.
 *
 * @example
 * ```ts
 * const { address, isConnected } = useCinaConnectAccount()
 * ```
 */
export function useCinaConnectAccount() {
  const { cinaConnect } = useCinaConnect()

  return {
    /** Connected address, or `undefined`. */
    get address() {
      return cinaConnect.address
    },
    /** Balance as a formatted string, or `undefined`. */
    get balance() {
      return cinaConnect.balance
    },
    /** Current chain identifier, or `undefined`. */
    get chain() {
      return cinaConnect.chain
    },
    /** Whether a wallet is connected. */
    get isConnected() {
      return cinaConnect.isConnected
    },
  }
}

/**
 * Network selection composable.
 *
 * @example
 * ```ts
 * const { networks, switchNetwork } = useCinaConnectNetwork()
 * switchNetwork('arbitrum')
 * ```
 */
export function useCinaConnectNetwork() {
  const { cinaConnect } = useCinaConnect()

  /**
   * Switch the connected wallet to the given network.
   */
  async function switchNetwork(network: string): Promise<void> {
    await cinaConnect.switchNetwork(network)
  }

  return {
    /** Configured networks. */
    networks: cinaConnect.networks,
    switchNetwork,
  }
}
