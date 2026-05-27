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
  ChainConfig,
} from './types.js';
import { DEFAULT_CHAINS } from './types.js';

/**
 * GasEstimator — Unified gas estimation for EVM and Solana chains.
 *
 * Uses real JSON-RPC calls for gas price fetching:
 *  - EVM: eth_gasPrice, eth_feeHistory
 *  - Solana: getRecentPrioritizationFees, simulateTransaction
 *
 * Supports multi-chain with configurable RPC endpoints.
 * Includes TTL-based caching to avoid excessive RPC calls.
 */
export class GasEstimator {
  private evm: EVMEstimator;
  private solana: SolanaEstimator;
  private cache: GasPriceCache;
  private chains: Record<number, ChainConfig>;
  private rpcTimeoutMs: number;

  constructor(config: GasEstimatorConfig = {}) {
    this.cache = new GasPriceCache(config);
    this.chains = config.chains ?? DEFAULT_CHAINS;
    this.rpcTimeoutMs = config.rpcTimeoutMs ?? 10_000;

    this.evm = new EVMEstimator(this.cache, {
      rpcTimeoutMs: this.rpcTimeoutMs,
      chains: this.chains,
      defaultRpcUrl: config.rpcUrl,
    });

    this.solana = new SolanaEstimator(this.cache, {
      rpcTimeoutMs: this.rpcTimeoutMs,
      defaultRpcUrl: 'https://api.mainnet-beta.solana.com',
    });
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
    rpcUrl?: string,
  ): Promise<SolanaGasEstimate> {
    return this.solana.estimate(computeUnits, computeUnitPrice);
  }

  /**
   * Get current gas price for an EVM chain via real RPC.
   *
   * @param rpcUrl RPC URL (or uses default if chainId is provided)
   */
  async getGasPrice(rpcUrl?: string): Promise<GasPriceData> {
    return this.evm.getGasPrice(rpcUrl);
  }

  /**
   * Get gas price for a specific EVM chain ID.
   */
  async getGasPriceForChain(chainId: number): Promise<GasPriceData> {
    return this.evm.getGasPriceForChain(chainId);
  }

  /**
   * Get EIP-1559 gas prices (base fee + priority fee) for an EVM chain.
   */
  async getEip1559GasPrices(chainId: number): Promise<{
    baseFee: bigint;
    priorityFee: bigint;
    gasPrice: bigint;
  }> {
    return this.evm.getEip1559GasPrices(chainId);
  }

  /**
   * Get fee history for EVM chains via real RPC.
   */
  async getFeeHistory(
    blockCount: number,
    newestBlock?: string,
    rewardPercentiles?: number[],
    rpcUrl?: string,
  ): Promise<FeeHistoryEntry[]> {
    return this.evm.getFeeHistory(blockCount, newestBlock, rewardPercentiles, rpcUrl);
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

  /**
   * Get registered chain configs.
   */
  getChains(): Record<number, ChainConfig> {
    return this.chains;
  }

  /**
   * Register or override a chain config.
   */
  registerChain(chain: ChainConfig): void {
    this.chains[chain.chainId] = chain;
    // Update EVM estimator with new chains
    this.evm = new EVMEstimator(this.cache, {
      rpcTimeoutMs: this.rpcTimeoutMs,
      chains: this.chains,
      defaultRpcUrl: this.chains[1]?.defaultRpcUrl,
    });
  }
}
