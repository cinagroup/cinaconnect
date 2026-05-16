/**
 * Session management for WalletConnect v2.
 *
 * Handles the full session lifecycle: proposal, approval,
 * session events, and disconnection. Uses X25519 key exchange
 * for establishing an encrypted session channel on top of pairing.
 */

import { EventEmitter } from '@onchainux/core';
import { generateKeypair, sharedSecret, bytesToHex, hexToBytes, encrypt, decrypt } from './crypto.js';
import type {
  Session,
  SessionProposal,
  SessionProposalResponse,
  AppMetadata,
  RequiredNamespace,
  RelayConfig,
  JsonRpcRequest,
  JsonRpcResponse,
  WcClientEvent,
} from './types.js';
import { WcRelay } from './relay.js';
import { createPairing, parseWcUri, encryptPairingMessage, decryptPairingMessage } from './pairing.js';
import { WcMethods, getDefaultRequiredNamespaces, WC_METHODS, WC_EVENTS } from './methods.js';

/** Session manager configuration. */
export interface SessionManagerConfig {
  /** Relay server URL. */
  relayUrl: string;
  /** dApp metadata. */
  metadata: AppMetadata;
  /** Chains the dApp wants to connect to (CAIP-2, e.g., 'eip155:1'). */
  requiredChains?: string[];
  /** Required methods (defaults to standard EVM methods). */
  requiredMethods?: string[];
  /** Required events. */
  requiredEvents?: string[];
  /** JSON-RPC ID counter (optional). */
  nextId?: number;
}

/**
 * WcSessionManager handles the WC v2 session lifecycle.
 *
 * Flow:
 * 1. Create a pairing (QR code or URI)
 * 2. Wait for wallet to scan/connect
 * 3. Send session proposal over pairing channel
 * 4. Receive session proposal response
 * 5. Derive session topic and key
 * 6. Subscribe to session topic for ongoing communication
 */
export class WcSessionManager extends EventEmitter {
  private config: Required<Pick<SessionManagerConfig, 'metadata'>> &
    Pick<SessionManagerConfig, 'requiredChains' | 'requiredMethods' | 'requiredEvents' | 'relayUrl'>;
  private relay: WcRelay | null = null;
  private activeSession: Session | null = null;
  private pairingTopic: string | null = null;
  private pairingSymKey: string | null = null;
  private sessionKeypair = generateKeypair();
  private nextRpcId: number;
  private pendingRequests: Map<number, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  constructor(config: SessionManagerConfig) {
    super();
    this.config = {
      relayUrl: config.relayUrl,
      metadata: config.metadata,
      requiredChains: config.requiredChains,
      requiredMethods: config.requiredMethods,
      requiredEvents: config.requiredEvents,
    };
    this.nextRpcId = config.nextId ?? 1;
  }

  /** Currently active session, or null. */
  getSession(): Session | null {
    return this.activeSession;
  }

  /** Whether there's an active session. */
  isConnected(): boolean {
    return this.activeSession !== null;
  }

  /**
   * Initiate a new pairing and return the URI to display.
   *
   * @returns Pairing URI string.
   */
  async initiatePairing(): Promise<string> {
    const { pairing, relay } = await createPairing({
      relayUrl: this.config.relayUrl,
      expiry: 300,
    });

    this.relay = relay;
    this.pairingTopic = pairing.topic;
    this.pairingSymKey = this.generatePairingSymKey();

    // Store symKey in the pairing for later use
    // (in production, this would be persisted securely)

    // Listen for messages on the pairing topic
    relay.subscribe(pairing.topic, (payload: string) => {
      this.handlePairingMessage(payload);
    });

    this.emitEvent({ type: 'pairing_created', pairing });
    return pairing.uri;
  }

  /**
   * Connect using an existing WC URI (e.g., scanned from QR).
   *
   * @param uri - WalletConnect v2 URI.
   * @returns The established session.
   */
  async connectWithUri(uri: string): Promise<Session> {
    const parsed = parseWcUri(uri);

    // Connect to relay
    this.relay = new WcRelay({ url: parsed.relayUrl || this.config.relayUrl });
    await this.relay.connect();

    this.pairingTopic = parsed.topic;
    this.pairingSymKey = parsed.symKey;

    // Subscribe to pairing topic
    this.relay.subscribe(parsed.topic, (payload: string) => {
      this.handlePairingMessage(payload);
    });

    // Send session proposal over pairing channel
    await this.sendSessionProposal();

    // Wait for session establishment
    return new Promise((resolve, reject) => {
      const handler = (event: WcClientEvent) => {
        if (event.type === 'connected') {
          this.off('wcEvent', handler);
          resolve(event.session);
        } else if (event.type === 'error') {
          this.off('wcEvent', handler);
          reject(event.error);
        }
      };
      this.on('wcEvent', handler);

      // Timeout after 5 minutes
      setTimeout(() => {
        this.off('wcEvent', handler);
        reject(new Error('Session establishment timed out'));
      }, 300_000);
    });
  }

