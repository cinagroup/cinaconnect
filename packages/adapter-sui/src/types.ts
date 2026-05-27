/**
 * Sui-specific types for the Cinacoin Sui adapter.
 *
 * Mirrors the shape of Sui RPC responses and wallet provider interfaces
 * without requiring `@mysten/sui.js` as a direct dependency.
 * Consumers who install the Sui SDK get full types; everyone else gets
 * enough to build, sign, and execute transactions.
 *
 * @packageDocumentation
 */

/* ------------------------------------------------------------------ */
/*  Sui networks                                                       */
/* ------------------------------------------------------------------ */

/**
 * Well-known Sui network identifiers.
 */
export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/**
 * Sui chain presets.
 */
export interface SuiChainPreset {
  id: string;
  name: string;
  rpcUrl: string;
  faucetUrl?: string;
  explorerUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Sui provider (injected wallet interface)                           */
/* ------------------------------------------------------------------ */

/**
 * Sui wallet provider — minimal shape shared by Sui Wallet, Suiet,
 * Ethos, and Martian wallet extensions.
 *
 * Based on the `@mysten/wallet-standard` WalletAccount interface
 * and the Sui Wallet injected `window.sui` object.
 */
export interface SuiWalletProvider {
  /** Whether the wallet is currently connected. */
  connected: boolean;

  /** Currently connected account address. */
  account?: string;

  /** Connect to the wallet (opens approval UI if needed). */
  connect(): Promise<{ accounts: string[]; chain?: string }>;

  /** Disconnect from the wallet. */
  disconnect(): Promise<void>;

  /**
   * Sign a transaction block and return the serialized bytes
   * along with the signature.
   */
  signTransaction(tx: string): Promise<{ bytes: string; signature: string }>;

  /**
   * Sign and execute a transaction block.
   * Returns the transaction digest (transaction hash).
   */
  signAndExecuteTransaction(
    tx: string,
    options?: { requestType?: 'WaitForLocalExec' | 'WaitForEffectsCert' },
  ): Promise<{ digest: string; effects?: unknown }>;

  /**
   * Sign an arbitrary message (BLS on personalMessage).
   */
  signMessage?(message: Uint8Array | string): Promise<{ message: string; signature: string }>;

  /**
   * Generic request passthrough for wallet-specific methods.
   */
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;

  /** Subscribe to account changes. */
  on(event: 'accountChanged', handler: (account: { address: string }) => void): void;
  on(event: 'disconnect', handler: () => void): void;

  /** Unsubscribe from events. */
  off(event: 'accountChanged', handler: (account: { address: string }) => void): void;
  off(event: 'disconnect', handler: () => void): void;
}

/* ------------------------------------------------------------------ */
/*  Sui RPC response types                                             */
/* ------------------------------------------------------------------ */

/**
 * Sui Coin balance returned by `suix_getBalance`.
 */
export interface SuiCoinBalance {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
  lockedBalance: Record<string, string>;
}

/**
 * Sui object returned by `sui_getObject`.
 */
export interface SuiObjectResponse {
  data?: {
    objectId: string;
    version: string;
    digest: string;
    type: string;
    owner?:
      | { AddressOwner: string }
      | { ObjectOwner: string }
      | { Shared: { initial_shared_version: string } };
    content?: unknown;
  };
  error?: {
    code: string;
    error: string;
  };
}

/**
 * Sui transaction effects summary.
 */
export interface SuiTransactionEffects {
  digest: string;
  transaction: string;
  gasUsed: {
    computationCost: string;
    storageCost: string;
    storageRebate: string;
    nonRefundableStorageFee: string;
  };
  status: {
    status: 'success' | 'failure';
    error?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Sui connector                                                      */
/* ------------------------------------------------------------------ */

/**
 * Platforms a Sui connector may run in.
 */
export type SuiPlatform = 'browser' | 'extension' | 'mobile';

/**
 * Feature flags that a Sui connector may advertise.
 */
export type SuiFeature =
  | 'sui:connect'
  | 'sui:signTransaction'
  | 'sui:signAndExecuteTransaction'
  | 'sui:signMessage'
  | 'sui:switchNetwork';

/**
 * Core interface every Sui wallet connector must implement.
 *
 * Modeled after the Wallet Standard pattern used by Sui wallets.
 *
 * @example
 * ```ts
 * const connector = new SuiWalletConnector();
 * if (connector.isAvailable()) {
 *   await connector.connect();
 *   const address = connector.getAddress();
 * }
 * ```
 */
export interface SuiConnector {
  /** Unique machine-readable id (e.g. "sui-wallet", "ethos", "suiet") */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Icon — SVG data URI, URL, or emoji */
  icon: string;

  /** Environments this connector works in */
  platforms: SuiPlatform[];

  /** Feature flags this connector supports */
  supportedFeatures: SuiFeature[];

  /**
   * Request connection from the wallet.
   */
  connect(): Promise<{ accounts: string[]; chain?: string }>;

  /**
   * Tear down the active connection.
   */
  disconnect(): Promise<void>;

  /**
   * Whether the connector's provider is currently accessible.
   */
  isAvailable(): boolean;

  /**
   * Get the connected account address (or null if not connected).
   */
  getAddress(): string | null;

  /**
   * Get the underlying provider for advanced usage.
   */
  getProvider(): SuiWalletProvider | null;

  /**
   * Sign a transaction block (raw base64 bytes).
   */
  signTransaction(tx: string): Promise<{ bytes: string; signature: string }>;

  /**
   * Sign and execute a transaction block.
   */
  signAndExecuteTransaction(
    tx: string,
    options?: { requestType?: 'WaitForLocalExec' | 'WaitForEffectsCert' },
  ): Promise<{ digest: string; effects?: unknown }>;

  /**
   * Subscribe to connector events.
   */
  on(event: string, handler: (...args: unknown[]) => void): void;

  /**
   * Unsubscribe from connector events.
   */
  off(event: string, handler: (...args: unknown[]) => void): void;
}

/* ------------------------------------------------------------------ */
/*  Sui transaction builder helpers                                    */
/* ------------------------------------------------------------------ */

/**
 * Simplified Sui transaction call — used by the adapter's
 * `signTransaction` / `executeTransaction` convenience methods.
 */
export interface SuiTransactionCall {
  /** Target Move function: `package::module::function` */
  target: string;

  /** Type arguments (e.g. ["0x2::sui::SUI"]) */
  typeArguments?: string[];

  /** Function call arguments */
  arguments?: unknown[];
}

/**
 * SUI coin transfer instruction.
 */
export interface SuiTransferSui {
  /** Recipient Sui address */
  recipient: string;

  /** Amount in MIST (1 SUI = 10^9 MIST). Omit for full balance. */
  amount?: string | bigint;
}

/* ------------------------------------------------------------------ */
/*  Sui address validation                                             */
/* ------------------------------------------------------------------ */

/**
 * Validate a Sui address.
 *
 * Sui addresses are hex strings prefixed with `0x`, typically 64 or 66
 * characters long (including `0x`), derived from the public key.
 */
export function isValidSuiAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  // Sui addresses start with 0x and are hex
  if (!address.startsWith('0x')) return false;
  const hex = address.slice(2);
  // Must be at least 32 bytes (64 hex chars)
  if (hex.length < 64) return false;
  // Check valid hex
  return /^[0-9a-fA-F]+$/.test(hex);
}
