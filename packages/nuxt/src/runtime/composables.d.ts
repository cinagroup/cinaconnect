/**
 * Access the Cinacoin application instance.
 *
 * @example
 * ```ts
 * const { cinaConnect } = useCinacoin()
 * await cinaConnect.connect()
 * ```
 */
export declare function useCinacoin(): {
    cinaConnect: Cinacoin;
};
/**
 * Reactive account state — address, balance, chain, connected flag.
 *
 * @example
 * ```ts
 * const { address, isConnected } = useCinacoinAccount()
 * ```
 */
export declare function useCinacoinAccount(): {
    /** Connected address, or `undefined`. */
    readonly address: any;
    /** Balance as a formatted string, or `undefined`. */
    readonly balance: any;
    /** Current chain identifier, or `undefined`. */
    readonly chain: any;
    /** Whether a wallet is connected. */
    readonly isConnected: any;
};
/**
 * Network selection composable.
 *
 * @example
 * ```ts
 * const { networks, switchNetwork } = useCinacoinNetwork()
 * switchNetwork('arbitrum')
 * ```
 */
export declare function useCinacoinNetwork(): {
    /** Configured networks. */
    networks: any;
    switchNetwork: (network: string) => Promise<void>;
};
//# sourceMappingURL=composables.d.ts.map