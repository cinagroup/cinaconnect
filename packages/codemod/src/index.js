/**
 * @cinacoin/codemod — Codemods for migrating to Cinacoin
 *
 * CLI entry point that discovers and runs codemods.
 */
export { transformAppKitToCinacoin } from "./codemods/appkit-to-cinacoin.js.js";
export { transformWcV1ToV2 } from "./codemods/wc-v1-to-v2.js.js";
/** Map of transform name → transform function */
export const TRANSFORMS = {
    "appkit-to-cinacoin": transformAppKitToCinacoin,
    "wc-v1-to-v2": transformWcV1ToV2,
};
/** List all available transform names */
export function listTransforms() {
    return Object.keys(TRANSFORMS);
}
//# sourceMappingURL=index.js.map