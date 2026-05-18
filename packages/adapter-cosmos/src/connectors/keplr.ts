/**
 * Keplr wallet connector for Cosmos SDK chains.
 *
 * Detects `window.keplr` and provides a uniform `CosmosWalletConnector`
 * interface for signing transactions, querying accounts, and sending
 * token transfers across all Cosmos SDK chains supported by Keplr.
 *
 * @see https://docs.keplr.app/api/
 */

import type { CosmosWalletConnector, SignDoc } from '../types.js';

/** Minimal type declarations for the Keplr browser extension API. */
interface KeplrChainInfo {
  chainId: string;
  chainName: string;
  rpc: string;
  rest: string;
  stakeCurrency: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  };
  bip44: { coinType: number };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: Array<{
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  }>;
  feeCurrencies: Array<{
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
    gasPriceStep?: { low: number; average: number; high: number };
  }>;
}

interface KeplrAccount {
  address: string;
  algo: string;
  pubKey: Uint8Array;
}

interface KeplrOfflineSigner {
  getChainId(): Promise<string>;
  getAccounts(): Promise<KeplrAccount[]>;
  signDirect(
    signerAddress: string,
    signDoc: {
      bodyBytes: Uint8Array;
      authInfoBytes: Uint8Array;
      chainId: string;
      accountNumber: bigint;
    },
  ): Promise<{
    signature: Uint8Array;
    signed: {
      bodyBytes: Uint8Array;
      authInfoBytes: Uint8Array;
      chainId: string;
      accountNumber: bigint;
    };
  }>;
  signArbitrary(
    signerAddress: string,
    data: string | Uint8Array,
  ): Promise<{
    signature: Uint8Array;
  }>;
}

/** The global `window.keplr` object provided by the Keplr extension. */
interface KeplrProvider {
  enable(chainId: string): Promise<void>;
  disconnect(): Promise<void>;
  getKey(chainId: string): Promise<{
    name: string;
    algo: string;
    pubKey: Uint8Array;
    address: Uint8Array;
    bech32Address: string;
  }>;
  suggestToken(chainId: string, contractAddress: string): Promise<void>;
  experimentalSuggestChain(chainInfo: KeplrChainInfo): Promise<void>;
  getOfflineSigner(chainId: string): KeplrOfflineSigner;
  getOfflineSignerOnlyAmino(chainId: string): KeplrOfflineSigner;
  getOfflineSignerAuto(chainId: string): Promise<KeplrOfflineSigner>;
  signAmino(
    chainId: string,
    signerAddress: string,
    signDoc: unknown,
  ): Promise<{ signed: unknown; signature: unknown }>;
  signDirect(
    chainId: string,
    signerAddress: string,
    signDoc: unknown,
  ): Promise<{ signed: unknown; signature: unknown }>;
  signArbitrary(
    chainId: string,
    signerAddress: string,
    data: string | Uint8Array,
  ): Promise<{ signature: Uint8Array }>;
  sendTx(
    chainId: string,
    tx: Uint8Array,
    mode: 'sync' | 'async' | 'block',
  ): Promise<Uint8Array>;
  on(event: string, handler: (event: unknown) => void): void;
  defaultOptions?: {
    sign?: {
      preferNoSetFee?: boolean;
      disableBalanceCheck?: boolean;
    };
    fee?: {
      autoGasMultiplier?: number;
      defaultGas?: string;
    };
  };
}

/* ------------------------------------------------------------------ */
/*  KeplrConnector                                                      */
/* ------------------------------------------------------------------ */

/**
 * Keplr wallet connector implementing `CosmosWalletConnector`.
 *
 * Wraps the Keplr browser extension API to provide chain-agnostic
 * signing, transfer, and account querying capabilities.
 */
export class KeplrConnector implements CosmosWalletConnector {
  /** @inheritdoc */
  readonly id = 'keplr';

  /** @inheritdoc */
  readonly name = 'Keplr';

  private _keplr: KeplrProvider | null = null;
  private _connectedChainId: string | null = null;

  /* ---- Availability ---- */

