/**
 * @cinacoin/ens-resolver
 *
 * ENS name resolution, reverse lookup, avatar retrieval, and record fetching.
 *
 * ```ts
 * import { ENSResolver, createENSResolver } from '@cinacoin/ens-resolver';
 *
 * const resolver = createENSResolver({ rpcUrl: 'https://eth.llamarpc.com' });
 * const address = await resolver.resolveName('vitalik.eth');
 * ```
 */
export { ENSResolver, createENSResolver, resolveENSName, reverseLookupENS, getAvatarENS, } from "./ens.js.js";
export { ENS_CHAIN_CONFIG, ENS_ERRORS, ENSResolverError, } from "./types.js.js";
//# sourceMappingURL=index.js.map