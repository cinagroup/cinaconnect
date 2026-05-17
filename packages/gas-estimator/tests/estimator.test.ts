import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GasEstimator, GasPriceCache } from '../src/index.js';
import { EVMEstimator } from '../src/chains/evm.js';
import { SolanaEstimator } from '../src/chains/solana.js';

describe('GasEstimator', () => {
  let estimator: GasEstimator;

  beforeEach(() => {
    estimator = new GasEstimator();
  });

  describe('estimateEvm', () => {
    it('should estimate EIP-1559 gas correctly', async () => {
      const result = await estimator.estimateEvm(
        21000n,
        20_000_000_000n,
        2_000_000_000n,
      );
      expect(result.gasLimit).toBe(21000n);
      expect(result.maxFeePerGas).toBe(20_000_000_000n * 2n + 2_000_000_000n);
      expect(result.baseFeePerGas).toBe(20_000_000_000n);
    });

    it('should calculate estimatedCost correctly', async () => {
      const result = await estimator.estimateEvm(
        21000n,
        20_000_000_000n,
        2_000_000_000n,
      );
      const expectedMaxFee = 20_000_000_000n * 2n + 2_000_000_000n;
      expect(result.estimatedCost).toBe(21000n * expectedMaxFee);
    });
  });

  describe('estimateSolana', () => {
    it('should estimate Solana compute budget', async () => {
      const result = await estimator.estimateSolana(200_000, 1000n);
      expect(result.computeUnits).toBe(200_000);
      expect(result.estimatedCost).toBeGreaterThan(0n);
    });

    it('should use default values when none provided', async () => {
      const result = await estimator.estimateSolana();
      expect(result.computeUnits).toBe(200_000);
      expect(result.baseFee).toBe(5000n);
    });
  });

  describe('predictGasPrices', () => {
    it('should predict gas prices for different tiers', async () => {
      const history = [
        { baseFeePerGas: 20_000_000_000n, gasUsedRatio: 0.5 },
        { baseFeePerGas: 22_000_000_000n, gasUsedRatio: 0.7 },
        { baseFeePerGas: 18_000_000_000n, gasUsedRatio: 0.3 },
      ];
      const prediction = await estimator.predictGasPrices(
        20_000_000_000n,
        history,
      );
      expect(prediction.slow).toBeDefined();
      expect(prediction.standard).toBeDefined();
      expect(prediction.fast).toBeDefined();
      expect(prediction.fast.maxFeePerGas).toBeGreaterThan(
        prediction.slow.maxFeePerGas,
      );
    });

    it('should have shorter estimated time for fast tier', async () => {
      const history = [
        { baseFeePerGas: 20_000_000_000n, gasUsedRatio: 0.5 },
      ];
      const prediction = await estimator.predictGasPrices(
        20_000_000_000n,
        history,
      );
      expect(prediction.fast.estimatedTime).toBeLessThan(
        prediction.slow.estimatedTime,
      );
    });
  });

  describe('getGasPrice', () => {
    it('should return cached gas price', async () => {
      const result = await estimator.getGasPrice('https://eth.rpc');
      expect(result.gasPrice).toBeDefined();
    });
  });

  describe('getFeeHistory', () => {
    it('should return fee history entries', async () => {
      const history = await estimator.getFeeHistory(3);
      expect(history.length).toBe(3);
      expect(history[0].baseFeePerGas).toBeDefined();
    });
  });

  describe('cache', () => {
    it('should clear cache', () => {
      estimator.clearCache();
      expect(estimator.getCache()).toBeDefined();
    });
  });
});

describe('GasPriceCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve gas data', () => {
    const cache = new GasPriceCache();
    const data = { gasPrice: 20_000_000_000n, timestamp: Date.now() };
    cache.set('test', data);
    const retrieved = cache.get('test');
    expect(retrieved).toBeDefined();
    expect(retrieved!.gasPrice).toBe(20_000_000_000n);
  });

  it('should expire stale entries', () => {
    const cache = new GasPriceCache({ cacheTtlMs: 1 });
    const data = { gasPrice: 20_000_000_000n, timestamp: Date.now() };
    cache.set('test', data);
    // Wait for TTL to expire
    vi.advanceTimersByTime(10);
    const retrieved = cache.get('test');
    expect(retrieved).toBeUndefined();
  });
});
