import { GasPriceCache } from './cache.js';
import { EVMEstimator } from './chains/evm.js';
import { SolanaEstimator } from './chains/solana.js';
import type {
  GasEstimatorConfig,
  EvmGasEstimate,
  SolanaGasEstimate,
  GasPriceData,
  GasPricePrediction,
  FeeHistoryEntry,
} from './types.js';

/**
 * GasEstimator — Unified gas estimation for EVM and Solana chains.
 */
export class GasEstimator {
  private evm: EVMEstimator;
  private solana: SolanaEstimator;
  private cache: GasPriceCache;

  constructor(config: GasEstimatorConfig = {}) {
    this.cache = new GasPriceCache(config);
    this.evm = new EVMEstimator(this.cache);
    this.solana = new SolanaEstimator(this.cache);
  }

  /**
   * Estimate EVM gas (EIP-1559).
   */
  async estimateEvm(
    gasLimit: bigint,
    baseFeePerGas: bigint,
    priorityFeePerGas: bigint,
  ): Promise<EvmGasEstimate> {
    return this.evm.estimate(gasLimit, baseFeePerGas, priorityFeePerGas);
  }

  /**
   * Estimate Solana compute budget.
   */
  async estimateSolana(
    computeUnits?: number,
    computeUnitPrice?: bigint,
  ): Promise<SolanaGasEstimate> {
    return this.solana.estimate(computeUnits, computeUnitPrice);
  }

  /**
   * Get current gas price for an EVM chain.
   */
  async getGasPrice(rpcUrl: string): Promise<GasPriceData> {
    return this.evm.getGasPrice(rpcUrl);
  }

  /**
   * Get fee history for EVM chains.
   */
  async getFeeHistory(
    blockCount: number,
    newestBlock?: string,
    rewardPercentiles?: number[],
  ): Promise<FeeHistoryEntry[]> {
    return this.evm.getFeeHistory(blockCount, newestBlock, rewardPercentiles);
  }

  /**
   * Predict gas prices for different speed tiers.
   */
  async predictGasPrices(
    baseFeePerGas: bigint,
    history: FeeHistoryEntry[],
  ): Promise<GasPricePrediction> {
    return this.evm.predict(baseFeePerGas, history);
  }

  /**
   * Get the gas cache.
   */
  getCache(): GasPriceCache {
    return this.cache;
  }

  /**
   * Clear all cached gas data.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
