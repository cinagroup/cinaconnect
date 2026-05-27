/**
 * @cinacoin/wallet-recommender
 *
 * Cinacoin Wallet Recommender Engine — intelligent wallet suggestions.
 *
 * @example
 * ```ts
 * import { WalletRecommender } from '@cinacoin/wallet-recommender';
 *
 * const recommender = new WalletRecommender({
 *   targetChain: 'evm',
 *   platform: 'browser',
 * });
 *
 * recommender.registerWallets(wallets);
 * const top = recommender.recommend(3);
 * ```
 */

export { WalletRecommender } from "./recommender.js";
export type { WalletEntry, UserBehavior } from "./recommender.js";

export {
  scoreWallet,
  getChainCompatibleWallets,
  DEFAULT_WEIGHTS,
} from "./scoring.js";
export type {
  RecommendationContext,
  ScoringWeights,
  WalletRecommendation,
} from "./scoring.js";
