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

// React Components
export { SwapWidget } from "./SwapWidget.js";
export type { SwapWidgetProps } from "./types.js";

export { OnRampWidget } from "./OnRampWidget.js";
export type { OnRampWidgetProps } from "./types.js";

// Framework-agnostic core controllers
export { SwapWidgetCore } from "./SwapWidgetCore.js";
export { OnRampWidgetCore } from "./OnRampWidgetCore.js";

// Types
export type {
  // Swap
  SwapWidgetState,
  SwapWidgetCoreConfig,
  SwapWidgetCoreState,
  SlippageConfig,
  // On-Ramp
  OnRampWidgetState,
  OnRampWidgetCoreConfig,
  OnRampWidgetCoreState,
} from "./types.js";

// Styles
export {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  transitions,
  zIndices,
  getWidgetStyles,
  buttonStyles,
  inputStyles,
  cardStyles,
} from "./styles.js";
