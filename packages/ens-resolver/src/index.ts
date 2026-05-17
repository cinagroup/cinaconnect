/**
 * @onchainux/ens-resolver
 *
 * ENS name resolution, reverse lookup, avatar retrieval, and record fetching.
 *
 * ```ts
 * import { ENSResolver, createENSResolver } from '@onchainux/ens-resolver';
 *
 * const resolver = createENSResolver({ rpcUrl: 'https://eth.llamarpc.com' });
 * const address = await resolver.resolveName('vitalik.eth');
 * ```
 */

export {
  ENSResolver,
  createENSResolver,
  resolveENSName,
  reverseLookupENS,
  getAvatarENS,
} from "./ens.js.js";

export type {
  ENSRecord,
  ENSProfile,
  ENSResolverConfig,
  CacheEntry,
  ENSContracts,
  ChainId,
  ENSErrorCode,
} from "./types.js.js";

export {
  ENS_CHAIN_CONFIG,
  ENS_ERRORS,
  ENSResolverError,
} from "./types.js.js";
