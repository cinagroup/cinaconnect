/**
 * Vue composables for Cinacoin.
 *
 * All composables require being used within <CinacoinProvider>.
 */
import { type CinacoinContext } from './types.js';
/**
 * useCinacoin — access the full Cinacoin context.
 *
 * ```vue
 * <script setup>
 * const { connect, disconnect, account, status } = useCinacoin()
 * </script>
 * ```
 */
export declare function useCinacoin(): CinacoinContext;
/**
 * useAccount — access the current account state.
 *
 * ```vue
 * <script setup>
 * const { address, balance, chainSymbol } = useAccount()
 * </script>
 * ```
 */
export declare function useAccount(): import("vue").Ref<import("./types.js").AccountState, import("./types.js").AccountState>;
/**
 * useChainId — access the current chain ID.
 */
export declare function useChainId(): number | null;
/**
 * useConnect — connect to a wallet.
 */
export declare function useConnect(): {
    connect: (connectorId: string) => Promise<void>;
    status: import("vue").Ref<"connected" | "connecting" | "error" | "disconnected", "connected" | "connecting" | "error" | "disconnected">;
    isSwitchingChain: import("vue").Ref<boolean, boolean>;
};
/**
 * useDisconnect — disconnect from the current wallet.
 */
export declare function useDisconnect(): {
    disconnect: () => Promise<void>;
};
//# sourceMappingURL=composables.d.ts.map