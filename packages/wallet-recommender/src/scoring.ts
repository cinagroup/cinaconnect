/**
 * Scoring Algorithm
 *
 * Scores wallets based on chain compatibility, platform match, user behavior,
 * and EIP-6963 installation boost.
 */

import type { WalletEntry } from "./recommender.js";

/**
 * Recommendation context.
 */
export interface RecommendationContext {
  /** Target chain family */
  targetChain: string;
  /** Target chain ID (optional) */
  targetChainId?: number;
  /** User platform */
  platform: string;
  /** Is mobile device */
  isMobile: boolean;
}

/**
 * Scoring weights configuration.
 */
export interface ScoringWeights {
  /** Weight for chain compatibility (0-1) */
  chainWeight: number;
  /** Weight for platform compatibility (0-1) */
  platformWeight: number;
  /** Weight for user behavior history (0-1) */
  behaviorWeight: number;
  /** Weight for EIP-6963 installation boost (0-1) */
  eip6963Weight: number;
  /** Weight for popularity ranking (0-1) */
  popularityWeight: number;
}

/** Default scoring weights */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  chainWeight: 0.3,
  platformWeight: 0.25,
  behaviorWeight: 0.2,
  eip6963Weight: 0.15,
  popularityWeight: 0.1,
};

/**
 * A wallet recommendation with its score and reasoning.
 */
export interface WalletRecommendation {
  wallet: WalletEntry;
  score: number;
  reasons: string[];
}

/**
 * Filter wallets to those compatible with the target chain.
 */
export function getChainCompatibleWallets(
  wallets: WalletEntry[],
  targetChain: string,
  targetChainId?: number
): WalletEntry[] {
  return wallets.filter((w) => {
    const chainMatch = w.chains.some(
      (c) =>
        c === targetChain ||
        c.includes(targetChain)
    );
    return chainMatch;
  });
}

/**
 * Score a single wallet.
 */
export function scoreWallet(
  wallet: WalletEntry,
  context: RecommendationContext,
  behavior: {
    history: string[];
    preferredChain?: string;
    preferredPlatform?: string;
    successRates: Record<string, number>;
  },
  weights: ScoringWeights
): WalletRecommendation {
  const reasons: string[] = [];

  // --- Chain compatibility score ---
  let chainScore = 0;
  if (wallet.chains.includes(context.targetChain)) {
    chainScore = 1;
    reasons.push(`Supports ${context.targetChain}`);
  } else {
    const partialMatch = wallet.chains.some((c) => c.includes(context.targetChain));
    if (partialMatch) chainScore = 0.5;
  }

  // --- Platform compatibility score ---
  // Only apply platform scoring if chain-compatible
  let platformScore = 0;
  if (chainScore > 0) {
    const normalizedPlatform = context.platform.toLowerCase();

    if (normalizedPlatform.includes("mobile") || context.isMobile) {
      if (wallet.mobile) {
        platformScore = 1;
        reasons.push("Mobile supported");
      }
    } else if (normalizedPlatform.includes("extension") || normalizedPlatform.includes("browser")) {
      if (wallet.extension) {
        platformScore = 1;
        reasons.push("Browser extension supported");
      }
    } else if (normalizedPlatform.includes("desktop")) {
      if (wallet.desktop) {
        platformScore = 1;
        reasons.push("Desktop supported");
      }
    }

    // If no specific platform match, check general platforms list
    if (platformScore === 0 && wallet.platforms.some((p) => p.toLowerCase().includes(normalizedPlatform))) {
      platformScore = 0.7;
      reasons.push("Platform compatible");
    }
  }

  // --- User behavior score ---
  // Only apply behavior scoring if chain-compatible
  let behaviorScore = 0;
  if (chainScore > 0) {
    const historyIndex = behavior.history.indexOf(wallet.id);
    if (historyIndex >= 0) {
      // More recent usage = higher score
      behaviorScore = Math.max(0.3, 1 - historyIndex * 0.15);
      reasons.push("Previously used");
    }

    // Success rate bonus
    const successRate = behavior.successRates[wallet.id] ?? 0;
    behaviorScore = Math.min(1, behaviorScore + successRate * 0.3);
    if (successRate > 0.8) {
      reasons.push("High success rate");
    }
  }

  // --- EIP-6963 installation boost ---
  // Only apply if chain-compatible
  let eip6963Score = 0;
  if (chainScore > 0 && wallet.isEIP6963Installed) {
    eip6963Score = 1;
    reasons.push("EIP-6963 detected (installed)");
  }

  // --- Popularity score ---
  // Only apply popularity if chain-compatible
  let popularityScore = 0;
  if (chainScore > 0 && wallet.popularity > 0) {
    popularityScore = 1 / wallet.popularity;
    reasons.push(`Popularity rank #${wallet.popularity}`);
  }

  // --- Weighted total ---
  const totalScore =
    chainScore * weights.chainWeight +
    platformScore * weights.platformWeight +
    behaviorScore * weights.behaviorWeight +
    eip6963Score * weights.eip6963Weight +
    popularityScore * weights.popularityWeight;

  return {
    wallet,
    score: Math.round(totalScore * 1000) / 1000,
    reasons,
  };
}