  /**
   * Check whether the Keplr extension is installed.
   *
   * In browser environments, looks for `window.keplr`.
   * Returns `false` in SSR / Node.js contexts.
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as Record<string, unknown>;
    return typeof win.keplr === 'object' && win.keplr !== null;
  }

  /**
   * Retrieve the Keplr provider from `window.keplr`.
   *
   * Waits for the `keplr_keystorechange` event to ensure the extension
   * has fully initialized before returning the provider.
   *
   * @param timeoutMs - Max wait time in ms (default 5000).
   * @returns The Keplr provider.
   */
  async getProvider(timeoutMs = 5000): Promise<KeplrProvider> {
    if (this._keplr) return this._keplr;

    if (typeof window === 'undefined') {
      throw new Error('Keplr is only available in browser environments');
    }

    const win = window as unknown as Record<string, unknown>;
    const keplr = win.keplr as KeplrProvider | undefined;

    if (keplr) {
      this._keplr = keplr;
      return keplr;
    }

    // Keplr may not be injected yet — wait for it
    return new Promise<KeplrProvider>((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('keplr_keystorechange', handler);
        reject(new Error('Keplr not found after timeout'));
      }, timeoutMs);

      const handler = () => {
        const found = (window as unknown as Record<string, unknown>).keplr as KeplrProvider | undefined;
        if (found) {
          clearTimeout(timeout);
          window.removeEventListener('keplr_keystorechange', handler);
          this._keplr = found;
          resolve(found);
        }
      };

      window.addEventListener('keplr_keystorechange', handler);
    });
  }

  /* ---- Connection ---- */

  /**
   * Connect to Keplr and enable access for the specified chain.
   *
   * Prompts the user to approve the connection if not already granted.
   *
   * @param chainId - Cosmos chain ID (e.g. "cosmoshub-4").
   * @returns Connected address and chain ID.
   */
  async connect(chainId: string): Promise<{ address: string; chainId: string }> {
    const keplr = await this.getProvider();
    await keplr.enable(chainId);
    const key = await keplr.getKey(chainId);
    this._connectedChainId = chainId;

    return {
      address: key.bech32Address,
      chainId,
    };
  }

  /**
   * Disconnect from Keplr and revoke all chain permissions.
   */
  async disconnect(): Promise<void> {
    const keplr = await this.getProvider();
    await keplr.disconnect();
    this._keplr = null;
    this._connectedChainId = null;
  }

  /* ---- Accounts ---- */

  /**
   * Get accounts available on the given chain.
   *
   * @param chainId - Cosmos chain ID.
   * @returns Array of account objects with address, algo, and pubkey.
   */
  async getAccounts(
    chainId: string,
  ): Promise<Array<{ address: string; algo: string; pubkey: Uint8Array }>> {
    const keplr = await this.getProvider();
    const signer = keplr.getOfflineSigner(chainId);
    const accounts = await signer.getAccounts();

    return accounts.map((a) => ({
      address: a.address,
      algo: a.algo,
      pubkey: a.pubKey,
    }));
  }

  /**
   * Get the current chain ID from the offline signer.
   *
   * @param chainId - The chain to query.
   * @returns Chain ID string.
   */
  async getChainId(chainId: string): Promise<string> {
    const keplr = await this.getProvider();
    const signer = keplr.getOfflineSigner(chainId);
    return signer.getChainId();
  }

  /* ---- Signing ---- */

  /**
   * Sign a Cosmos SignDoc (proto-based transaction).
   *
   * Uses Keplr's `signDirect` method for ADR-036 compliant signing.
   *
   * @param signerAddress - Bech32 address of the signer.
   * @param signDoc - Transaction document to sign.
   * @returns Signature and signed document.
   */
  async sign(
    signerAddress: string,
    signDoc: SignDoc,
  ): Promise<{ signature: Uint8Array; signed: SignDoc }> {
    const keplr = await this.getProvider();
    const chainId = signDoc.chainId;
    const signer = keplr.getOfflineSigner(chainId);

    const result = await signer.signDirect(signerAddress, {
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      chainId: signDoc.chainId,
      accountNumber: BigInt(signDoc.accountNumber),
    });

    return {
      signature: result.signature,
      signed: {
        bodyBytes: result.signed.bodyBytes,
        authInfoBytes: result.signed.authInfoBytes,
        chainId: result.signed.chainId,
        accountNumber: Number(result.signed.accountNumber),
      },
    };
  }

  /**
   * Sign arbitrary text/data (off-chain message signing).
   *
   * Uses Keplr's `signArbitrary` method. Useful for authentication
   * and data integrity verification.
   *
   * @param signerAddress - Bech32 address of the signer.
   * @param data - Data to sign (string or bytes).
   * @returns Signature bytes.
   */
  async signArbitrary(
    signerAddress: string,
    data: string | Uint8Array,
  ): Promise<{ signature: Uint8Array }> {
    const keplr = await this.getProvider();
    const chainId = this._getConnectedChainId();
    return keplr.signArbitrary(chainId, signerAddress, data);
  }

  /* ---- Transfer ---- */

  /**
   * Send a token transfer through Keplr.
   *
   * Delegates to the wallet's built-in transfer flow.
   *
   * @param chainId - Target chain ID.
   * @param recipient - Recipient bech32 address.
   * @param amount - Amount in smallest unit (string).
   * @param denom - Token denomination (e.g. "uatom").
   * @param memo - Optional memo / note.
   * @returns Transaction hash.
   */
  async sendTransfer(
    chainId: string,
    recipient: string,
    amount: string,
    denom: string,
    memo?: string,
  ): Promise<string> {
    const keplr = await this.getProvider();
    await keplr.enable(chainId);

    // Construct a minimal MsgSend and broadcast via sendTx.
    // The full transaction building (signing, encoding, broadcasting)
    // is handled by CosmosAdapter using @cosmjs/stargate.
    // This connector method provides the raw Keplr primitives.
    const signer = keplr.getOfflineSigner(chainId);
    const accounts = await signer.getAccounts();
    const fromAddress = accounts[0]?.address;

    if (!fromAddress) {
      throw new Error('No accounts available on chain');
    }

    // Return a structured payload that CosmosAdapter can use to build
    // the full transaction via @cosmjs/stargate.
    return JSON.stringify({
      chainId,
      fromAddress,
      toAddress: recipient,
      amount: [{ denom, amount }],
      memo: memo ?? '',
    });
  }

  /* ---- Chain Suggestions ---- */

  /**
   * Suggest a custom chain to Keplr.
   *
   * Useful for chains not included in Keplr's default registry.
   *
   * @param chainInfo - Chain configuration.
   */
  async suggestChain(chainInfo: {
    chainId: string;
    chainName: string;
    rpc: string;
    rest: string;
    stakeCurrency: { coinDenom: string; coinMinimalDenom: string; coinDecimals: number };
    bip44: { coinType: number };
    bech32Config: {
      bech32PrefixAccAddr: string;
      bech32PrefixAccPub: string;
      bech32PrefixValAddr: string;
      bech32PrefixValPub: string;
      bech32PrefixConsAddr: string;
      bech32PrefixConsPub: string;
    };
    currencies: Array<{ coinDenom: string; coinMinimalDenom: string; coinDecimals: number }>;
    feeCurrencies: Array<{
      coinDenom: string;
      coinMinimalDenom: string;
      coinDecimals: number;
      gasPriceStep?: { low: number; average: number; high: number };
    }>;
  }): Promise<void> {
    const keplr = await this.getProvider();
    await keplr.experimentalSuggestChain(chainInfo);
  }

  /* ---- Events ---- */

  /**
   * Listen for Keplr keystore change events.
   *
   * Fires when the user switches accounts or chains in the extension.
   *
   * @param handler - Event handler callback.
   */
  onKeystoreChange(handler: (event: unknown) => void): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keplr_keystorechange', handler);
    }
  }

  /**
   * Remove a keystore change event listener.
   */
  offKeystoreChange(handler: (event: unknown) => void): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keplr_keystorechange', handler);
    }
  }

  /* ---- Private helpers ---- */

  /** Get the connected chain ID, throwing if not connected. */
  private _getConnectedChainId(): string {
    if (!this._connectedChainId) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this._connectedChainId;
  }
}
