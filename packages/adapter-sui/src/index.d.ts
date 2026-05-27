/**
 * Cinacoin Sui Adapter — Sui chain adapter package.
 *
 * Provides a {@link SuiChainAdapter} that implements the
 * {@link ChainAdapter} interface from @cinacoin/core-sdk,
 * plus wallet connectors for Sui Wallet, Suiet, Ethos, and Martian.
 *
 * @packageDocumentation
 * @example
 * ```ts
 * import { SuiChainAdapter, SUI_CHAINS, SUI_WALLETS } from '@cinacoin/adapter-sui';
 *
 * const adapter = new SuiChainAdapter();
 * adapter.registerChains(SUI_CHAINS);
 *
 * // Connect to the first available wallet
 * const address = await adapter.connect();
 * console.log('Connected:', address);
 *
 * // Query balance
 * const balance = await adapter.getBalance(address);
 * console.log(`${balance} SUI`);
 *
 * // Query a Sui object
 * const obj = await adapter.getObject('0x2::sui::SUI');
 * ```
 */
export { SuiChainAdapter, SUI_CHAINS, SUI_WALLETS, mistToSui, suiToMist, } from './SuiAdapter.js';
export { SuiWalletConnector } from './connectors/sui-wallet.js';
export { SuietConnector } from './connectors/suiet.js';
export { EthosConnector } from './connectors/ethos.js';
export { MartianConnector } from './connectors/martian.js';
export { isValidSuiAddress } from './types.js';
export type { SuiNetwork, SuiChainPreset, SuiWalletProvider, SuiCoinBalance, SuiObjectResponse, SuiTransactionEffects, SuiPlatform, SuiFeature, SuiConnector, SuiTransactionCall, SuiTransferSui, } from './types.js';
/**
 * Package version.
 */
export declare const VERSION = "0.1.0";
//# sourceMappingURL=index.d.ts.map