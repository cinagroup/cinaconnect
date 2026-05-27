/**
 * @cinacoin/tx-indexer
 *
 * Lightweight transaction history indexer — listens to on-chain events,
 * stores to SQLite, serves REST API queries.
 *
 * Supports ETH, Polygon, BSC out of the box.
 */

export { TxIndexer } from './indexer.js';
export { EventStore } from './storage.js';
export {
  createIndexerServer,
  IndexerServer,
} from './server.js';
export type {
  IndexedEvent,
  EventType,
  EventQuery,
  PaginatedEvents,
  ChainConfig,
  IndexerConfig,
  RestApiConfig,
  ApiHealthStatus,
} from './types.js';
export {
  ERC20_TRANSFER_ABI,
  UNISWAP_V2_SWAP_ABI,
  BRIDGE_DEPOSIT_ABI,
  BRIDGE_WITHDRAWAL_ABI,
} from './types.js';
