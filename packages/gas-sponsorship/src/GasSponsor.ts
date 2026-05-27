import type { Address, Hex, PublicClient, UserOperation } from "viem";
import type {
  SponsorshipConfig,
  GasEstimate,
  SponsorshipResult,
  PaymasterBalance,
} from "./types";
import { getPaymasterAndData } from "./paymaster";

// ---------------------------------------------------------------------------
// Chain metadata
// ---------------------------------------------------------------------------

/** Known native tokens for common chains (extend as needed). */
const CHAIN_TOKENS: Record<number, { symbol: string; decimals: number; name: string }> = {
  1: { symbol: "ETH", decimals: 18, name: "Ethereum" },
  10: { symbol: "ETH", decimals: 18, name: "Optimism" },
  137: { symbol: "MATIC", decimals: 18, name: "Polygon" },
  8453: { symbol: "ETH", decimals: 18, name: "Base" },
  42161: { symbol: "ETH", decimals: 18, name: "Arbitrum" },
  59144: { symbol: "ETH", decimals: 18, name: "Linea" },
  534352: { symbol: "ETH", decimals: 18, name: "Scroll" },
  7777777: { symbol: "ZORA", decimals: 18, name: "Zora" },
  11155111: { symbol: "ETH", decimals: 18, name: "Sepolia" },
};

/** Default native token fallback. */
const DEFAULT_TOKEN = { symbol: "ETH", decimals: 18, name: "Unknown" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a JSON price for native token → USD from a public source.
 * Falls back to 0 on any error.
 */
async function fetchNativePriceUsd(chainId: number): Promise<number> {
  const coingeckoIds: Record<number, string> = {
    1: "ethereum",
    10: "ethereum",
    137: "matic-network",
    8453: "ethereum",
    42161: "ethereum",
    59144: "ethereum",
    534352: "ethereum",
    7777777: "zora",
    11155111: "ethereum",
  };
  const id = coingeckoIds[chainId];
  if (!id) return 0;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    );
    if (!res.ok) {
      return 0;
    }
    const data = await res.json();
    return data[id]?.usd ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Format a wei amount into a human-readable string with symbol.
 */
function formatBalance(wei: bigint, decimals: number, symbol: string): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = wei / divisor;
  const frac = wei % divisor;
  // Show 6 decimal places
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6);
  return `${whole}.${fracStr} ${symbol}`;
}

// ---------------------------------------------------------------------------
// GasSponsor class
// ---------------------------------------------------------------------------

/**
 * Enterprise gas sponsorship manager for smart accounts.
 *
 * Wraps paymaster integration (Pimlico, Alchemy, Candle) with gas
 * estimation, price lookups, and paymaster balance management.
 */
export class GasSponsor {
  /** Public client for on-chain reads. */
  public readonly publicClient: PublicClient;

  constructor(publicClient: PublicClient) {
    this.publicClient = publicClient;
  }

  /**
   * Estimate gas for a user operation.
   *
   * @param userOperation - Partial user operation with callData & sender.
   * @param chainId - Target chain ID.
   * @returns Full gas estimate with wei and USD cost.
   */
  async estimateGas(
    userOperation: Partial<UserOperation>,
    chainId: number,
  ): Promise<GasEstimate> {
    const verificationGasLimit = BigInt(userOperation.verificationGasLimit ?? 100_000);
    const callGasLimit = BigInt(userOperation.callGasLimit ?? 50_000);
    const preVerificationGas = BigInt(userOperation.preVerificationGas ?? 30_000);
    const maxFeePerGas = BigInt(userOperation.maxFeePerGas ?? (await this.getMaxFeePerGas(chainId)));
    const maxPriorityFeePerGas = BigInt(
      userOperation.maxPriorityFeePerGas ?? (await this.getGasPrice(chainId)),
    );

    const totalGasLimit = verificationGasLimit + callGasLimit + preVerificationGas;
    const estimatedCostWei = totalGasLimit * maxFeePerGas;

    const priceUsd = await fetchNativePriceUsd(chainId);
    const token = CHAIN_TOKENS[chainId] ?? DEFAULT_TOKEN;
    const divisor = 10n ** BigInt(token.decimals);
    const costEther = Number(estimatedCostWei) / Number(divisor);
    const estimatedCostUsd = priceUsd > 0 ? costEther * priceUsd : 0;

    return {
      verificationGasLimit,
      callGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      totalGasLimit,
      estimatedCostWei,
      estimatedCostUsd,
      chainId,
    };
  }