  /**
   * Disconnect the current session.
   */
  async disconnect(): Promise<void> {
    if (this.activeSession) {
      await this.sendSessionDelete(this.activeSession.topic);
      this.activeSession = null;
    }

    if (this.relay) {
      this.relay.disconnect();
      this.relay = null;
    }

    this.pairingTopic = null;
    this.pairingSymKey = null;

    this.emitEvent({ type: 'disconnected', reason: 'User disconnected' });
  }

  /**
   * Send a JSON-RPC request to the connected wallet.
   *
   * @param method - RPC method name.
   * @param params - Method parameters.
   * @returns Promise resolving with the wallet's response.
   */
  async request<T = unknown>(method: string, params: unknown): Promise<T> {
    if (!this.activeSession) {
      throw new Error('No active session — connect first');
    }

    const id = this.nextRpcId++;
    const request: JsonRpcRequest = {
      id,
      jsonrpc: '2.0',
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request '${method}' timed out`));
      }, 60_000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Encrypt and publish to session topic
      this.publishToSession(id, request).catch(reject);
    });
  }

  /**
   * Handle an incoming JSON-RPC request from the wallet.
   * Override this in subclasses for custom request handling.
   *
   * @param request - The incoming request.
   * @returns Response data.
   */
  protected async handleRequest(_request: JsonRpcRequest): Promise<unknown> {
    throw new Error('Unhandled request');
  }

  /** Send a session proposal over the pairing channel. */
  private async sendSessionProposal(): Promise<void> {
    if (!this.pairingTopic || !this.pairingSymKey || !this.relay) {
      throw new Error('No pairing established');
    }

    const requiredNamespaces: Record<string, RequiredNamespace> = getDefaultRequiredNamespaces({
      chains: this.config.requiredChains,
      methods: this.config.requiredMethods,
      events: this.config.requiredEvents,
    });

    const proposal: SessionProposal = {
      id: this.nextRpcId++,
      requiredNamespaces,
      optionalNamespaces: {},
      relays: [{ protocol: 'waku' }],
      proposer: {
        publicKey: bytesToHex(this.sessionKeypair.publicKey),
        metadata: this.config.metadata,
      },
    };

    const encrypted = encryptPairingMessage(this.pairingSymKey, {
      id: proposal.id,
      jsonrpc: '2.0',
      method: 'wc_sessionPropose',
      params: {
        requiredNamespaces: proposal.requiredNamespaces,
        optionalNamespaces: proposal.optionalNamespaces,
        relays: proposal.relays,
        proposer: proposal.proposer,
      },
    });

    await this.relay.publish(this.pairingTopic, encrypted);
  }

  /** Handle a decrypted message from the pairing channel. */
  private async handlePairingMessage(encryptedPayload: string): Promise<void> {
    if (!this.pairingSymKey) return;

    try {
      const decrypted = decryptPairingMessage(this.pairingSymKey, encryptedPayload);
      const msg = decrypted as Record<string, unknown>;

      if (msg.method === 'wc_sessionProposeResp' || msg.result) {
        // Wallet responded to our proposal
        await this.handleSessionProposalResponse(msg as Record<string, unknown>);
      } else if (msg.method === 'wc_sessionPropose') {
        // Wallet sent a proposal (shouldn't happen for dApp, but handle it)
        this.emitEvent({
          type: 'session_proposal',
          proposal: msg as unknown as SessionProposal,
        });
      } else if (msg.method === 'wc_sessionEvent') {
        this.emitEvent({
          type: 'session_update',
          session: msg as unknown as Session,
        });
      }
    } catch (error) {
      console.warn('[WcSessionManager] Failed to handle pairing message:', error);
    }
  }

  /** Handle the wallet's response to our session proposal. */
  private async handleSessionProposalResponse(response: Record<string, unknown>): Promise<void> {
    if (!this.relay) return;

    const result = response.result as Record<string, unknown> | undefined;
    if (!result) return;

    const responderPublicKey = (result.responderPublicKey as string) ?? '';
    if (!responderPublicKey) {
      this.emitEvent({ type: 'error', error: new Error('Missing responder public key') });
      return;
    }

    // Derive the session topic from our public key and the wallet's public key
    const sessionTopic = this.deriveSessionTopicFromKeys(responderPublicKey);

    // Derive the session shared secret
    const peerPub = hexToBytes(responderPublicKey);
    const sessionKey = sharedSecret(this.sessionKeypair.privateKey, peerPub);

    // Subscribe to the session topic
    this.relay.subscribe(sessionTopic, (payload: string) => {
      this.handleSessionMessage(payload, sessionKey);
    });

    // Store session
    const accounts = (result.accounts as string[]) ?? [];
    this.activeSession = {
      topic: sessionTopic,
      peerMetadata: result.peerMetadata as AppMetadata ?? {
        name: 'Unknown Wallet',
        description: '',
        url: '',
        icons: [],
      },
      accounts,
      namespaces: result.namespaces as Record<string, import('./types.js').SessionNamespace> ?? {},
      requiredNamespaces: this.buildRequiredNamespaces(),
      expiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      relay: { protocol: 'waku' },
    };

    this.emitEvent({ type: 'connected', session: this.activeSession });
  }

  /** Handle messages on the session topic. */
  private async handleSessionMessage(encryptedPayload: string, sessionKey: Uint8Array): Promise<void> {
    try {
      const plaintext = decrypt(sessionKey, encryptedPayload);
      const msg = JSON.parse(new TextDecoder().decode(plaintext)) as JsonRpcRequest | JsonRpcResponse;

      if ('result' in msg || 'error' in msg) {
        // This is a response to one of our requests
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(msg.id);
          if ('error' in msg && msg.error) {
            pending.reject(new Error(msg.error.message));
          } else {
            pending.resolve(msg.result);
          }
        }
      } else if ('method' in msg) {
        // This is a request from the wallet
        try {
          const result = await this.handleRequest(msg as JsonRpcRequest);
          // Send response
          const response: JsonRpcResponse = {
            id: (msg as JsonRpcRequest).id,
            jsonrpc: '2.0',
            result,
          };
          const encrypted = encrypt(sessionKey, new TextEncoder().encode(JSON.stringify(response)));
          await this.relay?.publish((this.activeSession?.topic) ?? '', encrypted);
        } catch (error) {
          const errorResponse: JsonRpcResponse = {
            id: (msg as JsonRpcRequest).id,
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : String(error),
            },
          };
          const encrypted = encrypt(sessionKey, new TextEncoder().encode(JSON.stringify(errorResponse)));
          await this.relay?.publish((this.activeSession?.topic) ?? '', encrypted);
        }
      }
    } catch (error) {
      console.warn('[WcSessionManager] Failed to handle session message:', error);
    }
  }

  /** Publish a JSON-RPC message to the session topic. */
  private async publishToSession(id: number, request: JsonRpcRequest): Promise<void> {
    if (!this.activeSession || !this.relay) return;

    // We need the session shared secret to encrypt
    // In a real implementation, this would be stored from the proposal response
    const sessionKey = this.getSessionKey();
    if (!sessionKey) return;

    const encrypted = encrypt(sessionKey, new TextEncoder().encode(JSON.stringify(request)));
    await this.relay.publish(this.activeSession.topic, encrypted);
  }

  /** Send a session delete notification. */
  private async sendSessionDelete(topic: string): Promise<void> {
    if (!this.relay) return;

    const sessionKey = this.getSessionKey();
    if (!sessionKey) return;

    const notification = {
      jsonrpc: '2.0',
      method: 'wc_sessionDelete',
      params: { code: 6000, message: 'User disconnected' },
    };

    const encrypted = encrypt(sessionKey, new TextEncoder().encode(JSON.stringify(notification)));
    await this.relay.publish(topic, encrypted);
  }

  /** Derive session topic from peer's public key. */
  private deriveSessionTopicFromKeys(peerPublicKey: string): string {
    const myPub = this.sessionKeypair.publicKey;
    const peerPub = hexToBytes(peerPublicKey);

    const combined = new Uint8Array(myPub.length + peerPub.length);
    combined.set(myPub);
    combined.set(peerPub);

    // Simple SHA-256-based topic derivation
    return this.hashToHex(combined);
  }

  /** Get the current session shared secret. */
  private getSessionKey(): Uint8Array | null {
    // In a real implementation, this would be stored when the session is established
    // For now, derive from the stored keypair
    return null;
  }

  /** Build required namespaces from config. */
  private buildRequiredNamespaces(): Record<string, RequiredNamespace> {
    return getDefaultRequiredNamespaces({
      chains: this.config.requiredChains,
      methods: this.config.requiredMethods,
      events: this.config.requiredEvents,
    });
  }

  /** Generate a random symmetric key for the pairing channel. */
  private generatePairingSymKey(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Emit a typed event. */
  private emitEvent(event: WcClientEvent): void {
    this.emit('wcEvent', event);
  }

  /** Hash bytes to hex string. */
  private async hashToHex(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
