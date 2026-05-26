/**
 * @cinaconnect/codemod — Codemods for migrating to CinaConnect
 *
 * CLI entry point that discovers and runs codemods.
 */

export { transformAppKitToCinaConnect, type CodemodResult as AppKitCodemodResult } from "./codemods/appkit-to-cinaconnect.js";
export { transformWcV1ToV2, type CodemodResult as WcCodemodResult } from "./codemods/wc-v1-to-v2.js";
export { transformRainbowKitToCinaConnect, type CodemodResult as RainbowKitCodemodResult } from "./codemods/rainbowkit-to-cinaconnect.js";
export { transformConnectKitToCinaConnect, type CodemodResult as ConnectKitCodemodResult } from "./codemods/connectkit-to-cinaconnect.js";

/** Map of transform name → transform function */
export const TRANSFORMS: Record<string, (source: string) => { transformed: boolean; original: string; output: string; changes: string[] }> = {
  "appkit-to-cinaconnect": transformAppKitToCinaConnect,
  "wc-v1-to-v2": transformWcV1ToV2,
  "rainbowkit-to-cinaconnect": transformRainbowKitToCinaConnect,
  "connectkit-to-cinaconnect": transformConnectKitToCinaConnect,
};

/** List all available transform names */
export function listTransforms(): string[] {
  return Object.keys(TRANSFORMS);
}
