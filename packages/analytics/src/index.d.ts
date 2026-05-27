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
export type { AnalyticsEvent, AnalyticsEventType, AnalyticsProvider, WalletProvider, ConnectionMetrics, WalletPopularity, ChainUsage, ConsentPreferences, AnonymizeOptions, DataExport, } from "./types.js";
export { EventTracker } from "./tracker.js";
export { LocalStorageProvider, InMemoryProvider } from "./providers/local.js";
export { RemoteProvider } from "./providers/remote.js";
export type { RemoteProviderConfig } from "./providers/remote.js";
export { calculateConnectionMetrics, calculateWalletPopularity, calculateChainUsage, calculateTransactionSuccessRate, countUniqueSessions, } from "./metrics.js";
export { anonymizeEvent, anonymizeEvents, ConsentManager, exportUserData, deleteUserData, } from "./privacy.js";
//# sourceMappingURL=index.d.ts.map