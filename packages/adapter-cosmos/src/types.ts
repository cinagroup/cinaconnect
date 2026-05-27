/**
 * Cosmos-specific type definitions for the Cinacoin Cosmos adapter.
 *
 * Compatible with CosmJS types while providing a simplified surface for
 * the @cinacoin/core-sdk ChainAdapter interface.
 */

/* ------------------------------------------------------------------ */
/*  Chain IDs                                                           */
/* ------------------------------------------------------------------ */

/**
 * Well-known Cosmos SDK chain IDs.
 *
 * Extends string to provide autocomplete for common chains while
 * allowing arbitrary chain IDs for testnets and custom networks.
 */
export type CosmosChainId =
  | 'cosmoshub-4'
  | 'osmosis-1'
  | 'injective-1'
  | 'celestia'
  | 'juno-1'
  | 'evmos_9001-2'
  | 'stride-1'
  | 'stargaze-1'
  | 'secret-4'
  | 'akashnet-2'
  | string;

/* ------------------------------------------------------------------ */
/*  Coin / Token                                                        */
/* ------------------------------------------------------------------ */

/**
 * Represents a Cosmos coin with a denomination and amount.
 *
 * Amounts are expressed in the smallest unit (e.g. `uatom` for ATOM,
 * not the human-readable ATOM).
 */
export interface Coin {
  /** Denomination string (e.g. "uatom", "uosmo", "inj"). */
  denom: string;
  /** Amount in the smallest unit (string to preserve precision). */
  amount: string;
}

/**
 * Convenience coin shape using a numeric amount for ergonomic usage.
 * Converted internally to the string-based CosmJS `Coin`.
 */
export interface CoinInput {
  /** Denomination string. */
  denom: string;
  /** Amount (will be converted to string internally). */
  amount: number | string;
}

/* ------------------------------------------------------------------ */
/*  Chain metadata                                                      */
/* ------------------------------------------------------------------ */

/** Metadata for a Cosmos SDK chain. */
export interface CosmosChainInfo {
  /** Chain ID (e.g. "cosmoshub-4"). */
  chainId: CosmosChainId;
  /** Human-readable chain name. */
  name: string;
  /** REST API endpoint (LCD). */
  restUrl: string;
  /** RPC endpoint for Tendermint/Cosmos RPC. */
  rpcUrl: string;
  /** Native currency metadata. */
  nativeCurrency: {
    name: string;
    symbol: string;
    denom: string;
    decimals: number;
  };
  /** Block explorer URL. */
  explorerUrl?: string;
  /** Icon URL for the chain. */
  iconUrl?: string;
  /** BIP-44 coin type for HD derivation. */
  coinType?: number;
  /** Bech32 prefix for addresses. */
  bech32Prefix?: string;
}

/* ------------------------------------------------------------------ */
/*  Transaction                                                         */
/* ------------------------------------------------------------------ */

/** Result of a Cosmos transaction broadcast. */
export interface TxResult {
  /** Transaction hash (hex string, 64 characters). */
  transactionHash: string;
  /** Height at which the transaction was included. */
  height?: number;
  /** Gas used. */
  gasUsed?: number;
  /** Raw log output. */
  rawLog?: string;
  /** Whether the transaction succeeded (code === 0). */
  success: boolean;
  /** Error message if the transaction failed. */
  error?: string;
}

/**
 * Parameters for a token transfer.
 */
export interface TransferParams {
  /** Recipient address (bech32-encoded). */
  to: string;
  /** Amount in the smallest unit. */
  amount: number | string;
  /** Token denomination (e.g. "uatom"). */
  denom: string;
  /** Optional memo. */
  memo?: string;
  /** Optional explicit gas limit. */
  gas?: number;
}

/**
 * Parameters for a generic Cosmos transaction.
 */
export interface CosmosTransaction {
  /** Array of messages to include in the transaction. */
  messages: unknown[];
  /** Optional memo. */
  memo?: string;
  /** Optional explicit fee. */
  fee?: {
    gas: string;
    amount: Coin[];
  };
}

/* ------------------------------------------------------------------ */
/*  SignDoc (CosmJS compatible)                                         */
/* ------------------------------------------------------------------ */

/**
 * SignDoc represents the document that needs to be signed for a Cosmos
 * transaction. Compatible with the CosmJS `SignDoc` type.
 *
 * @see https://github.com/cosmos/cosmjs/blob/main/packages/proto-signing/src/signing.ts
 */
export interface SignDoc {
  /** Body bytes of the transaction. */
  bodyBytes: Uint8Array;
  /** Auth info bytes of the transaction. */
  authInfoBytes: Uint8Array;
  /** Chain ID. */
  chainId: string;
  /** Account number. */
  accountNumber: number;
}

/* ------------------------------------------------------------------ */
/*  Wallet connector interface                                          */
/* ------------------------------------------------------------------ */

/**
 * Abstract interface for Cosmos wallet connectors (Keplr, Leap, etc.).
 *
 * Each connector implementation wraps the wallet's browser extension
 * API and exposes a uniform interface to the CosmosAdapter.
 */
export interface CosmosWalletConnector {
  /** Unique connector identifier (e.g. "keplr", "leap"). */
  readonly id: string;
  /** Human-readable connector name. */
  readonly name: string;

  /** Whether the wallet is installed and available. */
  isAvailable(): boolean;

  /**
   * Connect to the wallet and request permission for the given chain.
   * @param chainId - Cosmos chain ID to connect to.
   * @returns Address and chain info.
   */
  connect(chainId: string): Promise<{
    address: string;
    chainId: string;
  }>;

  /** Disconnect from the wallet. */
  disconnect(): Promise<void>;

  /**
   * Sign a SignDoc using the connected wallet.
   * @param signerAddress - Bech32 address of the signer.
   * @param signDoc - Transaction document to sign.
   * @returns Signature bytes.
   */
  sign(signerAddress: string, signDoc: SignDoc): Promise<{
    signature: Uint8Array;
    signed: SignDoc;
  }>;

  /**
   * Sign arbitrary text/data with the connected wallet.
   * @param signerAddress - Bech32 address of the signer.
   * @param data - Data to sign.
   * @returns Signature bytes.
   */
  signArbitrary(
    signerAddress: string,
    data: string | Uint8Array,
  ): Promise<{
    signature: Uint8Array;
  }>;

  /**
   * Send a token transfer through the wallet.
   * @param chainId - Target chain ID.
   * @param recipient - Recipient bech32 address.
   * @param amount - Amount in smallest unit.
   * @param denom - Token denomination.
   * @param memo - Optional memo.
   * @returns Transaction hash.
   */
  sendTransfer(
    chainId: string,
    recipient: string,
    amount: string,
    denom: string,
    memo?: string,
  ): Promise<string>;

  /**
   * Get the current chain ID from the wallet.
   */
  getChainId(): Promise<string>;

  /**
   * Get accounts available on the given chain.
   */
  getAccounts(chainId: string): Promise<
    Array<{
      address: string;
      algo: string;
      pubkey: Uint8Array;
    }>
  >;
}
