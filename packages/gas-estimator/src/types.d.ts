/**
 * Gas estimation types for @cinacoin/gas-estimator
 */
export interface EvmGasEstimate {
    gasLimit: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    baseFeePerGas?: bigint;
    estimatedCost: bigint;
}
export interface LegacyGasEstimate {
    gasLimit: bigint;
    gasPrice: bigint;
    estimatedCost: bigint;
}
export interface SolanaGasEstimate {
    computeUnits: number;
    computeUnitPrice: bigint;
    baseFee: bigint;
    estimatedCost: bigint;
}
export interface FeeHistoryEntry {
    baseFeePerGas: bigint;
    gasUsedRatio: number;
    reward?: bigint[];
}
export interface GasPricePrediction {
    slow: {
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
        estimatedTime: number;
    };
    standard: {
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
        estimatedTime: number;
    };
    fast: {
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
        estimatedTime: number;
    };
}
export type ChainType = 'evm' | 'solana';
export interface GasEstimatorConfig {
    cacheTtlMs?: number;
    rpcUrl?: string;
}
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
//# sourceMappingURL=types.d.ts.map