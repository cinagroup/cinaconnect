/**
 * Swap SDK Tests
 *
 * Tests for:
 * - ERC-20 approval flow (checkAllowance, approve, ensureAllowance, permit)
 * - SwapQuoter.fetchQuotes()
 * - SwapRouter with approval integration
 * - Executor quote fetching (mock HTTP)
 * - Timeout and error recovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Address, WalletClient, PublicClient, Transport, Chain, Account } from "viem";

// Import the modules we're testing
import {
  buildApproveTx,
  checkAllowance,
  checkAllowanceFor,
  ensureAllowance,
  buildPermitTypedData,
  buildPermitCalldata,
  MAX_UINT256,
  buildBatchApproveAndSwap,
  buildInfiniteApproveTx,
} from "../approve.js";

import { SwapQuoter } from "../quoter.js";
import type { SwapExecutor } from "../router.js";
import type { SwapQuote, SwapQuoteParams, SwapTransaction } from "../types.js";
import { calculateMinimumReceived } from "../slippage.js";

// ============================================================
// Test Helpers
// ============================================================

const MOCK_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address; // USDC
const MOCK_WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address;
const MOCK_SPENDER = "0xE592427A0AEce92De3Edee1F18E0157C05861564" as Address; // Uniswap V3 Router
const MOCK_OWNER = "0x1234567890123456789012345678901234567890" as Address;
const MOCK_TX_HASH = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`;

function createMockQuote(overrides?: Partial<SwapQuote>): SwapQuote {
  return {
    id: "test-quote-1",
    fromToken: MOCK_TOKEN,
    toToken: MOCK_WETH,
    fromAmount: 1_000n * 10n ** 6n, // 1000 USDC
    toAmount: 500_000_000_000_000_000n, // 0.5 WETH
    priceImpact: 0.5,
    route: [
      {
        protocol: "uniswap-v3",
        fromToken: MOCK_TOKEN,
        toToken: MOCK_WETH,
        fromAmount: 1_000n * 10n ** 6n,
        toAmount: 500_000_000_000_000_000n,
        gasEstimate: 185_000n,
      },
    ],
    gasEstimate: 185_000n,
    minimumReceived: calculateMinimumReceived(500_000_000_000_000_000n, 50),
    provider: "uniswap",
    expiresAt: Date.now() + 30_000,
    chainId: 1,
    ...overrides,
  };
}

function createMockParams(overrides?: Partial<SwapQuoteParams>): SwapQuoteParams {
  return {
    fromToken: MOCK_TOKEN,
    toToken: MOCK_WETH,
    fromAmount: 1_000n * 10n ** 6n,
    chainId: 1,
    slippageBps: 50,
    ...overrides,
  };
}

function createMockPublicClient(allowance: bigint): PublicClient<Transport, Chain> {
  return {
    readContract: vi.fn().mockResolvedValue(allowance),
    getGasPrice: vi.fn().mockResolvedValue(20_000_000_000n),
    getTransactionCount: vi.fn().mockResolvedValue(0),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: "success",
      gasUsed: 50_000n,
      effectiveGasPrice: 20_000_000_000n,
      blockNumber: 18_000_000n,
    }),
  } as unknown as PublicClient<Transport, Chain>;
}

function createMockWalletClient(): WalletClient<Transport, Chain, Account> {
  return {
    account: { address: MOCK_OWNER } as Account,
    sendTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
    signTypedData: vi.fn().mockResolvedValue(
      "0x" + "aa".repeat(32) + "bb".repeat(32) + "1b",
    ),
  } as unknown as WalletClient<Transport, Chain, Account>;
}

function createMockExecutor(quote: SwapQuote, tx?: SwapTransaction): SwapExecutor {
  return {
    name: quote.provider,
    isAvailable: vi.fn().mockResolvedValue(true),
    getQuote: vi.fn().mockResolvedValue(quote),
    getTransaction: vi.fn().mockResolvedValue(tx ?? {
      to: MOCK_SPENDER,
      value: 0n,
      data: "0x",
      gasLimit: 200_000n,
    } as SwapTransaction),
    executeTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
    getSupportedTokens: vi.fn().mockResolvedValue([]),
  };
}

// ============================================================
// Approval Flow Tests
// ============================================================

describe("ERC-20 Approval Flow", () => {
  describe("buildApproveTx", () => {
    it("should encode approve calldata", () => {
      const result = buildApproveTx(MOCK_TOKEN, MOCK_SPENDER, 1_000_000n);

      expect(result.to).toBe(MOCK_TOKEN);
      expect(result.data).toMatch(/^0x095ea7b3/); // approve function selector
      expect(result.data.length).toBeGreaterThan(10);
    });

    it("should encode approve with zero amount", () => {
      const result = buildApproveTx(MOCK_TOKEN, MOCK_SPENDER, 0n);
      expect(result.to).toBe(MOCK_TOKEN);
      expect(result.data).toMatch(/^0x095ea7b3/);
    });

    it("should encode max uint256 approval", () => {
      const result = buildApproveTx(MOCK_TOKEN, MOCK_SPENDER, MAX_UINT256);
      expect(result.to).toBe(MOCK_TOKEN);
      expect(result.data).toMatch(/^0x095ea7b3/);
    });
  });

  describe("buildInfiniteApproveTx", () => {
    it("should build max approval calldata", () => {
      const result = buildInfiniteApproveTx(MOCK_TOKEN, MOCK_SPENDER);
      expect(result.to).toBe(MOCK_TOKEN);
      expect(result.data).toMatch(/^0x095ea7b3/);
    });
  });

  describe("checkAllowance", () => {
    it("should read allowance via publicClient", async () => {
      const publicClient = createMockPublicClient(5_000_000n);

      const result = await checkAllowance(MOCK_TOKEN, MOCK_SPENDER, MOCK_OWNER, publicClient);

      expect(result.allowance).toBe(5_000_000n);
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_TOKEN,
          functionName: "allowance",
          args: [MOCK_OWNER, MOCK_SPENDER],
        }),
      );
    });

    it("should throw on read failure", async () => {
      const publicClient = {
        readContract: vi.fn().mockRejectedValue(new Error("Contract read failed")),
      } as unknown as PublicClient<Transport, Chain>;

      await expect(
        checkAllowance(MOCK_TOKEN, MOCK_SPENDER, MOCK_OWNER, publicClient),
      ).rejects.toThrow("Failed to read allowance");
    });
  });

  describe("checkAllowanceFor", () => {
    it("should return isSufficient=true when allowance >= required", async () => {
      const publicClient = createMockPublicClient(10_000_000n);

      const result = await checkAllowanceFor(
        MOCK_TOKEN,
        MOCK_SPENDER,
        MOCK_OWNER,
        5_000_000n,
        publicClient,
      );

      expect(result.isSufficient).toBe(true);
      expect(result.shortfall).toBe(0n);
    });

    it("should return isSufficient=false and shortfall when allowance < required", async () => {
      const publicClient = createMockPublicClient(2_000_000n);

      const result = await checkAllowanceFor(
        MOCK_TOKEN,
        MOCK_SPENDER,
        MOCK_OWNER,
        5_000_000n,
        publicClient,
      );

      expect(result.isSufficient).toBe(false);
      expect(result.shortfall).toBe(3_000_000n);
    });
  });

  describe("ensureAllowance", () => {
    it("should skip approve when allowance is sufficient", async () => {
      const publicClient = createMockPublicClient(10_000_000n);
      const walletClient = createMockWalletClient();

      const result = await ensureAllowance(
        MOCK_TOKEN,
        MOCK_SPENDER,
        5_000_000n,
        walletClient,
        publicClient,
      );

      expect(result.approved).toBe(false);
      expect(result.txHash).toBeUndefined();
      expect(walletClient.sendTransaction).not.toHaveBeenCalled();
    });

    it("should approve when allowance is insufficient", async () => {
      const publicClient = createMockPublicClient(1_000_000n); // less than required
      const walletClient = createMockWalletClient();

      const result = await ensureAllowance(
        MOCK_TOKEN,
        MOCK_SPENDER,
        5_000_000n,
        walletClient,
        publicClient,
      );

      expect(result.approved).toBe(true);
      expect(result.txHash).toBe(MOCK_TX_HASH);
      expect(walletClient.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it("should approve amount * 2 when approveExact=false (default)", async () => {
      const publicClient = createMockPublicClient(0n);
      const walletClient = createMockWalletClient();

      await ensureAllowance(
        MOCK_TOKEN,
        MOCK_SPENDER,
        5_000_000n,
        walletClient,
        publicClient,
      );

      // verify the calldata contains amount * 2 = 10_000_000
      const callArgs = (walletClient.sendTransaction as any).mock.calls[0][0];
      const data = callArgs.data as string;
      // Last 64 hex chars = the amount (uint256)
      const encodedAmount = data.slice(-64);
      expect(BigInt(`0x${encodedAmount}`)).toBe(10_000_000n);
    });

    it("should approve exact amount when approveExact=true", async () => {
      const publicClient = createMockPublicClient(0n);
      const walletClient = createMockWalletClient();

      await ensureAllowance(
        MOCK_TOKEN,
        MOCK_SPENDER,
        5_000_000n,
        walletClient,
        publicClient,
        { approveExact: true },
      );

      const callArgs = (walletClient.sendTransaction as any).mock.calls[0][0];
      const data = callArgs.data as string;
      const encodedAmount = data.slice(-64);
      expect(BigInt(`0x${encodedAmount}`)).toBe(5_000_000n);
    });
  });

  describe("buildBatchApproveAndSwap", () => {
    it("should include approve when allowance is insufficient", () => {
      const batch = buildBatchApproveAndSwap(
        MOCK_TOKEN,
        MOCK_SPENDER,
        5_000_000n,
        1_000_000n, // current allowance
        "0x12345678", // swap calldata
        MOCK_SPENDER,
      );

      expect(batch.length).toBe(2);
      expect(batch[0].to).toBe(MOCK_TOKEN); // approve
      expect(batch[0].data).toMatch(/^0x095ea7b3/);
      expect(batch[1].data).toBe("0x12345678"); // swap
    });

    it("should skip approve when allowance is sufficient", () => {
      const batch = buildBatchApproveAndSwap(
        MOCK_TOKEN,
        MOCK_SPENDER,
        5_000_000n,
        10_000_000n, // sufficient allowance
        "0x12345678",
        MOCK_SPENDER,
      );

      expect(batch.length).toBe(1);
      expect(batch[0].data).toBe("0x12345678"); // swap only
    });
  });

  describe("Permit helpers", () => {
    it("should build permit typed data", () => {
      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: 1,
        verifyingContract: MOCK_TOKEN,
      };

      const params = {
        owner: MOCK_OWNER,
        spender: MOCK_SPENDER,
        value: 1_000_000n,
        nonce: 5n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      };

      const typedData = buildPermitTypedData(domain, params);

      expect(typedData.primaryType).toBe("Permit");
      expect(typedData.types).toHaveProperty("Permit");
      expect(typedData.message.owner).toBe(MOCK_OWNER);
      expect(typedData.message.spender).toBe(MOCK_SPENDER);
    });

    it("should build permit calldata", () => {
      const sig: { r: `0x${string}`; s: `0x${string}`; v: bigint } = {
        r: `0x${"aa".repeat(32)}`,
        s: `0x${"bb".repeat(32)}`,
        v: 27n,
      };

      const params = {
        owner: MOCK_OWNER,
        spender: MOCK_SPENDER,
        value: 1_000_000n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      };

      const result = buildPermitCalldata(MOCK_TOKEN, sig, params);

      expect(result.to).toBe(MOCK_TOKEN);
      expect(result.data).toMatch(/^0xd505accf/); // permit function selector
    });
  });
});

// ============================================================
// SwapQuoter Tests
// ============================================================

describe("SwapQuoter", () => {
  describe("fetchQuotes", () => {
    it("should fetch quotes from all executors", async () => {
      const uniQuote = createMockQuote({ provider: "uniswap", id: "uni-1", toAmount: 500_000_000_000_000_000n });
      const inchQuote = createMockQuote({ provider: "1inch", id: "inch-1", toAmount: 510_000_000_000_000_000n });

      const uniExecutor = createMockExecutor(uniQuote);
      const inchExecutor = createMockExecutor(inchQuote);

      const quoter = new SwapQuoter([uniExecutor, inchExecutor]);
      const quotes = await quoter.fetchQuotes(createMockParams());

      expect(quotes).toHaveLength(2);
      expect(quotes.map((q: SwapQuote) => q.provider).sort()).toEqual(["1inch", "uniswap"]);
    });

    it("should skip failed providers", async () => {
      const goodQuote = createMockQuote({ provider: "uniswap" });
      const goodExecutor = createMockExecutor(goodQuote);
      const failingExecutor: SwapExecutor = {
        name: "1inch",
        isAvailable: vi.fn().mockResolvedValue(false),
        getQuote: vi.fn().mockRejectedValue(new Error("API error")),
        getTransaction: vi.fn(),
        executeTransaction: vi.fn(),
        getSupportedTokens: vi.fn(),
      };

      const quoter = new SwapQuoter([goodExecutor, failingExecutor]);
      const quotes = await quoter.fetchQuotes(createMockParams());

      expect(quotes).toHaveLength(1);
      expect(quotes[0].provider).toBe("uniswap");
    });

    it("should return empty array when all providers fail", async () => {
      const failingExecutor: SwapExecutor = {
        name: "uniswap",
        isAvailable: vi.fn().mockResolvedValue(false),
        getQuote: vi.fn().mockRejectedValue(new Error("API error")),
        getTransaction: vi.fn(),
        executeTransaction: vi.fn(),
        getSupportedTokens: vi.fn(),
      };

      const quoter = new SwapQuoter([failingExecutor]);
      const quotes = await quoter.fetchQuotes(createMockParams());

      expect(quotes).toHaveLength(0);
    });
  });

  describe("getBestQuote", () => {
    it("should return the best quote by output amount", async () => {
      const uniQuote = createMockQuote({ provider: "uniswap", toAmount: 500_000_000_000_000_000n });
      const inchQuote = createMockQuote({ provider: "1inch", toAmount: 510_000_000_000_000_000n });

      const quoter = new SwapQuoter([
        createMockExecutor(uniQuote),
        createMockExecutor(inchQuote),
      ]);

      const best = await quoter.getBestQuote(createMockParams());

      expect(best.quote.provider).toBe("1inch");
      expect(best.quote.toAmount).toBe(510_000_000_000_000_000n);
    });

    it("should throw when no valid quotes are available", async () => {
      const executor: SwapExecutor = {
        name: "uniswap",
        isAvailable: vi.fn().mockResolvedValue(false),
        getQuote: vi.fn().mockRejectedValue(new Error("no route")),
        getTransaction: vi.fn(),
        executeTransaction: vi.fn(),
        getSupportedTokens: vi.fn(),
      };

      const quoter = new SwapQuoter([executor]);

      await expect(quoter.getBestQuote(createMockParams())).rejects.toThrow(
        "No valid swap quotes available",
      );
    });
  });

  describe("getAvailableProviders", () => {
    it("should return all executor names", () => {
      const quoter = new SwapQuoter([
        createMockExecutor(createMockQuote({ provider: "uniswap" })),
        createMockExecutor(createMockQuote({ provider: "1inch" })),
      ]);

      expect(quoter.getAvailableProviders()).toEqual(["uniswap", "1inch"]);
    });
  });
});

// ============================================================
// Timeout & Error Recovery Tests
// ============================================================

describe("Timeout & Error Recovery", () => {
  it("should skip failed providers within timeout window", async () => {
    // Test that failed providers are gracefully skipped
    // (real timeout is tested via integration; here we verify error handling)
    const executor: SwapExecutor = {
      name: "1inch",
      isAvailable: vi.fn().mockResolvedValue(true),
      getQuote: vi.fn().mockRejectedValue(new Error("ETIMEDOUT")),
      getTransaction: vi.fn(),
      executeTransaction: vi.fn(),
      getSupportedTokens: vi.fn(),
    };

    const quoter = new SwapQuoter([executor], { quoteTimeoutMs: 500 });
    const quotes = await quoter.fetchQuotes(createMockParams());

    // The executor fails immediately, so it's caught by the try/catch
    expect(quotes).toHaveLength(0);
  });
});

// ============================================================
// Slippage Tests
// ============================================================

describe("Slippage calculations", () => {
  it("should calculate minimum received with 0.5% slippage", () => {
    const result = calculateMinimumReceived(1_000_000_000n, 50);
    expect(result).toBe(995_000_000n);
  });

  it("should calculate minimum received with 1% slippage", () => {
    const result = calculateMinimumReceived(1_000_000_000n, 100);
    expect(result).toBe(990_000_000n);
  });

  it("should throw for invalid slippage", () => {
    expect(() => calculateMinimumReceived(1_000_000_000n, -1)).toThrow();
    expect(() => calculateMinimumReceived(1_000_000_000n, 10_001)).toThrow();
  });
});
