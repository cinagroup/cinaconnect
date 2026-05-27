/**
 * wc-v1-to-v2 codemod
 *
 * Transforms WalletConnect v1 patterns → WalletConnect v2 / Cinacoin patterns:
 *   - bridge URL      → projectId
 *   - v1 provider init → v2 Web3Modal / Cinacoin init
 *   - v1 events       → v2 event names
 *   - v1 methods      → v2 methods
 */
export interface CodemodResult {
    transformed: boolean;
    original: string;
    output: string;
    changes: string[];
}
/**
 * Apply WalletConnect v1 → v2 transformation.
 */
export declare function transformWcV1ToV2(source: string): CodemodResult;
//# sourceMappingURL=wc-v1-to-v2.d.ts.map