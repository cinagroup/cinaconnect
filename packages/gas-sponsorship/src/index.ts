/**
 * @module @cinacoin/gas-sponsorship
 * Enterprise gas sponsorship for smart accounts via paymaster integration.
 *
 * Supports Pimlico, Alchemy, and Candle paymasters.
 */

// Types
export type {
  SponsorshipConfig,
  GasEstimate,
  SponsorshipResult,
  ChainNativeToken,
  PaymasterProvider,
  PaymasterBalance,
} from "./types";

// Core
export { GasSponsor } from "./GasSponsor";

// Paymaster integrations
export {
  getPaymasterData,
  getPaymasterAndData,
  detectProvider,
} from "./paymaster";

// React hook
export { useGasSponsorship } from "./hooks/useGasSponsorship";
export type { UseGasSponsorshipReturn } from "./hooks/useGasSponsorship";

// React components
export { GasEstimator } from "./components/GasEstimator";
export type { GasEstimatorProps } from "./components/GasEstimator";
