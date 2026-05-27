/**
 * Starknet-specific types for the @cinacoin/adapter-starknet package.
 */

import type { Chain } from '@cinacoin/core-sdk';

/* ------------------------------------------------------------------ */
/*  Starknet chain presets                                             */
/* ------------------------------------------------------------------ */

/** Well-known Starknet chain presets. */
export const STARKNET_CHAINS: Chain[] = [
  {
    id: 'starknet:mainnet',
    name: 'Starknet Mainnet',
    rpcUrl: 'https://starknet-mainnet.public.blastapi.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://starkscan.co',
    iconUrl: 'https://starknet.io/favicon.ico',
  },
  {
    id: 'starknet:sepolia',
    name: 'Starknet Sepolia',
    rpcUrl: 'https://starknet-sepolia.public.blastapi.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://sepolia.starkscan.co',
    iconUrl: 'https://starknet.io/favicon.ico',
  },
];

/* ------------------------------------------------------------------ */
/*  Wallet info                                                        */
/* ------------------------------------------------------------------ */

/** Metadata for a supported Starknet wallet. */
export interface StarknetWalletInfo {
  /** Internal wallet id. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** EIP-6963 RDNS identifier. */
  rdns: string;
  /** Wallet icon URL. */
  icon: string;
  /** URL to install the wallet. */
  downloadUrl: string;
}

/** Supported Starknet wallets. */
export const STARKNET_WALLETS: StarknetWalletInfo[] = [
  {
    id: 'argent-x',
    name: 'Argent X',
    rdns: 'im.argent.contract',
    icon: 'https://www.argent.xyz/favicon.ico',
    downloadUrl: 'https://www.argent.xyz/argent-x/',
  },
  {
    id: 'braavos',
    name: 'Braavos',
    rdns: 'app.braavos.wallet',
    icon: 'https://braavos.app/favicon.ico',
    downloadUrl: 'https://braavos.app/',
  },
];

/* ------------------------------------------------------------------ */
/*  Starknet request / call types                                      */
/* ------------------------------------------------------------------ */

/** Raw Starknet invoke/call transaction. */
export interface StarknetCall {
  /** Contract address. */
  contractAddress: string;
  /** Entrypoint method name. */
  entrypoint: string;
  /** Calldata as decimal strings. */
  calldata: string[];
}

/** Transaction to be executed. */
export interface StarknetTransaction {
  /** Single call or array of calls (multicall). */
  calls: StarknetCall | StarknetCall[];
  /** Optional details (maxFee, nonce, version). */
  details?: {
    maxFee?: string;
    nonce?: string;
    version?: string;
  };
}

/** Result of a signed transaction. */
export interface StarknetTransactionResult {
  /** Transaction hash. */
  transactionHash: string;
}

/** Starknet wallet connector interface. */
export interface StarknetWalletConnector {
  /** Unique connector id (matches wallet id). */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;

  /** Check if the wallet is installed. */
  isInstalled(): boolean;

  /** Connect to the wallet and get the connected account address. */
  connect(): Promise<string>;

  /** Disconnect from the wallet. */
  disconnect(): Promise<void>;

  /** Get the connected account address. */
  getAccount(): string | null;

  /** Sign a Starknet transaction. */
  signTransaction(calls: StarknetCall[]): Promise<unknown>;

  /** Execute a Starknet transaction. */
  executeTransaction(calls: StarknetCall[], details?: Record<string, unknown>): Promise<StarknetTransactionResult>;

  /** Sign a message. */
  signMessage(message: string | unknown): Promise<string>;
}

/** Starknet-specific connect parameters. */
export interface StarknetConnectParams {
  /** Wallet id to connect to ('argent-x' | 'braavos'). */
  walletId?: string;
  /** Preferred RPC URL. */
  rpcUrl?: string;
}
