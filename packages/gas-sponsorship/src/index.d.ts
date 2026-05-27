/**
 * @module @cinacoin/gas-sponsorship
 * Enterprise gas sponsorship for smart accounts via paymaster integration.
 *
 * Supports Pimlico, Alchemy, and Candle paymasters.
 */
export type { SponsorshipConfig, GasEstimate, SponsorshipResult, ChainNativeToken, PaymasterProvider, PaymasterBalance, } from "./types";
export { GasSponsor } from "./GasSponsor";
export { getPaymasterData, getPaymasterAndData, detectProvider, } from "./paymaster";
export { useGasSponsorship } from "./hooks/useGasSponsorship";
export type { UseGasSponsorshipReturn } from "./hooks/useGasSponsorship";
export { GasEstimator } from "./components/GasEstimator";
export type { GasEstimatorProps } from "./components/GasEstimator";
//# sourceMappingURL=index.d.ts.map