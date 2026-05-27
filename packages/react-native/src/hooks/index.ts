/**
 * @cinacoin/react-native/hooks
 *
 * React Native-specific hooks including EIP-5792, ENS, and more.
 */

// EIP-5792
export {
  useWalletCapabilities,
  useSendCalls,
  useAtomicBatch,
  useCallsStatus,
} from './useEIP5792.js';

export type {
  UseWalletCapabilitiesReturn,
  UseSendCallsReturn,
  SendCallsOptions,
  UseAtomicBatchReturn,
  AtomicBatchOptions,
  UseCallsStatusReturn,
} from './useEIP5792.js';

// ENS
export {
  useENSName,
  useENSAddress,
  resolveENSAddress,
  lookupENSName,
} from './useENS.js';

export type {
  UseENSNameReturn,
  UseENSAddressReturn,
} from './useENS.js';
