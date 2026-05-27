/**
 * @cinacoin/testing — Testing utilities for Cinacoin
 *
 * Export all testing utilities from a single entry point.
 */
// MockProvider
export { MockProvider, } from "./MockProvider.js.js";
// MockWallet
export { MockWallet, } from "./MockWallet.js.js";
// MockChains
export { MOCK_CHAINS, getChainById, getChainByKey, createMockChain, allMockChains, } from "./MockChains.js.js";
// MockTransactions
export { createMockTransaction, createMockReceipt, createMockLog, simulateTransaction, resetTxCounter, } from "./MockTransactions.js.js";
// Fixtures
export { ADDRESSES, SIGNATURES, HASHES, TYPED_DATA, ERC20_ABI, ERC721_ABI, CHAIN_FIXTURES, PROVIDER_STATES, ERRORS, } from "./fixtures.js.js";
//# sourceMappingURL=index.js.map