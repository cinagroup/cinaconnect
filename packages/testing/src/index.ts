/**
 * @cinacoin/testing — Testing utilities for Cinacoin
 *
 * Export all testing utilities from a single entry point.
 */

// MockProvider
export {
  MockProvider,
  type MockResponseConfig,
  type MockProviderOptions,
  type ProviderEventMap,
  type ProviderEventListener,
  type RpcMethod,
  type RpcParams,
  type RpcResponse,
} from "./MockProvider.js";

// MockWallet
export {
  MockWallet,
  type WalletState,
  type MockWalletOptions,
} from "./MockWallet.js";

// MockChains
export {
  MOCK_CHAINS,
  getChainById,
  getChainByKey,
  createMockChain,
  allMockChains,
  type ChainConfig,
} from "./MockChains.js";

// MockTransactions
export {
  createMockTransaction,
  createMockReceipt,
  createMockLog,
  simulateTransaction,
  resetTxCounter,
  type MockTxParams,
  type MockTransaction,
  type MockTxReceipt,
  type MockLog,
  type TxStatus,
} from "./MockTransactions.js";

// Fixtures
export {
  ADDRESSES,
  SIGNATURES,
  HASHES,
  TYPED_DATA,
  ERC20_ABI,
  ERC721_ABI,
  CHAIN_FIXTURES,
  PROVIDER_STATES,
  ERRORS,
  type ProviderStateFixture,
} from "./fixtures.js";
