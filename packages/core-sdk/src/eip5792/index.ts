/**
 * EIP-5792: Wallet Call API.
 *
 * Implements the Wallet Call API for embedded wallet interactions,
 * including atomic batch transactions, capabilities discovery,
 * and asynchronous call tracking.
 *
 * @see https://eips.ethereum.org/EIPS/eip-5792
 * @packageDocumentation
 */

// Types
export type {
  WalletCapabilities,
  ChainCapabilities,
  Call,
  SendCallsParams,
  SendCallsResult,
  CallsStatus,
  GetCallsStatusResult,
  CallReceipt,
  GetCapabilitiesParams,
  AtomicBatchConfig,
  AtomicBatchResult,
} from './types.js';

// Capabilities
export {
  walletGetCapabilities,
  hasCapability,
  getChainCapabilities,
  getSupportedChains,
  filterByCapability,
} from './capabilities.js';

// Send Calls
export {
  walletSendCalls,
  sendSingleCall,
  sendErc20Transfer,
  sendBatch,
} from './sendCalls.js';

// Get Calls Status
export {
  walletGetCallsStatus,
  waitForCallsStatus,
  allCallsSucceeded,
  getFailedReceipts,
} from './getCallsStatus.js';

// Atomic Batch
export {
  supportsAtomicBatch,
  buildAtomicBatch,
  executeAtomicBatch,
  createEthTransferCall,
  createContractCall,
  createErc20ApproveCall,
  createApproveAndSwapCalls,
  validateBatchConfig,
} from './atomic.js';
