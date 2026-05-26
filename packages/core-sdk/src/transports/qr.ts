/**
 * QR Code connection transport.
 *
 * Generates QR codes for WalletConnect-style pairing URIs and
 * manages the connection lifecycle for wallet scanning.
 */

import { Connector } from '../connector.js';
import { EventEmitter } from '../events.js';
import type { ConnectParams, ConnectionResult, TransactionRequest } from '../types.js';
import { RelayTransport } from './relay.js';

/** QR transport configuration. */
export interface QRTransportConfig {
  /** Relay URL for the underlying WebSocket connection. */
  relayUrl: string;
  /** QR code display timeout in milliseconds. */
  qrTimeout?: number;
  /** Project ID for relay authentication. */
  projectId: string;
}

/**
 * QRTransport enables wallet connection via QR code scanning.
 *
 * Flow:
 * 1. Generate a pairing URI with our relay endpoint
 * 2. Display as QR code for user to scan with wallet
 * 3. Wait for wallet to connect via relay WebSocket
 * 4. Establish encrypted session
 */
export class QRTransport extends Connector {
  readonly id = 'qr';
  readonly name = 'Scan QR Code';
  readonly icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTMgMTEoOGg4VjNIM3Y4em0yLTZoNHY0SDVWNXptOC0ydjRoNHYtNGgtNHptMiAydjJoMlY3aC0yeiIvPjwvc3ZnPg==';
  readonly type = 'qr';

  private relay: RelayTransport;
  private config: Required<QRTransportConfig>;
  private currentUri: string | null = null;
  private connectedAccounts: string[] = [];
  private connectedChainId: number | null = null;

  constructor(config: QRTransportConfig) {
    super();
    this.config = {
      relayUrl: config.relayUrl,
      qrTimeout: config.qrTimeout ?? 300_000, // 5 minutes
      projectId: config.projectId,
    };
    this.relay = new RelayTransport({ url: config.relayUrl });
    this.setupRelayListeners();
  }

  get installed(): boolean {
    // QR transport is always available — user scans with their wallet
    return true;
  }

  private setupRelayListeners(): void {
    this.relay.on('message', (_topic: unknown, payload: unknown) => {
      // Parse incoming encrypted message
      try {
        const data = JSON.parse(payload as string);
        this.emit('message', data);
      } catch {
        // Encrypted payload — will be decrypted at the session layer
        this.emit('encryptedMessage', payload);
      }
    });

    this.relay.on('connected', () => {
      this.emit('relayConnected');
    });

    this.relay.on('disconnected', () => {
      this.emit('relayDisconnected');
    });
  }

  /**
   * Generate a pairing URI for QR code display.
   * @returns The pairing URI to encode as a QR code.
   */
  async generatePairingUri(): Promise<string> {
    // Connect relay first
    if (!this.relay.isConnected()) {
      await this.relay.connect();
    }

    // Generate pairing topic and keypair
    const pairingTopic = this.generateTopic();
    const symKey = this.generateSymKey();

    // Construct WalletConnect-compatible URI
    const uri = `wc:${pairingTopic}@2?relay-protocol=ws&relay-url=${encodeURIComponent(this.config.relayUrl)}&symKey=${symKey}`;
    this.currentUri = uri;

    // Set QR timeout
    setTimeout(() => {
      if (this.currentUri === uri) {
        this.currentUri = null;
        this.emit('qrExpired');
      }
    }, this.config.qrTimeout);

    return uri;
  }

  /**
   * Connect via QR code.
   *
   * This generates a pairing URI and waits for the wallet to scan
   * and confirm the connection.
   *
   * @param params - Optional connection parameters.
   * @returns Connection result.
   */
  async connect(params?: ConnectParams): Promise<ConnectionResult> {
    const uri = params?.uri ?? (await this.generatePairingUri());

    // Wait for connection confirmation from relay
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.relay.off('message', handler);
        reject(new Error('QR connection timed out'));
      }, this.config.qrTimeout);

      const handler = (_topic: unknown, payload: unknown) => {
        try {
          const data = JSON.parse(payload as string);
          if (data.method === 'wc_sessionPropose') {
            clearTimeout(timeout);
            this.relay.off('message', handler);

            // In production: approve session and get accounts/chainId
            // For now, emit the proposal for UI handling
            this.emit('sessionProposal', data);
            reject(new Error('Session proposal received — handle approval in UI layer'));
          }
        } catch {
          // Encrypted — ignore at transport level
        }
      };

      this.relay.on('message', handler);
    });
  }

  async disconnect(): Promise<void> {
    this.relay.disconnect();
    this.connectedAccounts = [];
    this.connectedChainId = null;
    this.currentUri = null;
    this.emit('disconnect');
  }

  async getAccounts(): Promise<string[]> {
    return this.connectedAccounts;
  }

  async getChainId(): Promise<number> {
    if (this.connectedChainId === null) {
      throw new Error('Not connected');
    }
    return this.connectedChainId;
  }

  async switchChain(_chainId: number): Promise<void> {
    throw new Error('QR transport does not support chain switching directly');
  }

  async signMessage(_message: string): Promise<string> {
    throw new Error('Sign via session layer, not transport');
  }

  async signTransaction(_tx: TransactionRequest): Promise<string> {
    throw new Error('Sign via session layer, not transport');
  }

  /** Get the current QR URI (if active). */
  getUri(): string | null {
    return this.currentUri;
  }

  /** Generate a random 32-byte topic (64 hex chars). */
  private generateTopic(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Generate a random symmetric key (64 hex chars). */
  private generateSymKey(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
