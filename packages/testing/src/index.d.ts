/**
 * @cinacoin/testing — Testing utilities for Cinacoin
 *
 * Export all testing utilities from a single entry point.
 */
export { MockProvider, type MockResponseConfig, type MockProviderOptions, type ProviderEventMap, type ProviderEventListener, type RpcMethod, type RpcParams, type RpcResponse, } from "./MockProvider.js";
export { MockWallet, type WalletState, type MockWalletOptions, } from "./MockWallet.js";
export { MOCK_CHAINS, getChainById, getChainByKey, createMockChain, allMockChains, type ChainConfig, } from "./MockChains.js";
export { createMockTransaction, createMockReceipt, createMockLog, simulateTransaction, resetTxCounter, type MockTxParams, type MockTransaction, type MockTxReceipt, type MockLog, type TxStatus, } from "./MockTransactions.js";
export { ADDRESSES, SIGNATURES, HASHES, TYPED_DATA, ERC20_ABI, ERC721_ABI, CHAIN_FIXTURES, PROVIDER_STATES, ERRORS, type ProviderStateFixture, } from "./fixtures.js";
//# sourceMappingURL=index.d.ts.map