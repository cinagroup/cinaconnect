/**
 * Gas estimation types for @cinacoin/gas-estimator
 */

export interface EvmGasEstimate {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  baseFeePerGas?: bigint;
  estimatedCost: bigint; // total in wei
}

export interface LegacyGasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  estimatedCost: bigint;
}

export interface SolanaGasEstimate {
  computeUnits: number;
  computeUnitPrice: bigint; // micro-lamports
  baseFee: bigint; // lamports
  estimatedCost: bigint; // total in lamports
}

export interface FeeHistoryEntry {
  baseFeePerGas: bigint;
  gasUsedRatio: number;
  reward?: bigint[];
}

export interface GasPricePrediction {
  slow: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; estimatedTime: number };
  standard: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; estimatedTime: number };
  fast: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; estimatedTime: number };
}

export type ChainType = 'evm' | 'solana';

export interface GasEstimatorConfig {
  cacheTtlMs?: number;
  rpcUrl?: string;
  /** Custom chain configs to override/extend defaults */
  chains?: Record<number, ChainConfig>;
  /** Maximum RPC request timeout in ms */
  rpcTimeoutMs?: number;
}

/**
 * Known chain configurations with default RPC URLs.
 */
export interface ChainConfig {
  chainId: number;
  name: string;
  defaultRpcUrl: string;
  type: ChainType;
  blockTimeMs?: number;
}

export const DEFAULT_CHAINS: Record<number, ChainConfig> = {
  1: { chainId: 1, name: 'Ethereum', defaultRpcUrl: 'https://eth.llamarpc.com', type: 'evm', blockTimeMs: 12_000 },
  137: { chainId: 137, name: 'Polygon', defaultRpcUrl: 'https://polygon-rpc.com', type: 'evm', blockTimeMs: 2_000 },
  56: { chainId: 56, name: 'BNB Chain', defaultRpcUrl: 'https://bsc-dataseed.binance.org', type: 'evm', blockTimeMs: 3_000 },
  42161: { chainId: 42161, name: 'Arbitrum', defaultRpcUrl: 'https://arb1.arbitrum.io/rpc', type: 'evm', blockTimeMs: 1_000 },
  10: { chainId: 10, name: 'Optimism', defaultRpcUrl: 'https://mainnet.optimism.io', type: 'evm', blockTimeMs: 2_000 },
  8453: { chainId: 8453, name: 'Base', defaultRpcUrl: 'https://mainnet.base.org', type: 'evm', blockTimeMs: 2_000 },
  100: { chainId: 100, name: 'Gnosis', defaultRpcUrl: 'https://rpc.gnosischain.com', type: 'evm', blockTimeMs: 5_000 },
  43114: { chainId: 43114, name: 'Avalanche', defaultRpcUrl: 'https://api.avax.network/ext/bc/C/rpc', type: 'evm', blockTimeMs: 2_000 },
};

export interface GasCache {
  get(key: string): GasPriceData | undefined;
  set(key: string, data: GasPriceData): void;
  has(key: string): boolean;
  clear(): void;
}

export interface GasPriceData {
  gasPrice: bigint;
  baseFee?: bigint;
  priorityFee?: bigint;
  timestamp: number;
}

export interface GasEstimationResult {
  chainType: ChainType;
  estimate: EvmGasEstimate | SolanaGasEstimate | LegacyGasEstimate;
}

/**
 * Raw JSON-RPC response helpers.
 */
export interface RpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result: T;
  error?: { code: number; message: string };
}
