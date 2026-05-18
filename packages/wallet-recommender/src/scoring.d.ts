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
export declare const DEFAULT_WEIGHTS: ScoringWeights;
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
export declare function getChainCompatibleWallets(wallets: WalletEntry[], targetChain: string, targetChainId?: number): WalletEntry[];
/**
 * Score a single wallet.
 */
export declare function scoreWallet(wallet: WalletEntry, context: RecommendationContext, behavior: {
    history: string[];
    preferredChain?: string;
    preferredPlatform?: string;
    successRates: Record<string, number>;
}, weights: ScoringWeights): WalletRecommendation;
//# sourceMappingURL=scoring.d.ts.map