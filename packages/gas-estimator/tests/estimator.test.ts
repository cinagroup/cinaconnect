import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GasEstimator, GasPriceCache, DEFAULT_CHAINS } from '../src/index.js';
import { EVMEstimator } from '../src/chains/evm.js';
import { SolanaEstimator } from '../src/chains/solana.js';

// ============================================================
// Helpers
// ============================================================

function mockFetchResponse(result: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Server Error',
    json: () => Promise.resolve({
      jsonrpc: '2.0',
      id: 1,
      result,
    }),
  });
}

function withMockFetch(mockFn: ReturnType<typeof vi.fn>, fn: () => Promise<void>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFn as any;
  return fn().finally(() => { globalThis.fetch = originalFetch; });
}

// ============================================================
// GasEstimator Tests
// ============================================================

describe('GasEstimator', () => {
  let estimator: GasEstimator;

  beforeEach(() => {
    estimator = new GasEstimator();
  });

  describe('estimateEvm', () => {
    it('should estimate EIP-1559 gas correctly', async () => {
      const result = await estimator.estimateEvm(21000n, 20_000_000_000n, 2_000_000_000n);
      expect(result.gasLimit).toBe(21000n);
      expect(result.maxFeePerGas).toBe(20_000_000_000n * 2n + 2_000_000_000n);
      expect(result.baseFeePerGas).toBe(20_000_000_000n);
    });

    it('should calculate estimatedCost correctly', async () => {
      const result = await estimator.estimateEvm(21000n, 20_000_000_000n, 2_000_000_000n);
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
      const prediction = await estimator.predictGasPrices(20_000_000_000n, history);
      expect(prediction.slow).toBeDefined();
      expect(prediction.standard).toBeDefined();
      expect(prediction.fast).toBeDefined();
      expect(prediction.fast.maxFeePerGas).toBeGreaterThan(prediction.slow.maxFeePerGas);
    });

    it('should have shorter estimated time for fast tier', async () => {
      const history = [{ baseFeePerGas: 20_000_000_000n, gasUsedRatio: 0.5 }];
      const prediction = await estimator.predictGasPrices(20_000_000_000n, history);
      expect(prediction.fast.estimatedTime).toBeLessThan(prediction.slow.estimatedTime);
    });

    it('should use real reward data from fee history when available', async () => {
      const history = [
        {
          baseFeePerGas: 20_000_000_000n,
          gasUsedRatio: 0.6,
          reward: [1_000_000_000n, 2_000_000_000n, 5_000_000_000n],
        },
        {
          baseFeePerGas: 22_000_000_000n,
          gasUsedRatio: 0.8,
          reward: [1_200_000_000n, 2_400_000_000n, 6_000_000_000n],
        },
      ];
      const prediction = await estimator.predictGasPrices(20_000_000_000n, history);
      expect(prediction.slow.maxPriorityFeePerGas).toBe(1_100_000_000n);
      expect(prediction.standard.maxPriorityFeePerGas).toBe(2_200_000_000n);
      expect(prediction.fast.maxPriorityFeePerGas).toBe(5_500_000_000n);
    });
  });

  describe('multi-chain', () => {
    it('should have default chain configs', () => {
      const chains = estimator.getChains();
      expect(chains[1]).toBeDefined();
      expect(chains[1].name).toBe('Ethereum');
      expect(chains[137]).toBeDefined();
      expect(chains[42161]).toBeDefined();
      expect(chains[10]).toBeDefined();
    });

    it('should register new chains', () => {
      estimator.registerChain({
        chainId: 99999,
        name: 'TestChain',
        defaultRpcUrl: 'https://test.rpc',
        type: 'evm',
      });
      const chains = estimator.getChains();
      expect(chains[99999]).toBeDefined();
      expect(chains[99999].name).toBe('TestChain');
    });
  });

  describe('getGasPrice — RPC integration', () => {
    it('should fetch gas price from real RPC (mocked)', async () => {
      const mockFn = mockFetchResponse('0x4a817c800');
      await withMockFetch(mockFn, async () => {
        const result = await estimator.getGasPrice('https://test.rpc');
        expect(result.gasPrice).toBe(20_000_000_000n);
        expect(mockFn).toHaveBeenCalledWith(
          'https://test.rpc',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('eth_gasPrice'),
          }),
        );
      });
    });

    it('should use cached data when available', async () => {
      const mockFn = mockFetchResponse('0x4a817c800');
      await withMockFetch(mockFn, async () => {
        const result1 = await estimator.getGasPrice('https://test.rpc2');
        const result2 = await estimator.getGasPrice('https://test.rpc2');
        expect(result1.gasPrice).toBe(20_000_000_000n);
        expect(result2.gasPrice).toBe(20_000_000_000n);
        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });

    it('should throw on first RPC failure with no cache', async () => {
      const mockFn = mockFetchResponse(undefined, false, 500);
      await withMockFetch(mockFn, async () => {
        await expect(estimator.getGasPrice('https://test.rpc4')).rejects.toThrow('Failed to fetch gas price');
      });
    });
  });

  describe('getFeeHistory — RPC integration', () => {
    it('should fetch fee history from real RPC (mocked)', async () => {
      const mockFn = mockFetchResponse({
        oldestBlock: '0x1234567',
        baseFeePerGas: ['0x4a817c800', '0x4d9074c00'],
        gasUsedRatio: [0.5, 0.7],
        reward: [
          ['0x3b9aca00', '0x77359400', '0xb2d05e00'],
          ['0x3b9aca00', '0x77359400', '0xb2d05e00'],
        ],
      });
      await withMockFetch(mockFn, async () => {
        const history = await estimator.getFeeHistory(2, 'latest', [25, 50, 75], 'https://test.rpc5');
        expect(history.length).toBe(2);
        expect(history[0].baseFeePerGas).toBe(20_000_000_000n);
        expect(history[0].gasUsedRatio).toBe(0.5);
        expect(history[0].reward).toBeDefined();
        expect(history[0].reward!.length).toBe(3);
      });
    });

    it('should return defaults on RPC failure', async () => {
      // Mock fails for eth_feeHistory but succeeds for eth_gasPrice (fallback)
      const mockFn = vi.fn()
        .mockResolvedValueOnce({ // eth_feeHistory fails
          ok: false, status: 500, statusText: 'Server Error',
          json: () => Promise.resolve({ error: { code: -32603, message: 'fail' } }),
        })
        .mockResolvedValueOnce({ // eth_gasPrice succeeds for fallback
          ok: true, status: 200,
          json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: '0x4a817c800' }),
        });
      await withMockFetch(mockFn, async () => {
        const history = await estimator.getFeeHistory(3, 'latest', [25, 50, 75], 'https://test.rpc6');
        expect(history.length).toBe(3);
      });
    });
  });

  describe('getEip1559GasPrices', () => {
    it('should throw for unknown chain', async () => {
      const freshEstimator = new GasEstimator({ chains: {} });
      await expect(freshEstimator.getEip1559GasPrices(99999)).rejects.toThrow('Unknown chain ID');
    });

    it('should fetch real gas prices (mocked)', async () => {
      const mockFn = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0', id: 1,
            result: {
              oldestBlock: '0x1234567',
              baseFeePerGas: ['0x4a817c800'],
              gasUsedRatio: [0.5],
              reward: [['0x3b9aca00', '0x77359400', '0xb2d05e00']],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: '0x4a817c800' }),
        });
      await withMockFetch(mockFn, async () => {
        const prices = await estimator.getEip1559GasPrices(1);
        expect(prices.baseFee).toBe(20_000_000_000n);
        expect(prices.priorityFee).toBe(2_000_000_000n);
        expect(prices.gasPrice).toBe(20_000_000_000n);
      });
    });
  });

  describe('getGasPriceForChain', () => {
    it('should use default RPC for known chains', async () => {
      const mockFn = mockFetchResponse('0x4a817c800');
      await withMockFetch(mockFn, async () => {
        estimator.clearCache();
        const result = await estimator.getGasPriceForChain(1);
        expect(result.gasPrice).toBe(20_000_000_000n);
        expect(mockFn).toHaveBeenCalledWith(
          DEFAULT_CHAINS[1].defaultRpcUrl,
          expect.any(Object),
        );
      });
    });

    it('should throw for unknown chains', async () => {
      const freshEstimator = new GasEstimator({ chains: {} });
      await expect(freshEstimator.getGasPriceForChain(99999)).rejects.toThrow('Unknown chain ID');
    });
  });

  describe('cache', () => {
    it('should clear cache', () => {
      estimator.clearCache();
      expect(estimator.getCache()).toBeDefined();
    });
  });
});

