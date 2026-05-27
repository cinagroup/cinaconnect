/**
 * NEAR Chain Adapter — provides NEAR-specific wallet connection and transaction operations.
 *
 * Supports NEAR Wallet, Here Wallet, and Meteor Wallet.
 * Implements the ChainAdapter interface from @cinacoin/core-sdk.
 */

import type { ChainAdapter } from '@cinacoin/core-sdk';
import type { Connector } from '@cinacoin/core-sdk';
import type { Chain } from '@cinacoin/core-sdk';
import type { NearWalletConnector } from './types.js';
import { NEAR_CHAINS, NEAR_WALLETS, type NearTransaction, type NearFunctionCall, type NearTransferAction } from './types.js';
import { NearWalletConnector as NearWalletConn } from './connectors/near-wallet.js';
import { HereWalletConnector } from './connectors/here-wallet.js';

/* ------------------------------------------------------------------ */
/*  Minimal NEAR RPC types                                             */
/* ------------------------------------------------------------------ */

interface NearRpcBalance {
  result?: { amount: string };
  error?: { message: string };
}

/* ------------------------------------------------------------------
 *  Meteor Wallet Connector (lightweight, inline)
 * ------------------------------------------------------------------ */

interface MeteorWalletProvider {
  id: string;
  isConnected: boolean;
  account: { accountId: string } | null;
  connect(): Promise<{ accountId: string }>;
  disconnect(): Promise<void>;
  signAndSendTransaction(params: {
    receiverId: string;
    actions: { type: string; params: Record<string, unknown> }[];
  }): Promise<{ transactionHash: string }>;
  sendMoney(params: { receiverId: string; amount: string }): Promise<{ transactionHash: string }>;
  signMessage(params: { message: string; recipient: string }): Promise<{ signature: string }>;
}

declare global {
  interface Window {
    meteorWallet?: MeteorWalletProvider;
  }
}

/**
 * Meteor Wallet connector for NEAR.
 * A lightweight, extension-based NEAR wallet.
 */
class MeteorWalletConnector implements NearWalletConnector {
  readonly id = 'meteor-wallet';
  readonly name = 'Meteor Wallet';

  private provider: MeteorWalletProvider | null = null;
  private accountId: string | null = null;

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!window.meteorWallet;
  }

  async connect(): Promise<string> {
    const provider = this._getProvider();
    if (!provider) {
      throw new Error('Meteor Wallet is not available. Visit https://wallet.meteorwallet.app');
    }

    const account = await provider.connect();
    this.provider = provider;
    this.accountId = account.accountId;
    return account.accountId;
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch {
        // Already disconnected
      }
      this.provider = null;
      this.accountId = null;
    }
  }

  getAccountId(): string | null {
    return this.accountId;
  }

  async signTransaction(tx: NearTransaction): Promise<string> {
    if (!this.provider) throw new Error('Meteor Wallet not connected');
    const actions = Array.isArray(tx.actions) ? tx.actions : [tx.actions];
    const result = await this._sendActions(actions);
    return result.transactionHash;
  }

  async sendTransaction(tx: NearTransaction): Promise<{ transactionHash: string; blockHash?: string }> {
    if (!this.provider) throw new Error('Meteor Wallet not connected');
    const actions = Array.isArray(tx.actions) ? tx.actions : [tx.actions];
    return this._sendActions(actions);
  }

  async signMessage(message: string, recipient?: string): Promise<string> {
    if (!this.provider) throw new Error('Meteor Wallet not connected');
    const recipientDomain = recipient ?? (typeof window !== 'undefined' ? window.location.host : '');
    const result = await this.provider.signMessage({ message, recipient: recipientDomain });
    return result.signature;
  }

  getProvider(): MeteorWalletProvider | null {
    return this.provider;
  }

  private _getProvider(): MeteorWalletProvider | null {
    if (this.provider) return this.provider;
    if (typeof window === 'undefined') return null;
    return window.meteorWallet ?? null;
  }

  private _isTransfer(action: NearFunctionCall | NearTransferAction): action is NearTransferAction {
    return 'receiverId' in action && 'amount' in action;
  }

  private async _sendActions(
    actions: (NearFunctionCall | NearTransferAction)[],
  ): Promise<{ transactionHash: string; blockHash?: string }> {
    if (!this.provider) throw new Error('Meteor Wallet not connected');

    if (actions.length === 1 && this._isTransfer(actions[0])) {
      const transfer = actions[0] as { receiverId: string; amount: string };
      return this.provider.sendMoney({ receiverId: transfer.receiverId, amount: transfer.amount });
    }

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

    const receiverId = this._isTransfer(actions[0])
      ? (actions[0] as NearTransferAction).receiverId
      : (actions[0] as NearFunctionCall).contractId;

    return this.provider.signAndSendTransaction({ receiverId, actions: nearActions });
  }
}

/* ------------------------------------------------------------------ */
/*  NearChainAdapter                                                   */
/* ------------------------------------------------------------------ */

