/**
 * @file Nuxt composables for Cinacoin.
 *
 * These are auto-imported into every Nuxt page/component when
 * `@cinacoin/nuxt` is installed.
 *
 * Includes:
 * - useCinacoin, useCinacoinAccount, useCinacoinNetwork (base)
 * - useWalletCapabilities, useSendCalls, useCallsStatus, useAtomicBatch (EIP-5792)
 */
import type { Cinacoin } from '@cinacoin/vue'
import { useNuxtApp } from '#imports'

// Re-export EIP-5792 composables from @cinacoin/vue for auto-import in Nuxt
export {
  useWalletCapabilities,
  useSendCalls,
  useCallsStatus,
  useAtomicBatch,
} from '@cinacoin/vue'

export type {
  UseWalletCapabilitiesReturn,
  UseSendCallsReturn,
  UseCallsStatusReturn,
  UseAtomicBatchReturn,
  SendCallsOptions,
  AtomicBatchOptions,
} from '@cinacoin/vue'

/**
 * Access the Cinacoin application instance.
 *
 * @example
 * ```ts
 * const { cinaConnect } = useCinacoin()
 * await cinaConnect.connect()
 * ```
 */
export function useCinacoin() {
  const nuxtApp = useNuxtApp()
  const cinaConnect = nuxtApp.$cinaConnect as Cinacoin

  return { cinaConnect }
}

/**
 * Reactive account state — address, balance, chain, connected flag.
 *
 * @example
 * ```ts
 * const { address, isConnected } = useCinacoinAccount()
 * ```
 */
export function useCinacoinAccount() {
  const { cinaConnect } = useCinacoin()

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
 * const { networks, switchNetwork } = useCinacoinNetwork()
 * switchNetwork('arbitrum')
 * ```
 */
export function useCinacoinNetwork() {
  const { cinaConnect } = useCinacoin()

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
