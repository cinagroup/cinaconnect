/**
 * @cinacoin/analytics
 *
 * Cinacoin Analytics SDK — GDPR-compliant event tracking and metrics.
 *
 * @example
 * ```ts
 * import { EventTracker, InMemoryProvider, ConsentManager } from '@cinacoin/analytics';
 *
 * const tracker = new EventTracker();
 * tracker.addProvider(new InMemoryProvider());
 *
 * await tracker.trackWalletConnected('metamask', 1);
 * await tracker.trackTransactionAttempted('0x123', 1, 'metamask');
 * ```
 */
// Tracker
export { EventTracker } from "./tracker.js.js";
// Providers
export { LocalStorageProvider, InMemoryProvider } from "./providers/local.js.js";
export { RemoteProvider } from "./providers/remote.js.js";
// Metrics
export { calculateConnectionMetrics, calculateWalletPopularity, calculateChainUsage, calculateTransactionSuccessRate, countUniqueSessions, } from "./metrics.js.js";
// Privacy
export { anonymizeEvent, anonymizeEvents, ConsentManager, exportUserData, deleteUserData, } from "./privacy.js.js";
//# sourceMappingURL=index.js.map