/**
 * NEAR chain adapter implementing ChainAdapter from @cinacoin/core-sdk.
 *
 * Provides a unified interface for NEAR wallet operations:
 * - Wallet connection (NEAR Wallet, Here Wallet, Meteor Wallet)
 * - Transaction signing and sending
 * - NEAR token transfers
 * - NEAR account system support
 */
export class NearChainAdapter implements ChainAdapter {
  readonly id = 'near';
  readonly name = 'NEAR Adapter';

  private chains: Chain[] = [...NEAR_CHAINS];
  private activeConnector: NearWalletConnector | null = null;
  private connectorInstance: Connector | null = null;
  private rpcUrl: string = NEAR_CHAINS[0].rpcUrl;

  // Wallet connector instances (lazy-created)
  private _nearWallet: NearWalletConn | null = null;
  private _hereWallet: HereWalletConnector | null = null;
  private _meteorWallet: MeteorWalletConnector | null = null;

  /* ---- Configuration ---- */

  /** Register supported NEAR chains. */
  registerChains(chains: Chain[]): void {
    this.chains = chains;
  }

  /** Set the connector from the core SDK. */
  setConnector(connector: Connector): void {
    this.connectorInstance = connector;
  }

  /** Set a custom RPC URL. */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
  }

  /** Set a client for advanced use cases. */
  setClient(_client: unknown): void {
    // NEAR client configuration is handled via RPC URL
  }

  /** Get the active wallet connector. */
  getActiveConnector(): NearWalletConnector | null {
    return this.activeConnector;
  }

  /** Get the currently connected account id. */
  getAccountId(): string | null {
    return this.activeConnector?.getAccountId() ?? null;
  }

  /* ---- Connection ---- */

  /**
   * Connect to a NEAR wallet.
   * @param walletId - Wallet id ('near-wallet', 'here-wallet', or 'meteor-wallet').
   *                   Auto-detects if omitted.
   * @returns The connected NEAR account id (e.g. "alice.near").
   */
  async connect(walletId?: string): Promise<string> {
    const connector = this._resolveConnector(walletId);
    if (!connector) {
      throw new Error(
        'No NEAR wallet found. Install NEAR Wallet (https://wallet.near.org), ' +
        'Here Wallet (https://www.herewallet.app), or Meteor Wallet (https://wallet.meteorwallet.app)',
      );
    }

    const accountId = await connector.connect();
    this.activeConnector = connector;
    return accountId;
  }

  /** Disconnect from the current wallet. */
  async disconnect(): Promise<void> {
    if (this.activeConnector) {
      await this.activeConnector.disconnect();
      this.activeConnector = null;
    }
  }

  /* ---- ChainAdapter Interface ---- */

  /** Get connected account addresses. */
  async getAccounts(): Promise<string[]> {
    const accountId = this.activeConnector?.getAccountId();
    return accountId ? [accountId] : [];
  }

  /**
   * Get native balance for a NEAR account.
   * @param accountId - NEAR account id (e.g. "alice.near").
   * @returns Balance in NEAR (as a decimal string, e.g. "12.345").
   */
  async getBalance(accountId: string): Promise<string> {
    if (!this._isValidAccountId(accountId)) {
      throw new Error(`Invalid NEAR account id: ${accountId}`);
    }

    // Try connector's balance method first
    if (this.activeConnector) {
      const provider = this.activeConnector as unknown as { getProvider(): { getBalance?: (id?: string) => Promise<{ total: string }> } | null };
      const p = provider.getProvider?.();
      if (p?.getBalance) {
        const balance = await p.getBalance(accountId);
        return this._yoctoToNear(balance.total);
      }
    }

    // Fallback: JSON-RPC
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'query',
        params: {
          request_type: 'view_account',
          finality: 'final',
          account_id: accountId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`NEAR RPC error ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json()) as NearRpcBalance;
    if (data.error) throw new Error(data.error.message);
    if (!data.result) throw new Error('No balance result');

    return this._yoctoToNear(data.result.amount);
  }

  /**
   * Sign a NEAR transaction.
   * @param tx - Transaction as NearTransaction or raw format.
   * @returns Transaction hash (not broadcast).
   */
  async signTransaction(tx: unknown): Promise<string> {
    if (!this.activeConnector) {
      throw new Error('No wallet connected. Call connect() first.');
    }

    const nearTx = this._toNearTransaction(tx);
    return this.activeConnector.signTransaction(nearTx);
  }

  /**
   * Send a NEAR transaction (sign + broadcast).
   * @param tx - Transaction as NearTransaction or raw format.
   * @returns Transaction hash.
   */
  async sendTransaction(tx: unknown): Promise<string> {
    if (!this.activeConnector) {
      throw new Error('No wallet connected. Call connect() first.');
    }

    const nearTx = this._toNearTransaction(tx);
    const result = await this.activeConnector.sendTransaction(nearTx);
    return result.transactionHash;
  }

  /**
   * Send a NEAR token transfer.
   * @param receiverId - Recipient NEAR account id.
   * @param amount - Amount in yoctoNEAR (string to handle large numbers).
   * @returns Transaction hash.
   */
  async sendTransfer(receiverId: string, amount: string): Promise<string> {
    if (!this.activeConnector) {
      throw new Error('No wallet connected. Call connect() first.');
    }

    const tx: NearTransaction = {
      actions: { receiverId, amount },
    };

    const result = await this.activeConnector.sendTransaction(tx);
    return result.transactionHash;
  }

  /**
   * Sign a message with the connected wallet.
   * @param message - Message to sign.
   * @returns Signature as a string.
   */
  async signMessage(message: string): Promise<string> {
    if (!this.activeConnector) {
      throw new Error('No wallet connected. Call connect() first.');
    }

    return this.activeConnector.signMessage(message);
  }

  /**
   * NEAR does not have chain switching like EVM — it uses separate networks.
   * This method switches the RPC URL to match the target chain.
   * @param _chainId - Chain ID (mapped to chain).
   */
  async switchChain(_chainId: number): Promise<void> {
    // NEAR uses network switching rather than chain ID switching
    // The wallet handles network selection internally
  }

  /* ---- Utility ---- */

  /** Find a NEAR chain by its ID. */
  findChain(chainId: number): Chain | undefined {
    return this.chains.find((c) => {
      const ref = c.id.split(':')[1];
      return parseInt(ref, 10) === chainId || c.id.includes(String(chainId));
    });
  }

  /** Get supported NEAR wallets with availability status. */
  getSupportedWallets() {
    return NEAR_WALLETS.map((w) => ({
      ...w,
      available: this._getConnector(w.id)?.isAvailable() ?? false,
    }));
  }

  /** Validate a NEAR account id. */
  static isValidAccountId(accountId: string): boolean {
    // NEAR account ids: 2-64 chars, lowercase alphanumeric + hyphens, ends with .near or .testnet
    if (accountId.length < 2 || accountId.length > 64) return false;
    return /^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)*$/.test(accountId);
  }

  /* ---- Private helpers ---- */

  private _resolveConnector(walletId?: string): NearWalletConnector | null {
    if (walletId) {
      return this._getConnector(walletId);
    }

    // Auto-detect: NEAR Wallet → Here Wallet → Meteor Wallet
    const nearWallet = this._getConnector('near-wallet');
    if (nearWallet?.isAvailable()) return nearWallet;

    const hereWallet = this._getConnector('here-wallet');
    if (hereWallet?.isAvailable()) return hereWallet;

    const meteorWallet = this._getConnector('meteor-wallet');
    if (meteorWallet?.isAvailable()) return meteorWallet;

    return null;
  }

  private _getConnector(walletId: string): NearWalletConnector | null {
    switch (walletId) {
      case 'near-wallet':
        if (!this._nearWallet) this._nearWallet = new NearWalletConn();
        return this._nearWallet.isAvailable() ? this._nearWallet : null;
      case 'here-wallet':
        if (!this._hereWallet) this._hereWallet = new HereWalletConnector();
        return this._hereWallet.isAvailable() ? this._hereWallet : null;
      case 'meteor-wallet':
        if (!this._meteorWallet) this._meteorWallet = new MeteorWalletConnector();
        return this._meteorWallet.isAvailable() ? this._meteorWallet : null;
      default:
        return null;
    }
  }

  private _toNearTransaction(tx: unknown): NearTransaction {
    if (typeof tx === 'object' && tx !== null && 'actions' in tx) {
      return tx as NearTransaction;
    }

    // Support simplified format: { receiverId, amount } for transfers
    if (typeof tx === 'object' && tx !== null && 'receiverId' in tx && 'amount' in tx) {
      const obj = tx as { receiverId: string; amount: string };
      return { actions: { receiverId: obj.receiverId, amount: obj.amount } };
    }

    // Support simplified format: { contractId, methodName, args } for function calls
    if (typeof tx === 'object' && tx !== null && 'contractId' in tx && 'methodName' in tx) {
      const obj = tx as { contractId: string; methodName: string; args?: string; deposit?: string; gas?: string };
      return {
        actions: {
          contractId: obj.contractId,
          methodName: obj.methodName,
          args: obj.args ?? '{}',
          deposit: obj.deposit ?? '0',
          gas: obj.gas,
        },
      };
    }

    throw new Error('Invalid transaction format');
  }

  private _isValidAccountId(accountId: string): boolean {
    return NearChainAdapter.isValidAccountId(accountId);
  }

  /** Convert yoctoNEAR to NEAR (24 decimals). */
  private _yoctoToNear(yocto: string): string {
    // Handle big numbers via string manipulation
    const padded = yocto.padStart(25, '0');
    const integerPart = padded.slice(0, padded.length - 24);
    const fractionalPart = padded.slice(padded.length - 24);

    // Remove trailing zeros from fractional part
    const trimmedFraction = fractionalPart.replace(/0+$/, '');

    if (trimmedFraction.length === 0) {
      return integerPart || '0';
    }

    return `${integerPart}.${trimmedFraction}`;
  }
}
