// @cinacoin/gas-estimator
// Gas estimation for EVM and Solana

export { GasEstimator } from './estimator.js';
export { GasPriceCache } from './cache.js';
export { EVMEstimator } from './chains/evm.js';
export { SolanaEstimator } from './chains/solana.js';
export type {
  EvmGasEstimate,
  SolanaGasEstimate,
  LegacyGasEstimate,
  FeeHistoryEntry,
  GasPricePrediction,
  ChainType,
  GasEstimatorConfig,
  GasCache,
  GasPriceData,
  GasEstimationResult,
  ChainConfig,
  RpcResponse,
} from './types.js';
export { DEFAULT_CHAINS } from './types.js';
