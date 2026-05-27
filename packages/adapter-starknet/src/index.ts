/**
 * @cinacoin/adapter-starknet
 *
 * Starknet chain adapter for the Cinacoin SDK.
 * Supports Argent X and Braavos wallets with native account abstraction.
 *
 * @packageDocumentation
 */

// Starknet adapter
export { StarknetChainAdapter } from './StarknetAdapter.js';

// Wallet connectors
export { ArgentXConnector } from './connectors/argent-x.js';
export { BraavosConnector } from './connectors/braavos.js';

// Types
export {
  STARKNET_CHAINS,
  STARKNET_WALLETS,
  type StarknetWalletInfo,
  type StarknetCall,
  type StarknetTransaction,
  type StarknetTransactionResult,
  type StarknetWalletConnector,
  type StarknetConnectParams,
} from './types.js';
