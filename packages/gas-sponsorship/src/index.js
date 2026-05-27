/**
 * @module @cinacoin/gas-sponsorship
 * Enterprise gas sponsorship for smart accounts via paymaster integration.
 *
 * Supports Pimlico, Alchemy, and Candle paymasters.
 */
// Core
export { GasSponsor } from "./GasSponsor";
// Paymaster integrations
export { getPaymasterData, getPaymasterAndData, detectProvider, } from "./paymaster";
// React hook
export { useGasSponsorship } from "./hooks/useGasSponsorship";
// React components
export { GasEstimator } from "./components/GasEstimator";
//# sourceMappingURL=index.js.map