// ============================================================
// GasPriceCache Tests
// ============================================================

describe('GasPriceCache', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

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
    vi.advanceTimersByTime(10);
    const retrieved = cache.get('test');
    expect(retrieved).toBeUndefined();
  });
});

// ============================================================
// EVMEstimator Tests
// ============================================================

describe('EVMEstimator', () => {
  let evm: EVMEstimator;
  let cache: GasPriceCache;

  beforeEach(() => {
    cache = new GasPriceCache({ cacheTtlMs: 60_000 });
    evm = new EVMEstimator(cache);
  });

  it('should estimate legacy gas', async () => {
    const result = await evm.estimateLegacy(100_000n, 30_000_000_000n);
    expect(result.gasLimit).toBe(100_000n);
    expect(result.estimatedCost).toBe(100_000n * 30_000_000_000n);
  });

  it('should throw when no default RPC is set', async () => {
    await expect(evm.getGasPrice()).rejects.toThrow('rpcUrl is required');
  });

  it('should throw when no default RPC is set for fee history', async () => {
    await expect(evm.getFeeHistory(3)).rejects.toThrow('rpcUrl is required');
  });

  it('should predict using real reward data', async () => {
    const history = [
      { baseFeePerGas: 20_000_000_000n, gasUsedRatio: 0.6, reward: [1_000_000_000n, 2_000_000_000n, 5_000_000_000n] },
    ];
    const prediction = await evm.predict(20_000_000_000n, history);
    expect(prediction.slow.maxPriorityFeePerGas).toBe(1_000_000_000n);
    expect(prediction.standard.maxPriorityFeePerGas).toBe(2_000_000_000n);
    expect(prediction.fast.maxPriorityFeePerGas).toBe(5_000_000_000n);
  });

  it('should predict using averaged rewards across multiple blocks', async () => {
    const history = [
      { baseFeePerGas: 20_000_000_000n, gasUsedRatio: 0.6, reward: [1_000_000_000n, 2_000_000_000n, 5_000_000_000n] },
      { baseFeePerGas: 22_000_000_000n, gasUsedRatio: 0.7, reward: [1_200_000_000n, 2_400_000_000n, 6_000_000_000n] },
    ];
    const prediction = await evm.predict(20_000_000_000n, history);
    expect(prediction.slow.maxPriorityFeePerGas).toBe(1_100_000_000n);
    expect(prediction.standard.maxPriorityFeePerGas).toBe(2_200_000_000n);
    expect(prediction.fast.maxPriorityFeePerGas).toBe(5_500_000_000n);
  });
});

