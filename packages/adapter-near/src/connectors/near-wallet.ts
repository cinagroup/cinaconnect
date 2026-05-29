/**
 * NEAR Official Wallet Connector.
 *
 * Interfaces with the official NEAR Wallet (wallet.near.org) via the
 * NEAR Wallet Selector or direct browser redirect flow.
 */

import type { NearFunctionCall, NearTransaction, NearTransactionResult, NearWalletConnector } from '../types.js';

/** Minimal NEAR Wallet provider declarations. */
interface NearWalletProvider {
  /** Wallet id. */
  id: string;
  /** Whether currently connected. */
  isConnected: boolean;
  /** Connected account id. */
  account: NearAccount | null;

  /** Sign in / connect. */
  signIn(params: { contractId?: string; methodNames?: string[] }): Promise<unknown>;
  /** Sign out / disconnect. */
  signOut(): Promise<void>;
  /** Get the connected account. */
  account(): NearAccount | Promise<NearAccount>;
  /** Check connection state. */
  isSignedIn(): boolean;
  /** Get account ids. */
  getAccounts(): Promise<{ accountId: string; publicKey: string }[]>;
}

interface NearAccount {
  /** Account id (e.g. "alice.near"). */
  accountId: string;
  /** Get balance. */
  getAccountBalance(): Promise<{ total: string; available: string }>;
  /** Send tokens. */
  sendMoney(params: { receiverId: string; amount: string }): Promise<NearTransactionResult>;
  /** Call a contract function. */
  functionCall(params: {
    contractId: string;
    methodName: string;
    args: Record<string, unknown> | Uint8Array;
    gas?: string;
    amount?: string;
  }): Promise<NearTransactionResult>;
}

/** NEAR Wallet Selector compatible provider. */
interface WalletSelectorProvider {
  wallet: NearWalletProvider;
}

declare global {
  interface Window {
    near?: NearWalletProvider;
    nearWalletSelector?: WalletSelectorProvider;
  }
}

/**
 * NEAR official wallet connector.
 *
 * Connects to wallet.near.org using the browser redirect flow or
 * Wallet Selector integration.
 */
export class NearWalletConnector implements NearWalletConnector {
  readonly id = 'near-wallet';
  readonly name = 'NEAR Wallet';

  private provider: NearWalletProvider | null = null;
  private accountId: string | null = null;

  /**
   * Check if the NEAR Wallet Selector is available.
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!window.near || !!window.nearWalletSelector;
  }

  /**
   * Connect to NEAR Wallet.
   * Opens wallet.near.org for approval in browser redirect flow,
   * or uses the Wallet Selector if available.
   * @returns The connected NEAR account id (e.g. "alice.near").
   */
  async connect(): Promise<string> {
    const provider = this._getProvider();
    if (!provider) {
      throw new Error(
        'NEAR Wallet Selector not found. Install @near-wallet-selector/core or visit https://wallet.near.org',
      );
    }

    const accounts = await provider.signIn({});
    const accountList = await provider.getAccounts();

    if (!accountList || accountList.length === 0) {
      throw new Error('No accounts returned from NEAR Wallet');
    }

    this.provider = provider;
    this.accountId = accountList[0].accountId;
    return this.accountId;
  }

  /**
   * Disconnect from NEAR Wallet.
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.signOut();
      } catch (err) { console.warn('[near] Operation failed:', err instanceof Error ? err.message : String(err));
        // May already be signed out
      }
      this.provider = null;
      this.accountId = null;
    }
  }

  /**
   * Get the connected account id.
   */
  getAccountId(): string | null {
    return this.accountId;
  }

