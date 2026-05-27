/**
 * @cinacoin/adapter-cosmos
 *
 * Cosmos ecosystem chain adapter for the Cinacoin SDK.
 *
 * Provides support for Cosmos SDK chains including:
 * - Cosmos Hub (ATOM)
 * - Osmosis (OSMO)
 * - Injective (INJ)
 * - Celestia (TIA)
 *
 * Wallet connectors:
 * - Keplr
 * - Leap
 *
 * @example
 * ```ts
 * import { CosmosAdapter, COSMOS_CHAINS } from '@cinacoin/adapter-cosmos';
 *
 * const cosmos = new CosmosAdapter({
 *   chainId: 'cosmoshub-4',
 *   rpcUrl: 'https://rpc.cosmos.network',
 * });
 *
 * const { address } = await cosmos.connect();
 * console.log('Connected:', address);
 *
 * const tx = await cosmos.sendTransfer({
 *   to: 'cosmos1...',
 *   amount: 1000000,
 *   denom: 'uatom',
 * });
 * console.log('TX hash:', tx.transactionHash);
 * ```
 *
 * @packageDocumentation
 */

// Core adapter
export { CosmosAdapter } from './CosmosAdapter.js';
export type { CosmosAdapterConfig, CosmosConnectResult } from './CosmosAdapter.js';
export { COSMOS_CHAINS, COSMOS_CHAIN_INFO } from './CosmosAdapter.js';

// Wallet connectors
export { KeplrConnector } from './connectors/keplr.js';
export { LeapConnector } from './connectors/leap.js';

// Types
export type {
  CosmosChainId,
  Coin,
  CoinInput,
  CosmosChainInfo,
  TxResult,
  TransferParams,
  CosmosTransaction,
  SignDoc,
  CosmosWalletConnector,
} from './types.js';
