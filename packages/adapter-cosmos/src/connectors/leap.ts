/**
 * Leap wallet connector for Cosmos SDK chains.
 *
 * Detects `window.leap` and provides the same `CosmosWalletConnector`
 * interface as the Keplr connector. Leap supports a subset of Cosmos
 * chains plus additional networks like Terra and Neutron.
 *
 * @see https://docs.leapwallet.io/cosmos/leap-extension/api
 */

import type { CosmosWalletConnector, SignDoc } from '../types.js';

/** Minimal type declarations for the Leap browser extension API. */
interface LeapAccount {
  address: string;
  algo: string;
  pubKey: Uint8Array;
}

interface LeapOfflineSigner {
  getChainId(): Promise<string>;
  getAccounts(): Promise<LeapAccount[]>;
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
  signAmino(
    signerAddress: string,
    signDoc: unknown,
  ): Promise<{ signed: unknown; signature: unknown }>;
}

interface LeapKey {
  name: string;
  algo: string;
  pubKey: Uint8Array;
  address: Uint8Array;
  bech32Address: string;
  nanoAddress?: string;
  isNanoLedger: boolean;
}

/** The global `window.leap` object provided by the Leap extension. */
interface LeapProvider {
  enable(chainIds: string | string[]): Promise<void>;
  disconnect(): Promise<void>;
  getKey(chainId: string): Promise<LeapKey>;
  suggestToken(chainId: string, contractAddress: string, viewingKey?: string): Promise<void>;
  suggestChain(chainInfo: unknown): Promise<void>;
  getOfflineSigner(chainId: string): LeapOfflineSigner;
  getOfflineSignerOnlyAmino(chainId: string): LeapOfflineSigner;
  getOfflineSignerAuto(chainId: string): Promise<LeapOfflineSigner>;
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
  ): Promise<{ signature: Uint8Array; return_url?: string }>;
  verifyArbitrary(
    chainId: string,
    signerAddress: string,
    data: string | Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean>;
  sendTx(chainId: string, tx: Uint8Array, mode: 'sync' | 'async' | 'block'): Promise<Uint8Array>;
  on(event: string, handler: (event: unknown) => void): void;
  experimentalSuggestChain(chainInfo: unknown): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  LeapConnector                                                       */
/* ------------------------------------------------------------------ */

/**
 * Leap wallet connector implementing `CosmosWalletConnector`.
 *
 * API surface is identical to KeplrConnector, making it trivially
 * swappable in user code.
 */
export class LeapConnector implements CosmosWalletConnector {
  /** @inheritdoc */
  readonly id = 'leap';

  /** @inheritdoc */
  readonly name = 'Leap';

  private _leap: LeapProvider | null = null;
  private _connectedChainId: string | null = null;

  /* ---- Availability ---- */

  /**
   * Check whether the Leap extension is installed.
   *
   * Looks for `window.leap` in browser environments.
   * Returns `false` in SSR / Node.js contexts.
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as Record<string, unknown>;
    return typeof win.leap === 'object' && win.leap !== null;
  }

  /**
   * Retrieve the Leap provider from `window.leap`.
   *
   * @param timeoutMs - Max wait time in ms (default 5000).
   * @returns The Leap provider.
   */
  async getProvider(timeoutMs = 5000): Promise<LeapProvider> {
    if (this._leap) return this._leap;

    if (typeof window === 'undefined') {
      throw new Error('Leap is only available in browser environments');
    }

    const win = window as unknown as Record<string, unknown>;
    const leap = win.leap as LeapProvider | undefined;

    if (leap) {
      this._leap = leap;
      return leap;
    }

    // Wait for injection
    return new Promise<LeapProvider>((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('leap_keystorechange', handler);
        reject(new Error('Leap not found after timeout'));
      }, timeoutMs);

      const handler = () => {
        const found = (window as unknown as Record<string, unknown>).leap as LeapProvider | undefined;
        if (found) {
          clearTimeout(timeout);
          window.removeEventListener('leap_keystorechange', handler);
          this._leap = found;
          resolve(found);
        }
      };

      window.addEventListener('leap_keystorechange', handler);
    });
  }

  /* ---- Connection ---- */

  /**
   * Connect to Leap and enable access for the specified chain.
   *
   * @param chainId - Cosmos chain ID (e.g. "cosmoshub-4").
   * @returns Connected address and chain ID.
   */
  async connect(chainId: string): Promise<{ address: string; chainId: string }> {
    const leap = await this.getProvider();
    await leap.enable(chainId);
    const key = await leap.getKey(chainId);
    this._connectedChainId = chainId;

    return {
      address: key.bech32Address,
      chainId,
    };
  }

  /**
   * Disconnect from Leap.
   */
  async disconnect(): Promise<void> {
    const leap = await this.getProvider();
    await leap.disconnect();
    this._leap = null;
    this._connectedChainId = null;
  }

  /* ---- Accounts ---- */

  /**
   * Get accounts available on the given chain.
   *
   * @param chainId - Cosmos chain ID.
   * @returns Array of account objects.
   */
  async getAccounts(
    chainId: string,
  ): Promise<Array<{ address: string; algo: string; pubkey: Uint8Array }>> {
    const leap = await this.getProvider();
    const signer = leap.getOfflineSigner(chainId);
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
    const leap = await this.getProvider();
    const signer = leap.getOfflineSigner(chainId);
    return signer.getChainId();
  }

  /* ---- Signing ---- */

  /**
   * Sign a Cosmos SignDoc (proto-based transaction).
   *
   * Uses Leap's `signDirect` method for ADR-036 compliant signing.
   *
   * @param signerAddress - Bech32 address of the signer.
   * @param signDoc - Transaction document to sign.
   * @returns Signature and signed document.
   */
  async sign(
    signerAddress: string,
    signDoc: SignDoc,
  ): Promise<{ signature: Uint8Array; signed: SignDoc }> {
    const leap = await this.getProvider();
    const chainId = signDoc.chainId;
    const signer = leap.getOfflineSigner(chainId);

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
   * @param signerAddress - Bech32 address of the signer.
   * @param data - Data to sign.
   * @returns Signature bytes.
   */
  async signArbitrary(
    signerAddress: string,
    data: string | Uint8Array,
  ): Promise<{ signature: Uint8Array }> {
    const leap = await this.getProvider();
    const chainId = this._getConnectedChainId();
    return leap.signArbitrary(chainId, signerAddress, data);
  }

  /* ---- Transfer ---- */

  /**
   * Send a token transfer through Leap.
   *
   * Returns a structured payload for CosmosAdapter to build the full
   * transaction via @cosmjs/stargate.
   *
   * @param chainId - Target chain ID.
   * @param recipient - Recipient bech32 address.
   * @param amount - Amount in smallest unit.
   * @param denom - Token denomination.
   * @param memo - Optional memo.
   * @returns JSON-encoded transfer payload.
   */
  async sendTransfer(
    chainId: string,
    recipient: string,
    amount: string,
    denom: string,
    memo?: string,
  ): Promise<string> {
    const leap = await this.getProvider();
    await leap.enable(chainId);

    const signer = leap.getOfflineSigner(chainId);
    const accounts = await signer.getAccounts();
    const fromAddress = accounts[0]?.address;

    if (!fromAddress) {
      throw new Error('No accounts available on chain');
    }

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
   * Suggest a custom chain to Leap.
   *
   * @param chainInfo - Chain configuration.
   */
  async suggestChain(chainInfo: unknown): Promise<void> {
    const leap = await this.getProvider();
    await leap.experimentalSuggestChain(chainInfo);
  }

  /* ---- Events ---- */

  /**
   * Listen for Leap keystore change events.
   *
   * @param handler - Event handler callback.
   */
  onKeystoreChange(handler: (event: unknown) => void): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('leap_keystorechange', handler);
    }
  }

  /**
   * Remove a keystore change event listener.
   */
  offKeystoreChange(handler: (event: unknown) => void): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('leap_keystorechange', handler);
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
