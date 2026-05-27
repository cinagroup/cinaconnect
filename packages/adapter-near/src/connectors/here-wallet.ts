/**
 * Here Wallet Connector.
 *
 * Interfaces with Here Wallet (herewallet.app) — a mobile-first NEAR wallet
 * with MPC-based key management.
 */

import type { NearFunctionCall, NearTransaction, NearTransactionResult, NearWalletConnector } from '../types.js';

/** Minimal Here Wallet provider declarations. */
interface HereWalletProvider {
  /** Wallet id. */
  id: string;
  /** Whether currently connected. */
  isConnected: boolean;
  /** Connected account id. */
  accountId: string | null;

  /** Sign in / connect. */
  connect(): Promise<HereWalletAccount>;
  /** Sign out / disconnect. */
  disconnect(): Promise<void>;
  /** Send tokens. */
  sendMoney(params: { receiverId: string; amount: string }): Promise<NearTransactionResult>;
  /** Call a contract function. */
  signAndSendTransaction(params: {
    receiverId: string;
    actions: { type: string; params: Record<string, unknown> }[];
  }): Promise<NearTransactionResult>;
  /** Sign a message. */
  signMessage(params: { message: string; recipient: string }): Promise<{ signature: string }>;
  /** Get balance. */
  getBalance(accountId?: string): Promise<{ total: string; available: string }>;
  /** Generic request method. */
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;
  /** Event listeners. */
  on(event: 'signIn' | 'signOut', handler: (...args: unknown[]) => void): void;
  off(event: 'signIn' | 'signOut', handler: (...args: unknown[]) => void): void;
}

interface HereWalletAccount {
  accountId: string;
  publicKey: string;
}

declare global {
  interface Window {
    hereWallet?: HereWalletProvider;
  }
}

/**
 * Here Wallet connector for NEAR.
 *
 * Provides a standardized interface over Here Wallet (herewallet.app),
 * a mobile-first NEAR wallet that supports both mobile and browser
 * environments via MPC key management.
 */
export class HereWalletConnector implements NearWalletConnector {
  readonly id = 'here-wallet';
  readonly name = 'Here Wallet';

  private provider: HereWalletProvider | null = null;
  private accountId: string | null = null;

  /**
   * Check if Here Wallet is available.
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!window.hereWallet;
  }

  /**
   * Connect to Here Wallet.
   * On mobile, opens the Here Wallet app.
   * On browser, connects via the Here Wallet web interface.
   * @returns The connected NEAR account id.
   */
  async connect(): Promise<string> {
    const provider = this._getProvider();
    if (!provider) {
      throw new Error('Here Wallet is not available. Visit https://www.herewallet.app');
    }

    const account = await provider.connect();
    this.provider = provider;
    this.accountId = account.accountId;

    return account.accountId;
  }

  /**
   * Disconnect from Here Wallet.
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch (err) { console.warn('[here] Operation failed:', err instanceof Error ? err.message : String(err));
        // May already be disconnected
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
   * @returns Transaction hash.
   */
  async signTransaction(tx: NearTransaction): Promise<string> {
    if (!this.provider) throw new Error('Here Wallet not connected');

    const actions = Array.isArray(tx.actions) ? tx.actions : [tx.actions];
    const result = await this._sendActions(actions);
    return result.transactionHash;
  }

  /**
   * Send a NEAR transaction (sign + broadcast).
   * @param tx - NEAR transaction.
   * @returns Transaction result with hash.
   */
  async sendTransaction(tx: NearTransaction): Promise<NearTransactionResult> {
    if (!this.provider) throw new Error('Here Wallet not connected');

    const actions = Array.isArray(tx.actions) ? tx.actions : [tx.actions];
    return this._sendActions(actions);
  }

  /**
   * Sign a message using the connected account.
   * @param message - Message to sign.
   * @param recipient - Optional recipient domain.
   * @returns Signature as a string.
   */
  async signMessage(message: string, recipient?: string): Promise<string> {
    if (!this.provider) throw new Error('Here Wallet not connected');

    const recipientDomain = recipient ?? (typeof window !== 'undefined' ? window.location.host : '');

    const result = await this.provider.signMessage({
      message,
      recipient: recipientDomain,
    });

    return result.signature;
  }

  /** Get the underlying provider for advanced use cases. */
  getProvider(): HereWalletProvider | null {
    return this.provider;
  }

  /* ---- Private helpers ---- */

  private _getProvider(): HereWalletProvider | null {
    if (this.provider) return this.provider;
    if (typeof window === 'undefined') return null;
    return window.hereWallet ?? null;
  }

  private async _sendActions(
    actions: (NearFunctionCall | NearTransferAction)[],
  ): Promise<NearTransactionResult> {
    if (!this.provider) throw new Error('Here Wallet not connected');
    if (!this.accountId) throw new Error('No account connected');

    // Single transfer: use sendMoney
    if (actions.length === 1 && this._isTransfer(actions[0])) {
      const transfer = actions[0] as { receiverId: string; amount: string };
      return this.provider.sendMoney({ receiverId: transfer.receiverId, amount: transfer.amount });
    }

    // Multiple actions: use signAndSendTransaction
    const nearActions = actions.map((a) => {
      if (this._isTransfer(a)) {
        return {
          type: 'Transfer',
          params: { deposit: (a as { amount: string }).amount },
        };
      }
      const fc = a as NearFunctionCall;
      return {
        type: 'FunctionCall',
        params: {
          contractId: fc.contractId,
          methodName: fc.methodName,
          args: fc.args ? JSON.parse(fc.args) : {},
          gas: fc.gas ?? '30000000000000',
          deposit: fc.deposit,
        },
      };
    });

    return this.provider.signAndSendTransaction({
      receiverId: this._getReceiverId(actions),
      actions: nearActions,
    });
  }

  private _isTransfer(action: NearFunctionCall | NearTransferAction): action is NearTransferAction {
    return 'receiverId' in action && 'amount' in action;
  }

  private _getReceiverId(actions: (NearFunctionCall | NearTransferAction)[]): string {
    for (const a of actions) {
      if (this._isTransfer(a)) return a.receiverId;
    }
    // Default to the first function call's contract
    return (actions[0] as NearFunctionCall).contractId;
  }
}
