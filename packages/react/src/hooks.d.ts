/**
 * React hooks for Cinacoin.
 *
 * All hooks require being used within <CinacoinProvider>.
 */
import { type CinacoinContextValue, type AccountState } from './CinacoinProvider.js';
/**
 * useCinacoin — access the full Cinacoin context.
 *
 * ```tsx
 * const { connect, disconnect, account, status } = useCinacoin();
 * ```
 */
export declare function useCinacoin(): CinacoinContextValue;
/**
 * useAccount — access the current account state.
 *
 * ```tsx
 * const { address, balance, chainSymbol } = useAccount();
 * ```
 */
export declare function useAccount(): AccountState;
/**
 * useChainId — access the current chain ID.
 *
 * ```tsx
 * const chainId = useChainId();
 * ```
 */
export declare function useChainId(): number | null;
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
export declare function useConnect(): {
    connect: (connectorId: string) => Promise<void>;
    status: CinacoinContextValue['status'];
    isSwitchingChain: boolean;
};
/**
 * useDisconnect — disconnect from the current wallet.
 *
 * ```tsx
 * const { disconnect } = useDisconnect();
 *
 * <button onClick={() => disconnect()}>Disconnect</button>
 * ```
 */
export declare function useDisconnect(): {
    disconnect: () => Promise<void>;
};
//# sourceMappingURL=hooks.d.ts.map