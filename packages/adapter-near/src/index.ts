/**
 * @cinacoin/adapter-near
 *
 * NEAR chain adapter for the Cinacoin SDK.
 * Supports NEAR Wallet, Here Wallet, and Meteor Wallet.
 *
 * @packageDocumentation
 */

// NEAR adapter
export { NearChainAdapter } from './NearAdapter.js';

// Wallet connectors
export { NearWalletConnector } from './connectors/near-wallet.js';
export { HereWalletConnector } from './connectors/here-wallet.js';

// Types
export {
  NEAR_CHAINS,
  NEAR_WALLETS,
  type NearWalletInfo,
  type NearFunctionCall,
  type NearTransferAction,
  type NearTransaction,
  type NearTransactionResult,
  type NearWalletConnector as NearWalletConnectorInterface,
  type NearConnectParams,
} from './types.js';