  /**
   * Sponsor a user operation by attaching paymaster data.
   *
   * @param userOperation - User operation to sponsor.
   * @param config - Sponsorship configuration.
   * @param chainId - Target chain ID.
   * @returns Sponsorship result with both original and sponsored operations.
   */
  async sponsorUserOperation(
    userOperation: UserOperation,
    config: SponsorshipConfig,
    chainId: number,
  ): Promise<SponsorshipResult> {
    if (!config.sponsorGas) {
      throw new Error("Gas sponsorship is disabled (sponsorGas: false)");
    }

    const paymasterAndData = await getPaymasterAndData(
      userOperation,
      config.paymasterUrl,
      chainId,
    );

    const sponsoredUserOperation: UserOperation = {
      ...userOperation,
      paymasterAndData,
    };

    return {
      userOperation,
      sponsoredUserOperation,
      paymasterAddress: (config.paymasterAddress ?? "0x0000000000000000000000000000000000000000") as Address,
      paymasterAndData,
      sponsoredGasWei:
        (BigInt(userOperation.callGasLimit ?? 0n) +
          BigInt(userOperation.verificationGasLimit ?? 0n)) *
        BigInt(userOperation.maxFeePerGas ?? 0n),
      chainId,
    };
  }

  /**
   * Get current base gas price for a chain (acts as maxPriorityFeePerGas fallback).
   *
   * @param chainId - Target chain ID.
   * @returns Gas price in wei.
   */
  async getGasPrice(chainId: number): Promise<bigint> {
    try {
      const gasPrice = await this.publicClient.getGasPrice();
      return gasPrice;
    } catch {
      // Fallback: return a reasonable default per chain
      const defaults: Record<number, bigint> = {
        1: 20_000_000_000n,
        10: 1_000_000n,
        137: 50_000_000_000n,
        8453: 1_000_000n,
        42161: 100_000_000n,
        11155111: 1_000_000_000n,
      };
      return defaults[chainId] ?? 1_000_000_000n;
    }
  }

  /**
   * Get EIP-1559 max fee per gas for a chain.
   *
   * @param chainId - Target chain ID.
   * @returns Max fee per gas in wei.
   */
  async getMaxFeePerGas(chainId: number): Promise<bigint> {
    try {
      const block = await this.publicClient.getBlock();
      if (block.baseFeePerGas) {
        // Max fee = base * 2 (covers up to 100% increase)
        return block.baseFeePerGas * 2n;
      }
    } catch {
      // Fall through to defaults
    }
    const defaults: Record<number, bigint> = {
      1: 40_000_000_000n,
      10: 2_000_000n,
      137: 100_000_000_000n,
      8453: 2_000_000n,
      42161: 200_000_000n,
      11155111: 2_000_000_000n,
    };
    return defaults[chainId] ?? 2_000_000_000n;
  }

  /**
   * Get the current paymaster balance on a given chain.
   *
   * @param paymasterAddress - Paymaster contract address.
   * @param chainId - Target chain ID.
   * @param threshold - Optional low-balance alert threshold.
   * @returns Paymaster balance info.
   */
  async getSponsoredBalance(
    paymasterAddress: Address,
    chainId: number,
    threshold?: bigint,
  ): Promise<PaymasterBalance> {
    const balanceWei = await this.publicClient.getBalance({
      address: paymasterAddress,
    });
    const token = CHAIN_TOKENS[chainId] ?? DEFAULT_TOKEN;

    return {
      paymasterAddress,
      chainId,
      balanceWei,
      balanceFormatted: formatBalance(balanceWei, token.decimals, token.symbol),
      isLow: threshold !== undefined ? balanceWei < threshold : false,
    };
  }

  /**
   * Fund the paymaster by sending native token to its address.
   *
   * NOTE: This constructs transaction parameters but does NOT broadcast.
   * The caller must sign and send via their wallet.
   *
   * @param paymasterAddress - Paymaster contract address.
   * @param chainId - Target chain ID.
   * @param amount - Amount in wei to send.
   * @returns Transaction parameters for funding.
   */
  async fundPaymaster(
    paymasterAddress: Address,
    _chainId: number,
    amount: bigint,
  ): Promise<{ to: Address; value: bigint; data: Hex }> {
    return {
      to: paymasterAddress,
      value: amount,
      data: "0x" as Hex,
    };
  }
}