// ============================================================
// SolanaEstimator Tests
// ============================================================

describe('SolanaEstimator', () => {
  let solana: SolanaEstimator;
  let cache: GasPriceCache;

  beforeEach(() => {
    cache = new GasPriceCache({ cacheTtlMs: 60_000 });
    solana = new SolanaEstimator(cache);
  });

  it('should estimate compute budget', async () => {
    const result = await solana.estimate(200_000, 1000n);
    expect(result.computeUnits).toBe(200_000);
    expect(result.estimatedCost).toBeGreaterThan(0n);
  });

  it('should return default on RPC failure for compute unit price', async () => {
    const mockFn = mockFetchResponse(undefined, false, 500);
    await withMockFetch(mockFn, async () => {
      const price = await solana.getComputeUnitPrice('https://test.solana.rpc');
      expect(price).toBe(1000n);
    });
  });

  it('should fetch recent prioritization fees (mocked)', async () => {
    const mockFn = mockFetchResponse([
      { prioritizationFee: 500, slot: 100 },
      { prioritizationFee: 1000, slot: 101 },
      { prioritizationFee: 1500, slot: 102 },
    ]);
    await withMockFetch(mockFn, async () => {
      const price = await solana.getComputeUnitPrice('https://test.solana.rpc2');
      expect(price).toBe(1000n);
    });
  });

  it('should return default compute units on simulation failure', async () => {
    const mockFn = mockFetchResponse(undefined, false, 500);
    await withMockFetch(mockFn, async () => {
      const units = await solana.estimateComputeUnits('fake_encoded_tx', 'https://test.solana.rpc3');
      expect(units).toBe(200_000);
    });
  });
});
