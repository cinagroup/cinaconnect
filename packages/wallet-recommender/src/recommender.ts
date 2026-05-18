/**
 * Wallet Recommender Engine
 *
 * Intelligent wallet recommendations based on chain, platform, user behavior, and EIP-6963 detection.
 */

import type { WalletRecommendation, RecommendationContext, ScoringWeights } from "./scoring.js";
import { scoreWallet, getChainCompatibleWallets, DEFAULT_WEIGHTS } from "./scoring.js";

/**
 * Wallet metadata used by the recommender.
 */
export interface WalletEntry {
  /** Wallet identifier */
  id: string;
  /** Display name */
  name: string;
  /** Supported chains */
  chains: string[];
  /** Supported platforms */
  platforms: string[];
  /** EIP-6963 installed flag */
  isEIP6963Installed?: boolean;
  /** Popularity rank (lower is better) */
  popularity: number;
  /** Whether it supports mobile */
  mobile?: boolean;
  /** Whether it supports desktop */
  desktop?: boolean;
  /** Whether it supports browser extension */
  extension?: boolean;
}

/**
 * User behavior profile for learning.
 */
export interface UserBehavior {
  /** Previously used wallets (in order) */
  history: string[];
  /** Preferred chain */
  preferredChain?: string;
  /** Preferred platform */
  preferredPlatform?: string;
  /** Wallet connection success rate by wallet */
  successRates: Record<string, number>;
}

/**
 * WalletRecommender — the main recommendation engine.
 */
export class WalletRecommender {
  private wallets: WalletEntry[] = [];
  private context: RecommendationContext;
  private behavior: UserBehavior;
  private weights: ScoringWeights;

  constructor(
    context?: Partial<RecommendationContext>,
    behavior?: Partial<UserBehavior>,
    weights?: Partial<ScoringWeights>
  ) {
    this.context = {
      targetChain: context?.targetChain ?? "evm",
      targetChainId: context?.targetChainId,
      platform: context?.platform ?? "browser",
      isMobile: context?.isMobile ?? false,
      ...context,
    };
    this.behavior = {
      history: behavior?.history ?? [],
      preferredChain: behavior?.preferredChain,
      preferredPlatform: behavior?.preferredPlatform,
      successRates: behavior?.successRates ?? {},
      ...behavior,
    };
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Register available wallets.
   */
  registerWallets(wallets: WalletEntry[]): void {
    this.wallets = wallets;
  }

  /**
   * Update the recommendation context.
   */
  setContext(context: Partial<RecommendationContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Update user behavior profile.
   */
  setBehavior(behavior: Partial<UserBehavior>): void {
    this.behavior = { ...this.behavior, ...behavior };
  }

  /**
   * Update scoring weights.
   */
  setWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Get ranked wallet recommendations.
   */
  recommend(limit: number = 10): WalletRecommendation[] {
    // Filter to chain-compatible wallets
    const compatible = getChainCompatibleWallets(
      this.wallets,
      this.context.targetChain,
      this.context.targetChainId
    );

    // Score and rank
    const scored = compatible.map((wallet) =>
      scoreWallet(wallet, this.context, this.behavior, this.weights)
    );

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  /**
   * Get the single best wallet.
   */
  getBestWallet(): WalletRecommendation | null {
    const recommendations = this.recommend(1);
    return recommendations[0] ?? null;
  }

  /**
   * Record a wallet usage event for behavior learning.
   */
  recordUsage(walletId: string, success: boolean): void {
    // Add to history (most recent first)
    this.behavior.history = this.behavior.history.filter((id) => id !== walletId);
    this.behavior.history.unshift(walletId);

    // Update success rate
    const prev = this.behavior.successRates[walletId] ?? 0;
    const count = Object.keys(this.behavior.successRates).filter(
      (k) => this.behavior.history.includes(k)
    ).length;
    this.behavior.successRates[walletId] = success
      ? Math.min(1, prev + 1 / (count + 1))
      : Math.max(0, prev - 1 / (count + 1));
  }

  /**
   * Get installed EIP-6963 wallets (boosted in recommendations).
   */
  getInstalledWallets(): WalletEntry[] {
    return this.wallets.filter((w) => w.isEIP6963Installed);
  }
}
