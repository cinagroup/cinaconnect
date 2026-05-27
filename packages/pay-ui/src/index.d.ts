/**
 * @cinacoin/pay-ui
 *
 * Cinacoin Pay UI Components — Swap & On-Ramp widgets.
 *
 * Built with React + Web Components architecture.
 * Core logic is framework-agnostic (SwapWidgetCore, OnRampWidgetCore).
 *
 * @example
 * ```tsx
 * import { SwapWidget, OnRampWidget } from '@cinacoin/pay-ui';
 *
 * // Swap widget
 * <SwapWidget
 *   chainId={1}
 *   walletAddress={address}
 *   supportedTokens={tokens}
 *   onSwapComplete={(receipt) => console.log(receipt.txHash)}
 * />
 *
 * // On-Ramp widget
 * <OnRampWidget
 *   destinationAddress={address}
 *   defaultFiatAmount={100}
 *   defaultFiatCurrency="USD"
 *   onComplete={(result) => console.log(result.orderId)}
 * />
 * ```
 */
export { SwapWidget } from "./SwapWidget.js";
export type { SwapWidgetProps } from "./types.js";
export { OnRampWidget } from "./OnRampWidget.js";
export type { OnRampWidgetProps } from "./types.js";
export { SwapWidgetCore } from "./SwapWidgetCore.js";
export { OnRampWidgetCore } from "./OnRampWidgetCore.js";
export type { SwapWidgetState, SwapWidgetCoreConfig, SwapWidgetCoreState, SlippageConfig, OnRampWidgetState, OnRampWidgetCoreConfig, OnRampWidgetCoreState, } from "./types.js";
export { colors, spacing, borderRadius, fontSize, fontWeight, shadows, transitions, zIndices, getWidgetStyles, buttonStyles, inputStyles, cardStyles, } from "./styles.js";
//# sourceMappingURL=index.d.ts.map