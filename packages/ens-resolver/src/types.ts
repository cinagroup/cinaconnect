/**
 * ENS Resolver Types
 */

export interface ENSRecord {
  key: string;
  value: string;
}

export interface ENSProfile {
  address: string | null;
  name: string | null;
  avatar: string | null;
  url: string | null;
  description: string | null;
  email: string | null;
  github: string | null;
  twitter: string | null;
  discord: string | null;
  records: ENSRecord[];
}

export interface ENSResolverConfig {
  /** Ethereum RPC URL or viem client */
  rpcUrl?: string;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtlMs?: number;
  /** Maximum cache entries (default: 1000) */
  maxCacheEntries?: number;
  /** Chain ID for ENS (default: 1 for mainnet) */
  chainId?: number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface ENSContracts {
  registry: string;
  resolver: string;
  reverseRegistrar: string;
}

export type ChainId = 1 | 11155111 | 10 | 137 | 8453 | 42161;

export const ENS_CHAIN_CONFIG: Record<ChainId, ENSContracts> = {
  1: {
    registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    resolver: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41",
    reverseRegistrar: "0x084b1c3C81545d370f3634392De611CaaBFf8148",
  },
  11155111: {
    registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    resolver: "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD",
    reverseRegistrar: "0x084b1c3C81545d370f3634392De611CaaBFf8148",
  },
  10: {
    registry: "0x798a5D02B60C516bcE14E9070D86c3c2E5975941",
    resolver: "0x898453F9036569168636d7A2655D48497aC1E675",
    reverseRegistrar: "0x084b1c3C81545d370f3634392De611CaaBFf8148",
  },
  137: {
    registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    resolver: "0x3599689E6292b81B2d85451025146515070129Bc",
    reverseRegistrar: "0x084b1c3C81545d370f3634392De611CaaBFf8148",
  },
  8453: {
    registry: "0xB32Cc05E843304CcF7e28A96E2F4c4b6c3c6E1D5",
    resolver: "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD",
    reverseRegistrar: "0x084b1c3C81545d370f3634392De611CaaBFf8148",
  },
  42161: {
    registry: "0xfe49127aE4127e87597eC5163349127aAbB1d760",
    resolver: "0x0468Ad7eF3c96B1F4c457e9B3E1566f8c00373a2",
    reverseRegistrar: "0x084b1c3C81545d370f3634392De611CaaBFf8148",
  },
};

export const ENS_ERRORS = {
  RESOLVE_FAILED: "ENS_RESOLVE_FAILED",
  LOOKUP_FAILED: "ENS_LOOKUP_FAILED",
  AVATAR_NOT_FOUND: "ENS_AVATAR_NOT_FOUND",
  INVALID_NAME: "ENS_INVALID_NAME",
  INVALID_ADDRESS: "ENS_INVALID_ADDRESS",
  RPC_ERROR: "ENS_RPC_ERROR",
  CACHE_ERROR: "ENS_CACHE_ERROR",
} as const;

export type ENSErrorCode = (typeof ENS_ERRORS)[keyof typeof ENS_ERRORS];

export class ENSResolverError extends Error {
  public code: ENSErrorCode;
  public details?: unknown;

  constructor(code: ENSErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ENSResolverError";
    this.code = code;
    this.details = details;
  }
}