  /**
   * Sign a NEAR transaction.
   * @param tx - NEAR transaction with function calls or transfer actions.
   * @returns Transaction hash (hex string).
   */
  async signTransaction(tx: NearTransaction): Promise<string> {
    if (!this.provider) throw new Error('NEAR Wallet not connected');

    const account = await this.provider.account();
    const actions = Array.isArray(tx.actions) ? tx.actions : [tx.actions];

    // Execute each action; the wallet handles signing
    let lastResult: NearTransactionResult | null = null;

    for (const action of actions) {
      lastResult = await this._executeAction(account, action);
    }

    if (!lastResult) {
      throw new Error('No transaction result returned');
    }

    return lastResult.transactionHash;
  }

  /**
   * Send a NEAR transaction (sign + broadcast).
   * @param tx - NEAR transaction.
   * @returns Transaction result with hash.
   */
  async sendTransaction(tx: NearTransaction): Promise<NearTransactionResult> {
    if (!this.provider) throw new Error('NEAR Wallet not connected');

    const account = await this.provider.account();
    const actions = Array.isArray(tx.actions) ? tx.actions : [tx.actions];

    // For single transfer, use direct sendMoney
    if (actions.length === 1 && this._isTransfer(actions[0])) {
      const transfer = actions[0] as { receiverId: string; amount: string };
      return account.sendMoney({ receiverId: transfer.receiverId, amount: transfer.amount });
    }

    // For function calls, execute each
    let lastResult: NearTransactionResult | null = null;
    for (const action of actions) {
      lastResult = await this._executeAction(account, action);
    }

    if (!lastResult) {
      throw new Error('No transaction result returned');
    }

    return lastResult;
  }

  /**
   * Sign a message using the connected account.
   * @param message - Message to sign.
   * @param recipient - Optional recipient domain for security.
   * @returns Signature as a base64 string.
   */
  async signMessage(message: string, recipient?: string): Promise<string> {
    if (!this.provider) throw new Error('NEAR Wallet not connected');

    // NEAR Wallet uses a specific message signing protocol
    // Generate a cryptographically secure random nonce
    const nonceBytes = new Uint8Array(16);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(nonceBytes);
    } else {
      throw new Error('Cryptographically secure random number generation is not available in this environment');
    }
    const nonce = Buffer.from(nonceBytes);
    const recipientDomain = recipient ?? window.location.host;

    // Construct NEAR message signing payload
    const payload = {
      message,
      nonce,
      recipient: recipientDomain,
    };

    // The wallet selector handles message signing via wallet.request
    if (this.provider && 'request' in this.provider) {
      const result = await (this.provider as Record<string, unknown>).request?.({
        method: 'signMessage',
        params: payload,
      }) as { signature: string };
      return result?.signature ?? '';
    }

    // Fallback: throw as NEAR Wallet may not support direct message signing
    throw new Error(
      'Message signing not directly supported by NEAR Wallet browser flow. ' +
      'Use a wallet selector with signMessage capability.',
    );
  }

  /** Get the underlying provider for advanced use cases. */
  getProvider(): NearWalletProvider | null {
    return this.provider;
  }

  /* ---- Private helpers ---- */

  private _getProvider(): NearWalletProvider | null {
    if (this.provider) return this.provider;
    if (typeof window === 'undefined') return null;

    // Try Wallet Selector first
    if (window.nearWalletSelector?.wallet) {
      return window.nearWalletSelector.wallet;
    }

    // Fallback to direct near provider
    return window.near ?? null;
  }

  private _isTransfer(action: NearFunctionCall | NearTransferAction): action is NearTransferAction {
    return 'receiverId' in action && 'amount' in action;
  }

  private async _executeAction(
    account: NearAccount,
    action: NearFunctionCall | NearTransferAction,
  ): Promise<NearTransactionResult> {
    if (this._isTransfer(action)) {
      return account.sendMoney({ receiverId: action.receiverId, amount: action.amount });
    }

    return account.functionCall({
      contractId: action.contractId,
      methodName: action.methodName,
      args: action.args ? JSON.parse(action.args) : {},
      gas: action.gas,
      amount: action.deposit,
    });
  }
}
