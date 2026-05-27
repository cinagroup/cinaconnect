/**
 * React hooks for Cinacoin.
 *
 * All hooks require being used within <CinacoinProvider>.
 */
import { useCinacoinContext } from './CinacoinProvider.js';
/**
 * useCinacoin — access the full Cinacoin context.
 *
 * ```tsx
 * const { connect, disconnect, account, status } = useCinacoin();
 * ```
 */
export function useCinacoin() {
    return useCinacoinContext();
}
/**
 * useAccount — access the current account state.
 *
 * ```tsx
 * const { address, balance, chainSymbol } = useAccount();
 * ```
 */
export function useAccount() {
    const { account } = useCinacoinContext();
    return account;
}
/**
 * useChainId — access the current chain ID.
 *
 * ```tsx
 * const chainId = useChainId();
 * ```
 */
export function useChainId() {
    const { account } = useCinacoinContext();
    return account.chainId;
}
/**
 * useConnect — connect to a wallet.
 *
 * ```tsx
 * const { connect, status, isSwitchingChain } = useConnect();
 *
 * // Connect to MetaMask
 * <button onClick={() => connect('metamask')}>Connect</button>
 * ```
 */
export function useConnect() {
    const { connect, status, isSwitchingChain } = useCinacoinContext();
    return { connect, status, isSwitchingChain };
}
/**
 * useDisconnect — disconnect from the current wallet.
 *
 * ```tsx
 * const { disconnect } = useDisconnect();
 *
 * <button onClick={() => disconnect()}>Disconnect</button>
 * ```
 */
export function useDisconnect() {
    const { disconnect } = useCinacoinContext();
    return { disconnect };
}
//# sourceMappingURL=hooks.js.map