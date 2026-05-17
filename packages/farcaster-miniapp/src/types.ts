/**
 * Farcaster Mini App types.
 *
 * @packageDocumentation
 */

/**
 * Farcaster user profile data.
 */
export interface FarcasterUser {
  /** Farcaster user fid (unique identifier). */
  fid: number;
  /** Username (without @). */
  username: string;
  /** Display name. */
  display_name?: string;
  /** Profile picture URL. */
  pfp_url?: string;
  /** User bio. */
  bio?: string;
  /** External URL. */
  url?: string;
  /** Whether the user is verified. */
  verified: boolean;
  /** Farcaster custody address. */
  custody_address?: `0x${string}`;
  /** Verified Ethereum addresses. */
  verified_addresses?: {
    eth_addresses?: `0x${string}`[];
    sol_addresses?: string[];
  };
}

/**
 * Farcaster Mini App context data.
 */
export interface FarcasterContext {
  /** Farcaster user. */
  user: FarcasterUser | null;
  /** Current client fid. */
  clientFid: number | null;
  /** Whether running inside Farcaster. */
  isInFarcaster: boolean;
  /** Mini App version. */
  version: string;
}

/**
 * Sign-In with Farcaster parameters.
 */
export interface SignInWithFarcasterParams {
  /** Domain requesting the sign-in. */
  domain: string;
  /** Nonce for replay protection. */
  nonce: string;
  /** Optional statement to display. */
  statement?: string;
  /** Optional URI. */
  uri?: string;
  /** Optional version. */
  version?: string;
  /** Optional chain ID. */
  chainId?: number;
}

/**
 * Result of Sign-In with Farcaster.
 */
export interface SignInWithFarcasterResult {
  /** Whether authentication succeeded. */
  success: boolean;
  /** Farcaster user (if authenticated). */
  user?: FarcasterUser;
  /** Signature proving ownership. */
  signature?: `0x${string}`;
  /** Signed message. */
  message?: string;
  /** Error message. */
  error?: string;
}

/**
 * Configuration for FarcasterProvider.
 */
export interface FarcasterProviderConfig {
  /** Chain IDs supported by the dApp. */
  chains?: number[];
  /** App name for display. */
  appName?: string;
  /** Whether to auto-initialize. */
  autoInit?: boolean;
  /** Custom context override (for testing). */
  contextOverride?: FarcasterContext;
}

/**
 * Wallet connection state within Farcaster.
 */
export interface FarcasterWalletState {
  /** Whether wallet is connected. */
  connected: boolean;
  /** Connected account address. */
  account?: `0x${string}`;
  /** Connected chain ID. */
  chainId?: number;
  /** Farcaster user data. */
  user?: FarcasterUser;
}
