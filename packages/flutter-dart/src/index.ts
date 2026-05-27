/**
 * @cinacoin/flutter-dart
 *
 * TypeScript barrel exports for Flutter/Dart SDK interop.
 * Provides type definitions for the Dart-based Cinacoin Flutter SDK.
 */

// Deep Link types
export interface WalletSchemeConfig {
  scheme: string;
  host?: string;
  path?: string;
}

export interface ParsedDeepLink {
  scheme: string;
  action: 'connect' | 'transaction' | 'sign' | 'disconnect';
  params: Record<string, string>;
}

export interface DeepLinkResult {
  success: boolean;
  walletName?: string;
  error?: string;
}

// Link Mode types
export interface LinkConnectResult {
  success: boolean;
  address?: string;
  chainId?: number;
  error?: string;
}

// Chain types
export interface FlutterChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  explorerUrl?: string;
  iconUrl?: string;
}

// Wallet types
export interface FlutterWalletInfo {
  id: string;
  name: string;
  logoUrl: string;
  deeplink?: string;
  universalLink?: string;
  supportedChains: number[];
}

// Session types
export interface FlutterSessionInfo {
  address: string;
  chainId: number;
  connectedAt: number;
  walletName: string;
}

// Transaction types
export interface FlutterTransactionParams {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
}

export interface FlutterTransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
}

// SIWE types
export interface FlutterSiweMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}
