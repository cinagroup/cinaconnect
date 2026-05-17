/**
 * Connector interface — abstract base for all wallet connection methods.
 */

import type { ConnectParams, ConnectionResult, EventHandler, TransactionRequest } from './types.js';
import { EventEmitter } from './events.js';
import { generateDeepLink, smartRedirect, detectPlatform } from './links/index.js';
import type { DeepLinkParams, RedirectResult, Platform } from './links/index.js';

/**
 * Handles platform detection and redirect logic for deep links.
 * Can be overridden for React Native or custom environments.
 */
export class RedirectHandler {
  /** Detected platform. */
  platform: Platform;

  constructor(platform?: Platform) {
    this.platform = platform ?? detectPlatform();
  }

  /**
   * Open a deep link for the given wallet.
   *
   * Uses the smart redirect strategy: deep link → timeout → universal link → QR code.
   *
   * @param walletId - Wallet identifier (e.g., 'metamask', 'rainbow').
   * @param uri - URI to pass to the wallet (e.g., WalletConnect URI).
   * @param params - Additional deep link parameters.
   * @returns Promise resolving with the redirect result.
   */
  async openDeepLink(
    walletId: string,
    uri: string,
    params?: Partial<DeepLinkParams>,
  ): Promise<RedirectResult> {
    const deepLinkParams: DeepLinkParams = {
      walletId,
      uri,
      ...params,
    };

    return smartRedirect(deepLinkParams, {
      platform: this.platform,
      timeoutMs: params?.fallbackTimeoutMs,
    });
  }

  /**
   * Generate a deep link URL without navigating.
   *
   * @param walletId - Wallet identifier.
   * @param uri - URI to pass to the wallet.
   * @param queryParams - Additional query parameters.
   * @returns The deep link URL string.
   */
  generateLink(walletId: string, uri: string, queryParams?: Record<string, string>): string {
    return generateDeepLink({
      walletId,
      uri,
      params: queryParams,
    });
  }

  /**
   * Set the platform for redirect handling.
   *
   * @param platform - Target platform.
   */
  setPlatform(platform: Platform): void {
    this.platform = platform;
  }
}

/**
 * Connector abstract base class.
 *
 * Each wallet connection method (injected, QR, relay/WC) implements
 * this interface to provide a uniform API.
 */
export abstract class Connector extends EventEmitter {
  /** Unique connector identifier. */
  abstract readonly id: string;

  /** Human-readable connector name (for UI display). */
  abstract readonly name: string;

  /** Icon URL or data URI for the connector. */
  abstract readonly icon: string;

  /** Whether this connector is available (e.g., wallet extension installed). */
  abstract readonly installed: boolean;

  /** Connection type: 'injected' | 'qr' | 'relay' | 'walletconnect' */
  abstract readonly type: string;

  /** Optional redirect handler for deep link support. */
  redirectHandler?: RedirectHandler;

  /**
   * Connect to a wallet.
   * @param params - Optional connection parameters.
   * @returns Connection result with accounts, chain ID, and session ID.
   */
  abstract connect(params?: ConnectParams): Promise<ConnectionResult>;

  /**
   * Disconnect from the wallet.
   */
  abstract disconnect(): Promise<void>;

  /**
   * Get the currently connected account addresses.
   * @returns Array of account addresses.
   */
  abstract getAccounts(): Promise<string[]>;

  /**
   * Get the current chain ID.
   * @returns Numeric chain ID.
   */
  abstract getChainId(): Promise<number>;

  /**
   * Switch to a different chain.
   * @param chainId - Target chain ID.
   */
  abstract switchChain(chainId: number): Promise<void>;

  /**
   * Sign a message with the connected account.
   * @param message - Message to sign.
   * @returns Signature as a hex string.
   */
  abstract signMessage(message: string): Promise<string>;

  /**
   * Sign a transaction.
   * @param tx - Transaction request.
   * @returns Signed transaction as a hex string.
   */
  abstract signTransaction(tx: TransactionRequest): Promise<string>;

  /**
   * Get the raw underlying provider for advanced usage.
   * Returns null if the connector doesn't expose a raw provider.
   */
  getProvider(): unknown {
    return null;
  }

  /**
   * Open a deep link to the wallet app.
   *
   * Generates a deep link URL and uses the redirect handler to navigate,
   * with automatic fallback to universal links and QR codes.
   *
   * @param walletId - Wallet identifier (e.g., 'metamask', 'rainbow').
   * @param uri - URI to pass to the wallet (e.g., WalletConnect URI).
   * @param params - Additional parameters for the deep link.
   * @returns Promise resolving with the redirect result.
   */
  async openDeepLink(
    walletId: string,
    uri: string,
    params?: Partial<DeepLinkParams>,
  ): Promise<RedirectResult> {
    const handler = this.redirectHandler ?? new RedirectHandler();
    return handler.openDeepLink(walletId, uri, params);
  }

  /**
   * Generate a deep link URL without triggering navigation.
   *
   * @param walletId - Wallet identifier.
   * @param uri - URI to pass to the wallet.
   * @param queryParams - Additional query parameters.
   * @returns The deep link URL string.
   */
  generateDeepLink(walletId: string, uri: string, queryParams?: Record<string, string>): string {
    return generateDeepLink({
      walletId,
      uri,
      params: queryParams,
    });
  }

  /**
   * Set the redirect handler for this connector.
   *
   * @param handler - RedirectHandler instance, or undefined to reset.
   */
  setRedirectHandler(handler?: RedirectHandler): void {
    this.redirectHandler = handler;
  }
}
