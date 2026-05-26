/**
 * Swap SDK Execution Flow Tests
 *
 * Tests the on-chain execution with mock viem WalletClient,
 * including slippage checks, MEV protection, and receipt handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SwapTransaction, SwapExecuteParams, SwapQuote } from "../src/types.js";
import { SwapQuoter } from "../src/quoter.js";
import { SwapRouter, type SwapExecutor } from "../src/router.js";
import { UniswapExecutor } from "../src/executors/uniswap.js";
import { OneInchExecutor } from "../src/executors/1inch.js";
import { ZeroxExecutor } from "../src/executors/0x.js";
import {
  sendViaPrivateRpc,
  waitForTxReceiptViaRpc,
  resolvePrivateRpcUrl,
  FLASHBOTS_RPC_URL,
  FLASHBOTS_FAST_RPC_URL,
  EDEN_RPC_URL,
  buildLegacyTxRequest,
} from "../src/mev.js";
import { calculateMinimumReceived } from "../src/slippage.js";
import type { WalletClient, Transport, Chain, Account } from "viem";

// ============================================================
// Mock WalletClient Factory
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
  const sendTxHash = overrides?.sendTxHash ?? "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
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
    sendTransaction: vi.fn().mockResolvedValue(sendTxHash),
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
    signTransaction: vi.fn().mockResolvedValue("0xsigned_tx_hex_data"),
  } as unknown as WalletClient<Transport, Chain, Account>;
}

// ============================================================
// Mock Executor
// ============================================================

function createMockExecutor(tx: SwapTransaction, quote: SwapQuote): SwapExecutor {
  return {
    name: quote.provider,
    isAvailable: vi.fn().mockResolvedValue(true),
    getQuote: vi.fn().mockResolvedValue(quote),
    getTransaction: vi.fn().mockResolvedValue(tx),
    executeTransaction: vi.fn().mockResolvedValue("0xmoc_tx_hash_1234"),
    getSupportedTokens: vi.fn().mockResolvedValue([]),
  };
}

function createTestQuote(overrides?: Partial<SwapQuote>): SwapQuote {
  return {
    id: "test-quote-1",
    fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    fromAmount: 1_000_000_000n,
    toAmount: 500_000_000_000_000_000n,
    priceImpact: 0.05,
    route: [
      {
        protocol: "test",
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
    ...overrides,
  };
}

function createTestTx(overrides?: Partial<SwapTransaction>): SwapTransaction {
  return {
    to: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    value: 0n,
    data: "0x414bf389",
    gasLimit: 250_000n,
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe("Slippage", () => {
  it("calculates minimum received correctly", () => {
    // 50 bps = 0.5% slippage
    const minReceived = calculateMinimumReceived(1_000_000n, 50);
    expect(minReceived).toBe(995_000n);
  });

  it("returns full amount at 0 slippage", () => {
    expect(calculateMinimumReceived(1_000_000n, 0)).toBe(1_000_000n);
  });

  it("throws on invalid slippage", () => {
    expect(() => calculateMinimumReceived(1_000_000n, -1)).toThrow();
    expect(() => calculateMinimumReceived(1_000_000n, 10_001)).toThrow();
  });
});

describe("MEV Protection", () => {
  it("resolves Flashbots RPC URL", () => {
    expect(resolvePrivateRpcUrl("flashbots")).toBe(FLASHBOTS_RPC_URL);
    expect(resolvePrivateRpcUrl("flashbots-fast")).toBe(FLASHBOTS_FAST_RPC_URL);
    expect(resolvePrivateRpcUrl("eden")).toBe(EDEN_RPC_URL);
  });

  it("resolves custom RPC URL", () => {
    expect(resolvePrivateRpcUrl("custom", "https://my-private-rpc.io")).toBe(
      "https://my-private-rpc.io",
    );
  });

  it("throws for custom without URL", () => {
    expect(() => resolvePrivateRpcUrl("custom")).toThrow("Custom private RPC requires a URL");
  });

  it("builds legacy tx request", () => {
    const baseGasPrice = 10_000_000_000n;
    const tx = createTestTx();
    const request = buildLegacyTxRequest(tx, baseGasPrice, 42);

    expect(request.gasPrice).toBe(10_000_000_000n);
    expect(request.nonce).toBe(42);
    expect(request.to).toBe(tx.to);
    expect(request.value).toBe(tx.value);
  });
});

describe("UniswapExecutor", () => {
  const executor = new UniswapExecutor({ rpcUrl: "https://eth-rpc.example.com" });

  it("has correct name", () => {
    expect(executor.name).toBe("uniswap");
  });

  it("uses V3 addresses by default", async () => {
    const quote = await executor.getQuote({
      fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    });

    const tx = await executor.getTransaction(quote, 50);
    expect(tx.to).toBe("0xE592427A0AEce92De3Edee1F18E0157C05861564");
    expect(tx.data).toBeDefined();
    expect(tx.data).not.toBe("0x");
  });

  it("uses V4 addresses when configured", async () => {
    const v4Executor = new UniswapExecutor({ version: "v4" });
    const quote = await v4Executor.getQuote({
      fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    });

    const tx = await v4Executor.getTransaction(quote, 50);
    expect(tx.to).toBe("0x360E68faCcca8cA495c1B759Fd9EEe466dB9FB32");
  });

  it("encodes exactInputSingle calldata for single-hop", async () => {
    const quote = await executor.getQuote({
      fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: 1_000_000n,
      chainId: 1,
      slippageBps: 50,
    });

    const tx = await executor.getTransaction(quote, 50);

    // Should have a valid function selector (0x + 8 hex chars)
    expect(tx.data.slice(0, 10)).toMatch(/^0x[0-9a-f]{8}$/);
    // Data should be longer than just the selector (has encoded params)
    expect(tx.data.length).toBeGreaterThan(10);
  });

  it("sets native token value correctly", async () => {
    const quote = await executor.getQuote({
      fromToken: "native",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromAmount: 1_000_000_000_000_000n,
      chainId: 1,
      slippageBps: 50,
    });

    const tx = await executor.getTransaction(quote, 50);
    expect(tx.value).toBe(1_000_000_000_000_000n);
  });

  it("executeTransaction calls sendTransaction on walletClient", async () => {
    const walletClient = createMockWalletClient();
    const tx = createTestTx();

    const txHash = await executor.executeTransaction(tx, walletClient);

    // Returns the hash from sendTransaction (mocked)
    expect(txHash).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    expect(walletClient.sendTransaction).toHaveBeenCalledWith({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      gas: tx.gasLimit,
    });
  });
});

describe("OneInchExecutor", () => {
  const executor = new OneInchExecutor("test-api-key");

  it("has correct name", () => {
    expect(executor.name).toBe("1inch");
  });

  it("executeTransaction calls sendTransaction on walletClient", async () => {
    const walletClient = createMockWalletClient();
    const tx = createTestTx({
      to: "0x1111111254EEB25477B68fb85Ed929f73A960582",
      value: 0n,
      data: "0x1inch_encoded_calldata",
      gasLimit: 200_000n,
    });

    const txHash = await executor.executeTransaction(tx, walletClient);

    expect(txHash).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    expect(walletClient.sendTransaction).toHaveBeenCalled();
  });
});

describe("ZeroxExecutor", () => {
  const executor = new ZeroxExecutor("test-api-key");

  it("has correct name", () => {
    expect(executor.name).toBe("0x");
  });

  it("executeTransaction calls sendTransaction on walletClient", async () => {
    const walletClient = createMockWalletClient();
    const tx = createTestTx({
      to: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
      value: 0n,
      data: "0x0x_encoded_calldata",
      gasLimit: 180_000n,
    });

    const txHash = await executor.executeTransaction(tx, walletClient);

    expect(txHash).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    expect(walletClient.sendTransaction).toHaveBeenCalled();
  });
});

describe("SwapRouter.executeSwap — real execution", () => {
  it("throws when execution is disabled", async () => {
    const mockQuote = createTestQuote();
    const mockTx = createTestTx();
    const mockExecutor = createMockExecutor(mockTx, mockQuote);
    const quoter = new SwapQuoter([mockExecutor]);
    const router = new SwapRouter(quoter);

    await expect(
      router.executeSwap(
        {
          fromToken: mockQuote.fromToken,
          toToken: mockQuote.toToken,
          fromAmount: mockQuote.fromAmount,
          chainId: 1,
          slippageBps: 50,
        },
        {
          quote: mockQuote,
          walletClient: createMockWalletClient(),
        },
      ),
    ).rejects.toThrow("Swap execution is disabled");
  });

  it("throws when walletClient is missing", async () => {
    const mockQuote = createTestQuote();
    const mockTx = createTestTx();
    const mockExecutor = createMockExecutor(mockTx, mockQuote);
    const quoter = new SwapQuoter([mockExecutor]);
    const router = new SwapRouter(quoter);
    router.setExecutionEnabled(true);

    await expect(
      router.executeSwap(
        {
          fromToken: mockQuote.fromToken,
          toToken: mockQuote.toToken,
          fromAmount: mockQuote.fromAmount,
          chainId: 1,
          slippageBps: 50,
        },
        {
          quote: mockQuote,
          walletClient: undefined as any,
        },
      ),
    ).rejects.toThrow("walletClient is required");
  });

  it("throws on expired quote", async () => {
    const mockQuote = createTestQuote({ expiresAt: Date.now() - 1000 });
    const mockTx = createTestTx();
    const mockExecutor = createMockExecutor(mockTx, mockQuote);
    const quoter = new SwapQuoter([mockExecutor]);
    const router = new SwapRouter(quoter);
    router.setExecutionEnabled(true);

    await expect(
      router.executeSwap(
        {
          fromToken: mockQuote.fromToken,
          toToken: mockQuote.toToken,
          fromAmount: mockQuote.fromAmount,
          chainId: 1,
          slippageBps: 50,
        },
        {
          quote: mockQuote,
          walletClient: createMockWalletClient(),
        },
      ),
    ).rejects.toThrow("Quote has expired");
  });

  it("requires executor for provider", async () => {
    const mockQuote = createTestQuote({ provider: "unknown-dex" });
    const mockTx = createTestTx();
    const mockExecutor = createMockExecutor(mockTx, mockQuote);
    // The executor name is "mock-dex" but the quote says "unknown-dex"
    const quoter = new SwapQuoter([mockExecutor]);
    const router = new SwapRouter(quoter);
    router.setExecutionEnabled(true);

    await expect(
      router.executeSwap(
        {
          fromToken: mockQuote.fromToken,
          toToken: mockQuote.toToken,
          fromAmount: mockQuote.fromAmount,
          chainId: 1,
          slippageBps: 50,
        },
        {
          quote: mockQuote,
          walletClient: createMockWalletClient(),
        },
      ),
    ).rejects.toThrow("No executor found for provider");
  });
});

describe("SendViaPrivateRpc", () => {
  it("sends signed tx to private RPC endpoint", async () => {
    const walletClient = createMockWalletClient();
    const tx = createTestTx();

    // Mock fetch to simulate successful private RPC submission
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "0xprivate_rpc_tx_hash" }),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const txHash = await sendViaPrivateRpc(tx, walletClient, FLASHBOTS_RPC_URL);
      expect(txHash).toBe("0xprivate_rpc_tx_hash");
      expect(mockFetch).toHaveBeenCalledWith(
        FLASHBOTS_RPC_URL,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("eth_sendRawTransaction"),
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("includes API key in headers when provided", async () => {
    const walletClient = createMockWalletClient();
    const tx = createTestTx();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "0xedn_tx_hash" }),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      await sendViaPrivateRpc(tx, walletClient, EDEN_RPC_URL, {
        apiKey: "eden-api-key-123",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        EDEN_RPC_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer eden-api-key-123",
          }),
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("retries on failure", async () => {
    const walletClient = createMockWalletClient();
    const tx = createTestTx();

    // First 2 calls fail, 3rd succeeds
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("RPC timeout"))
      .mockRejectedValueOnce(new Error("RPC timeout"))
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: "0xretry_tx_hash" }),
      });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const txHash = await sendViaPrivateRpc(tx, walletClient, FLASHBOTS_RPC_URL, {
        maxRetries: 3,
        retryDelayMs: 10, // fast retry in tests
      });
      expect(txHash).toBe("0xretry_tx_hash");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws after max retries", async () => {
    const walletClient = createMockWalletClient();
    const tx = createTestTx();

    const mockFetch = vi.fn().mockRejectedValue(new Error("RPC always fails"));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      await expect(
        sendViaPrivateRpc(tx, walletClient, FLASHBOTS_RPC_URL, {
          maxRetries: 2,
          retryDelayMs: 10,
        }),
      ).rejects.toThrow("RPC always fails");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("WaitForTxReceiptViaRpc", () => {
  it("polls until receipt is available", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        return {
          ok: true,
          json: () => Promise.resolve({ result: null }), // not mined yet
        };
      }
      return {
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              status: "0x1",
              gasUsed: "21000",
              effectiveGasPrice: "0x4a817c800",
              blockNumber: "0x1234567",
            },
          }),
      };
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const receipt = await waitForTxReceiptViaRpc(
        "0x123abc",
        "https://eth-rpc.example.com",
        {
          timeoutMs: 5000,
          pollIntervalMs: 50,
        },
      );

      expect(receipt.status).toBe("success");
      expect(receipt.gasUsed).toBe(21000n);
      expect(receipt.blockNumber).toBe(19088743n);
      expect(callCount).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("detects reverted transactions", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: {
            status: "0x0",
            gasUsed: "50000",
            effectiveGasPrice: "0x4a817c800",
            blockNumber: "0x1234567",
          },
        }),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const receipt = await waitForTxReceiptViaRpc("0xfail_tx", "https://eth-rpc.example.com", {
        timeoutMs: 5000,
        pollIntervalMs: 50,
      });

      expect(receipt.status).toBe("reverted");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws on timeout", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: null }), // never mines
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      await expect(
        waitForTxReceiptViaRpc("0xtimeout_tx", "https://eth-rpc.example.com", {
          timeoutMs: 100,
          pollIntervalMs: 30,
        }),
      ).rejects.toThrow("Transaction receipt timeout");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
