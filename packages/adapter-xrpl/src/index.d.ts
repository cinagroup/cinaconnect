/**
 * @cinacoin/adapter-xrpl
 *
 * XRP Ledger chain adapter for Cinacoin.
 *
 * Supports Xaman (formerly Xumm), Fireblocks, and Ledger.
 *
 * @example
 * ```ts
 * import { XrplAdapter, XamanConnector, announceXrplProviders } from '@cinacoin/adapter-xrpl';
 *
 * // Announce providers for EIP-6963 discovery
 * announceXrplProviders();
 *
 * // Use the adapter directly
 * const adapter = new XrplAdapter();
 * const result = await adapter.connect({ connectorId: 'xaman' });
 * const { transactionHash } = await adapter.sendXRP({
 *   destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDH',
 *   amount: '1000000',
 * });
 *
 * // Or use individual connectors
 * const xaman = new XamanConnector();
 * if (xaman.isAvailable()) {
 *   await xaman.connect();
 * }
 * ```
 */
export { XrplAdapter, announceXrplProviders, } from './XrplAdapter.js';
export { XamanConnector, announceXamanEIP6963 } from './connectors/xaman.js';
export type { XrplNetwork, XrplFeature, XrplPlatform, XrplProvider, XrplConnectorEvents, XrplConnectionResult, XrpSendParams, AccountSettingsParams, TrustLineParams, NftMintParams, NftBurnParams, XrplConnector, XrplConnectorRegistry, EIP6963XrplProviderDetail, } from './types.js';
//# sourceMappingURL=index.d.ts.map