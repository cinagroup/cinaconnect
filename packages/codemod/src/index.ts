/**
 * @cinacoin/codemod — Codemods for migrating to Cinacoin
 *
 * CLI entry point that discovers and runs codemods.
 */

export { transformAppKitToCinacoin, type CodemodResult as AppKitCodemodResult } from "./codemods/appkit-to-cinacoin.js";
export { transformWcV1ToV2, type CodemodResult as WcCodemodResult } from "./codemods/wc-v1-to-v2.js";
export { transformRainbowKitToCinacoin, type CodemodResult as RainbowKitCodemodResult } from "./codemods/rainbowkit-to-cinacoin.js";
export { transformConnectKitToCinacoin, type CodemodResult as ConnectKitCodemodResult } from "./codemods/connectkit-to-cinacoin.js";

/** Map of transform name → transform function */
export const TRANSFORMS: Record<string, (source: string) => { transformed: boolean; original: string; output: string; changes: string[] }> = {
  "appkit-to-cinacoin": transformAppKitToCinacoin,
  "wc-v1-to-v2": transformWcV1ToV2,
  "rainbowkit-to-cinacoin": transformRainbowKitToCinacoin,
  "connectkit-to-cinacoin": transformConnectKitToCinacoin,
};

/** List all available transform names */
export function listTransforms(): string[] {
  return Object.keys(TRANSFORMS);
}
