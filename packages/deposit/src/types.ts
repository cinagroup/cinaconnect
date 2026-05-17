/** Supported deposit statuses. */
export enum DepositStatus {
  /** Deposit initiated, awaiting user action. */
  PENDING = "pending",
  /** Deposit transaction submitted, awaiting confirmation. */
  PROCESSING = "processing",
  /** Deposit confirmed and funds received. */
  COMPLETED = "completed",
  /** Deposit failed or rejected. */
  FAILED = "failed",
}

/** Information about a supported exchange. */
export interface ExchangeInfo {
  /** Exchange identifier slug (e.g. "binance"). */
  id: string;
  /** Display name. */
  name: string;
  /** Exchange logo URL or asset path. */
  logo: string;
  /** Assets available on this exchange for deposit. */
  supportedAssets: AssetInfo[];
  /** Supported blockchain networks. */
  supportedNetworks: string[];
  /** Fee structure for deposits. */
  feeStructure: FeeStructure;
  /** Minimum deposit amount in the asset's base unit. */
  minAmount: number;
  /** Base deposit URL (without params). */
  baseUrl: string;
  /** Whether the exchange supports deep-link redirects. */
  supportsDeepLink: boolean;
  /** Webhook endpoint for status updates (optional). */
  webhookUrl?: string;
}

/** A tradable asset on an exchange. */
export interface AssetInfo {
  /** Asset symbol (e.g. "USDC", "ETH"). */
  symbol: string;
  /** Full name of the asset. */
  name: string;
  /** Networks this asset is available on. */
  networks: NetworkInfo[];
  /** Asset icon URL or path. */
  icon?: string;
}

/** A blockchain network for an asset. */
export interface NetworkInfo {
  /** Network identifier (e.g. "eth", "base", "arb", "polygon", "solana"). */
  id: string;
  /** Display name. */
  name: string;
  /** Chain ID (null for non-EVM chains like Solana). */
  chainId: number | null;
  /** Whether deposits on this network are currently available. */
  available: boolean;
}

/** Fee structure for a given exchange. */
export interface FeeStructure {
  /** Deposit fee percentage (e.g. 0 for free deposits). */
  depositFeePercent: number;
  /** Withdrawal fee (fixed amount, asset-dependent). */
  withdrawalFee?: string;
  /** Network fee note. */
  networkFeeNote?: string;
}

/** Parameters for generating a deposit URL. */
export interface DepositUrlParams {
  /** Exchange identifier. */
  exchangeId: string;
  /** Asset symbol. */
  asset: string;
  /** Network identifier. */
  network: string;
  /** Optional: user's receiving address. */
  receivingAddress?: string;
}

/** Request to initiate a deposit flow. */
export interface DepositRequest {
  /** Exchange identifier. */
  exchangeId: string;
  /** Asset symbol (e.g. "USDC"). */
  asset: string;
  /** Network identifier (e.g. "eth", "base"). */
  network: string;
  /** Deposit amount. */
  amount: number;
  /** User's receiving address (optional, inferred if missing). */
  receivingAddress?: string;
  /** Optional: memo/destination tag for exchanges requiring it. */
  memo?: string;
}

/** Result of a deposit operation. */
export interface DepositResult {
  /** Unique deposit tracking identifier. */
  depositId: string;
  /** Current status. */
  status: DepositStatus;
  /** Exchange identifier. */
  exchangeId: string;
  /** Asset symbol. */
  asset: string;
  /** Network identifier. */
  network: string;
  /** Deposit amount. */
  amount: number;
  /** Generated deposit URL (if applicable). */
  depositUrl?: string;
  /** Transaction hash (once confirmed). */
  txHash?: string;
  /** Error message (if status is FAILED). */
  error?: string;
  /** Timestamp of status creation (ISO 8601). */
  createdAt: string;
  /** Timestamp of last status update (ISO 8601). */
  updatedAt: string;
}

/** Parameters for tracking a deposit. */
export interface TrackDepositParams {
  /** Deposit tracking ID. */
  depositId: string;
  /** Exchange identifier. */
  exchangeId?: string;
}
