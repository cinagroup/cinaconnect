/**
 * Wallet Recommender Engine
 *
 * Intelligent wallet recommendations based on chain, platform, user behavior, and EIP-6963 detection.
 */
import type { WalletRecommendation, RecommendationContext, ScoringWeights } from "./scoring.js";
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
export declare class WalletRecommender {
    private wallets;
    private context;
    private behavior;
    private weights;
    constructor(context?: Partial<RecommendationContext>, behavior?: Partial<UserBehavior>, weights?: Partial<ScoringWeights>);
    /**
     * Register available wallets.
     */
    registerWallets(wallets: WalletEntry[]): void;
    /**
     * Update the recommendation context.
     */
    setContext(context: Partial<RecommendationContext>): void;
    /**
     * Update user behavior profile.
     */
    setBehavior(behavior: Partial<UserBehavior>): void;
    /**
     * Update scoring weights.
     */
    setWeights(weights: Partial<ScoringWeights>): void;
    /**
     * Get ranked wallet recommendations.
     */
    recommend(limit?: number): WalletRecommendation[];
    /**
     * Get the single best wallet.
     */
    getBestWallet(): WalletRecommendation | null;
    /**
     * Record a wallet usage event for behavior learning.
     */
    recordUsage(walletId: string, success: boolean): void;
    /**
     * Get installed EIP-6963 wallets (boosted in recommendations).
     */
    getInstalledWallets(): WalletEntry[];
}
//# sourceMappingURL=recommender.d.ts.map