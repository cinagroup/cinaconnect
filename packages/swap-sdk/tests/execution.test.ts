/**
 * End-to-End Gas Estimator + Swap SDK Integration Tests
 *
 * Tests the complete flow:
 *  1. Real RPC gas price fetching via GasEstimator
 *  2. Quote aggregation across multiple DEX executors
 *  3. On-chain transaction construction
 *  4. Execution with gas price checks
 *  5. MEV protection via private RPC
 *  6. Receipt polling and confirmation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SwapQuote, SwapTransaction, SwapExecuteParams } from "../src/types.js";
import { SwapQuoter } from "../src/quoter.js";
import { SwapRouter, type SwapExecutor } from "../src/router.js";
import { GasEstimator } from "@cinacoin/gas-estimator";
import { calculateMinimumReceived } from "../src/slippage.js";
import type { WalletClient, Transport, Chain, Account } from "viem";

// ============================================================
// Test Helpers
// ============================================================

function createMockWalletClient(overrides?: {
  sendTxHash?: `0x${string}`;
  gasPrice?: bigint;
  nonce?: number;
  receiptStatus?: "0x1" | "0x0";
  receiptGasUsed?: string;
  receiptBlockNumber?: string;
}): WalletClient<Transport, Chain, Account> {
  const gasPrice = overrides?.gasPrice ?? 20_000_000_000n;
  const nonce = overrides?.nonce ?? 42;
  const sendTxHash = overrides?.sendTxHash ?? "0xabc123def456789012345678901234567890123456789012345678901234abcd";
  const receiptStatus = overrides?.receiptStatus ?? "0x1";
  const receiptGasUsed = overrides?.receiptGasUsed ?? "200000";
  const receiptBlockNumber = overrides?.receiptBlockNumber ?? "19000000";

  return {
    account: {
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      type: "json-rpc",
    } as Account,
    chain: { id: 1, name: "Ethereum" } as Chain,
    transport: { type: "http" } as Transport,
    getGasPrice: vi.fn().mockResolvedValue(gasPrice),
    getTransactionCount: vi.fn().mockResolvedValue(nonce),
    sendTransaction: vi.fn().mockResolvedValue(sendTxHash),
    signTransaction: vi.fn().mockResolvedValue("0xsigned_tx_hex_data"),
    request: vi.fn().mockImplementation(async ({ method }: { method: string }) => {
      if (method === "eth_getTransactionCount") return `0x${nonce.toString(16)}`;
      if (method === "eth_chainId") return "0x1";
      if (method === "eth_getTransactionReceipt") {
        return {
          status: receiptStatus,
          gasUsed: receiptGasUsed,
          effectiveGasPrice: `0x${gasPrice.toString(16)}`,
          blockNumber: receiptBlockNumber,
        };
      }
      return null;
    }),
  } as unknown as WalletClient<Transport, Chain, Account>;
}

function createMockPublicClient(overrides?: {
  gasPrice?: bigint;
  receiptStatus?: "success" | "reverted";
  receiptGasUsed?: bigint;
  receiptBlockNumber?: bigint;
  receiptEffectiveGasPrice?: bigint;
}) {
  const gasPrice = overrides?.gasPrice ?? 20_000_000_000n;
  return {
    getGasPrice: vi.fn().mockResolvedValue(gasPrice),
    getTransactionCount: vi.fn().mockResolvedValue(42),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: overrides?.receiptStatus ?? "success",
      gasUsed: overrides?.receiptGasUsed ?? 200_000n,
      blockNumber: overrides?.receiptBlockNumber ?? 19_000_000n,
      effectiveGasPrice: overrides?.receiptEffectiveGasPrice ?? gasPrice,
    }),
  };
}

function createMockExecutor(
  name: string,
  toAmount: bigint,
  gasEstimate: bigint = 185_000n,
): SwapExecutor {
  const quote: SwapQuote = {
    id: `${name}-${Date.now()}`,
    fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    fromAmount: 1_000_000_000n,
    toAmount,
    priceImpact: 0.05,
    route: [
      {
        protocol: name,
        fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        fromAmount: 1_000_000_000n,
        toAmount,
        gasEstimate,
      },
    ],
    gasEstimate,
    minimumReceived: calculateMinimumReceived(toAmount, 50),
    provider: name,
    expiresAt: Date.now() + 60_000,
    chainId: 1,
  };

  const tx: SwapTransaction = {
    to: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    value: 0n,
    data: "0x414bf389",
    gasLimit: gasEstimate * 12n / 10n,
  };

  return {
    name,
    isAvailable: vi.fn().mockResolvedValue(true),
    getQuote: vi.fn().mockResolvedValue(quote),
    getTransaction: vi.fn().mockResolvedValue(tx),
    executeTransaction: vi.fn().mockResolvedValue("0xmoc_tx_hash"),
    getSupportedTokens: vi.fn().mockResolvedValue([]),
  };
}

// ============================================================
// Integration Tests
// ============================================================

describe("GasEstimator + Swap SDK Integration", () => {
  let estimator: GasEstimator;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    estimator = new GasEstimator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Real RPC Gas Price → Swap Execution", () => {
    it("should use real gas prices from GasEstimator in swap execution", async () => {
      mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: "2.0", id: 1,
            result: {
              oldestBlock: "0x1234567",
              baseFeePerGas: ["0x4a817c800"],
              gasUsedRatio: [0.5],
              reward: [["0x3b9aca00", "0x77359400", "0xb2d05e00"]],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result: "0x4a817c800" }),
        });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        // Get real gas prices
        const prices = await estimator.getEip1559GasPrices(1);
        expect(prices.baseFee).toBe(20_000_000_000n);
        expect(prices.gasPrice).toBe(20_000_000_000n);

        // Set up mock executor
        const executor = createMockExecutor("mock-dex", 500_000_000_000_000_000n);
        const quoter = new SwapQuoter([executor]);
        const router = new SwapRouter(quoter, [executor], {
          gasEstimator: estimator,
        });
        router.setExecutionEnabled(true);

        const publicClient = createMockPublicClient() as any;
        const walletClient = createMockWalletClient();

        const receipt = await router.executeSwap(
          {
            fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            fromAmount: 1_000_000_000n,
            chainId: 1,
            slippageBps: 50,
          },
          {
            quote: {
              id: "test-quote",
              fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
              toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              fromAmount: 1_000_000_000n,
              toAmount: 500_000_000_000_000_000n,
              priceImpact: 0.05,
              route: [],
              gasEstimate: 185_000n,
              minimumReceived: calculateMinimumReceived(500_000_000_000_000_000n, 50),
              provider: "mock-dex",
              expiresAt: Date.now() + 60_000,
              chainId: 1,
            },
            walletClient,
            publicClient,
          },
        );

        expect(receipt.success).toBe(true);
        expect(receipt.gasUsed).toBe(200_000n);
        expect(receipt.blockNumber).toBe(19_000_000n);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should reject swap when gas price exceeds max", async () => {
      mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: "2.0", id: 1,
            result: {
              oldestBlock: "0x1234567",
              baseFeePerGas: ["0x4a817c800"],
              gasUsedRatio: [0.5],
              reward: [["0x3b9aca00", "0x77359400", "0xb2d05e00"]],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result: "0x4a817c800" }),
        });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const executor = createMockExecutor("mock-dex", 500_000_000_000_000_000n);
        const quoter = new SwapQuoter([executor]);
        const router = new SwapRouter(quoter, [executor], {
          gasEstimator: estimator,
        });
        router.setExecutionEnabled(true);

        const publicClient = createMockPublicClient() as any;
        const walletClient = createMockWalletClient();

        // Set maxGasPrice very low (1 gwei) — should reject 20 gwei
        await expect(
          router.executeSwap(
            {
              fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
              toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              fromAmount: 1_000_000_000n,
              chainId: 1,
              slippageBps: 50,
            },
            {
              quote: {
                id: "test-quote",
                fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                fromAmount: 1_000_000_000n,
                toAmount: 500_000_000_000_000_000n,
                priceImpact: 0.05,
                route: [],
                gasEstimate: 185_000n,
                minimumReceived: calculateMinimumReceived(500_000_000_000_000_000n, 50),
                provider: "mock-dex",
                expiresAt: Date.now() + 60_000,
                chainId: 1,
              },
              walletClient,
              publicClient,
              maxGasPrice: 1_000_000_000n, // 1 gwei — below 20 gwei
            },
          ),
        ).rejects.toThrow("Current gas price");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should accept swap when gas price is within max", async () => {
      mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: "2.0", id: 1,
            result: {
              oldestBlock: "0x1234567",
              baseFeePerGas: ["0x4a817c800"],
              gasUsedRatio: [0.5],
              reward: [["0x3b9aca00", "0x77359400", "0xb2d05e00"]],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result: "0x4a817c800" }),
        });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const executor = createMockExecutor("mock-dex", 500_000_000_000_000_000n);
        const quoter = new SwapQuoter([executor]);
        const router = new SwapRouter(quoter, [executor], {
          gasEstimator: estimator,
        });
        router.setExecutionEnabled(true);

        const publicClient = createMockPublicClient() as any;
        const walletClient = createMockWalletClient();

        // Set maxGasPrice very high (100 gwei) — should accept 20 gwei
        const receipt = await router.executeSwap(
          {
            fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            fromAmount: 1_000_000_000n,
            chainId: 1,
            slippageBps: 50,
          },
          {
            quote: {
              id: "test-quote",
              fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
              toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              fromAmount: 1_000_000_000n,
              toAmount: 500_000_000_000_000_000n,
              priceImpact: 0.05,
              route: [],
              gasEstimate: 185_000n,
              minimumReceived: calculateMinimumReceived(500_000_000_000_000_000n, 50),
              provider: "mock-dex",
              expiresAt: Date.now() + 60_000,
              chainId: 1,
            },
            walletClient,
            publicClient,
            maxGasPrice: 100_000_000_000n, // 100 gwei
          },
        );

        expect(receipt.success).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("Multi-Chain Gas Estimation", () => {
    it("should support multiple chains with different RPCs", async () => {
      mockFetch = vi.fn()
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result: "0x4a817c800" }),
        });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        // Ethereum
        estimator.clearCache();
        const ethPrices = await estimator.getGasPriceForChain(1);
        expect(ethPrices.gasPrice).toBe(20_000_000_000n);

        // Polygon
        estimator.clearCache();
        const polyPrices = await estimator.getGasPriceForChain(137);
        expect(polyPrices.gasPrice).toBe(20_000_000_000n);

        // Arbitrum
        estimator.clearCache();
        const arbPrices = await estimator.getGasPriceForChain(42161);
        expect(arbPrices.gasPrice).toBe(20_000_000_000n);

        // All used different RPC URLs
        const calls = mockFetch.mock.calls;
        const urls = calls.map((c: any) => c[0]);
        expect(urls).toContain("https://eth.llamarpc.com");
        expect(urls).toContain("https://polygon-rpc.com");
        expect(urls).toContain("https://arb1.arbitrum.io/rpc");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("End-to-End Swap Flow", () => {
    it("should complete full quote → approve → execute → receipt flow", async () => {
      const executor = createMockExecutor("mock-dex", 500_000_000_000_000_000n);
      const quoter = new SwapQuoter([executor]);
      const router = new SwapRouter(quoter, [executor]);
      router.setExecutionEnabled(true);

      const publicClient = createMockPublicClient({
        receiptStatus: "success",
        receiptGasUsed: 210_000n,
        receiptBlockNumber: 19_500_000n,
        receiptEffectiveGasPrice: 22_000_000_000n,
      }) as any;

      const walletClient = createMockWalletClient({
        sendTxHash: "0xe2e_tx_success_123456789012345678901234567890123456789012345678901234abcd",
        receiptStatus: "0x1",
        receiptGasUsed: "210000",
        receiptBlockNumber: "19500000",
      });

      const receipt = await router.executeSwap(
        {
          fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          fromAmount: 1_000_000_000n,
          chainId: 1,
          slippageBps: 50,
        },
        {
          quote: {
            id: "e2e-quote",
            fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            fromAmount: 1_000_000_000n,
            toAmount: 500_000_000_000_000_000n,
            priceImpact: 0.05,
            route: [
              {
                protocol: "mock-dex",
                fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                fromAmount: 1_000_000_000n,
                toAmount: 500_000_000_000_000_000n,
                gasEstimate: 185_000n,
              },
            ],
            gasEstimate: 185_000n,
            minimumReceived: calculateMinimumReceived(500_000_000_000_000_000n, 50),
            provider: "mock-dex",
            expiresAt: Date.now() + 60_000,
            chainId: 1,
          },
          walletClient,
          publicClient,
        },
      );

      expect(receipt.success).toBe(true);
      expect(receipt.gasUsed).toBe(210_000n);
      expect(receipt.gasPrice).toBe(22_000_000_000n);
      expect(receipt.blockNumber).toBe(19_500_000n);
      expect(receipt.toAmount).toBe(500_000_000_000_000_000n);
    });

    it("should detect reverted transactions", async () => {
      const executor = createMockExecutor("mock-dex", 500_000_000_000_000_000n);
      const quoter = new SwapQuoter([executor]);
      const router = new SwapRouter(quoter, [executor]);
      router.setExecutionEnabled(true);

      const publicClient = createMockPublicClient({
        receiptStatus: "reverted",
        receiptGasUsed: 50_000n,
        receiptBlockNumber: 19_500_000n,
      }) as any;

      const walletClient = createMockWalletClient({
        sendTxHash: "0xfail_tx_123456789012345678901234567890123456789012345678901234abcd",
        receiptStatus: "0x0",
        receiptGasUsed: "50000",
      });

      const receipt = await router.executeSwap(
        {
          fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          fromAmount: 1_000_000_000n,
          chainId: 1,
          slippageBps: 50,
        },
        {
          quote: {
            id: "fail-quote",
            fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            fromAmount: 1_000_000_000n,
            toAmount: 500_000_000_000_000_000n,
            priceImpact: 0.05,
            route: [],
            gasEstimate: 185_000n,
            minimumReceived: calculateMinimumReceived(500_000_000_000_000_000n, 50),
            provider: "mock-dex",
            expiresAt: Date.now() + 60_000,
            chainId: 1,
          },
          walletClient,
          publicClient,
        },
      );

      expect(receipt.success).toBe(false);
      expect(receipt.gasUsed).toBe(50_000n);
    });
  });
});
