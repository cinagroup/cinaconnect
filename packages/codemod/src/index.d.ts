/**
 * @cinacoin/codemod — Codemods for migrating to Cinacoin
 *
 * CLI entry point that discovers and runs codemods.
 */
export { transformAppKitToCinacoin, type CodemodResult as AppKitCodemodResult } from "./codemods/appkit-to-cinacoin.js";
export { transformWcV1ToV2, type CodemodResult as WcCodemodResult } from "./codemods/wc-v1-to-v2.js";
/** Map of transform name → transform function */
export declare const TRANSFORMS: Record<string, (source: string) => {
    transformed: boolean;
    original: string;
    output: string;
    changes: string[];
}>;
/** List all available transform names */
export declare function listTransforms(): string[];
//# sourceMappingURL=index.d.ts.map