/**
 * appkit-to-cinacoin codemod
 *
 * Transforms:
 *   - @reown/appkit*     → @cinacoin/*
 *   - @web3modal/*       → @cinacoin/*
 *   - Web3Modal           → Cinacoin
 *   - createWeb3Modal     → createCinacoin
 *   - AppKit              → Cinacoin
 *   - useWeb3Modal        → useCinacoin
 *   - W3mButton           → CinacoinButton
 *   - W3mNetworkSelect    → CinacoinNetworkSelect
 *   - Config object keys  → CinacoinConfig keys
 */
export interface CodemodResult {
    transformed: boolean;
    original: string;
    output: string;
    changes: string[];
}
/**
 * Apply the AppKit/Web3Modal → Cinacoin transformation to source text.
 */
export declare function transformAppKitToCinacoin(source: string): CodemodResult;
//# sourceMappingURL=appkit-to-onchainux.d.ts.map