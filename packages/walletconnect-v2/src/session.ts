/**
 * Session management for WalletConnect v2.
 *
 * Handles the full session lifecycle: propose, approve, reject, update,
 * extend, delete, emit (notifications). Uses X25519 key exchange for
 * establishing an encrypted session channel on top of pairing.
 */

import { EventEmitter } from '@cinacoin/core-sdk';
import { generateKeypair, sharedSecret, bytesToHex, hexToBytes, encrypt, decrypt } from './crypto.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type {
  Session,
  SessionProposal,
  SessionProposalResponse,
  SessionNotification,
  AppMetadata,
  RequiredNamespace,
  JsonRpcRequest,
  JsonRpcResponse,
  WcClientEvent,
  SessionNamespace,
} from './types.js';
import { WcRelay } from './relay.js';
import { createPairing, parseWcUri, encryptPairingMessage, decryptPairingMessage, deletePairing, pairingPing } from './pairing.js';
import { getDefaultRequiredNamespaces, WC_METHODS, WC_EVENTS } from './methods.js';

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
  /** Session TTL in seconds (default: 7 days). */
  sessionTtl?: number;
  /** JSON-RPC ID counter (optional). */
  nextId?: number;
}

/** Pending request entry. */
interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
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
  private config: Required<Pick<SessionManagerConfig, 'metadata' | 'sessionTtl'>> &
    Pick<SessionManagerConfig, 'requiredChains' | 'requiredMethods' | 'requiredEvents' | 'relayUrl'>;
  private relay: WcRelay | null = null;
  private activeSession: Session | null = null;
  private pairingTopic: string | null = null;
  private pairingSymKey: string | null = null;
  private sessionKeypair = generateKeypair();
  /** Peer's session public key (hex), set after proposal response. */
  private peerSessionPublicKey: string | null = null;
  /** Cached session shared secret. */
  private sessionSharedSecret: Uint8Array | null = null;
  private nextRpcId: number;
  private pendingRequests: Map<number, PendingRequest> = new Map();

  constructor(config: SessionManagerConfig) {
    super();
    this.config = {
      relayUrl: config.relayUrl,
      metadata: config.metadata,
      requiredChains: config.requiredChains,
      requiredMethods: config.requiredMethods,
      requiredEvents: config.requiredEvents,
      sessionTtl: config.sessionTtl ?? 7 * 24 * 60 * 60,
    };
    this.nextRpcId = config.nextId ?? 1;
  }

  /** Currently active session, or null. */
  getSession(): Session | null {
    return this.activeSession;
  }

  /** Whether there's an active session. */
  isConnected(): boolean {
    return this.activeSession !== null && Date.now() < (this.activeSession?.expiry ?? 0);
  }

  // ============================================================
  // Pairing
  // ============================================================

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
    this.pairingSymKey = pairing.symKey ?? this.generatePairingSymKey();

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

    this.relay = new WcRelay({ url: parsed.relayUrl || this.config.relayUrl });
    await this.relay.connect();

    this.pairingTopic = parsed.topic;
    this.pairingSymKey = parsed.symKey;

    this.relay.subscribe(parsed.topic, (payload: string) => {
      this.handlePairingMessage(payload);
    });

    // Send session proposal over pairing channel
    await this.sendSessionProposal();

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
   *
   * Sends wc_sessionDelete notification, unsubscribes, and cleans up state.
   */
  async disconnect(): Promise<void> {
    if (this.activeSession && this.relay) {
      try {
        await this.sendSessionDelete(this.activeSession.topic, 6000, 'User disconnected');
      } catch {
        // Best effort
      }
      this.relay.unsubscribe(this.activeSession.topic);
    }

    if (this.pairingTopic && this.relay && this.pairingSymKey) {
      try {
        await deletePairing(this.relay, this.pairingTopic, this.pairingSymKey);
      } catch {
        // Best effort
      }
    }

    if (this.relay) {
      this.relay.disconnect();
      this.relay = null;
    }

    this.activeSession = null;
    this.pairingTopic = null;
    this.pairingSymKey = null;
    this.peerSessionPublicKey = null;
    this.sessionSharedSecret = null;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Session disconnected'));
      this.pendingRequests.delete(id);
    }

    this.emitEvent({ type: 'disconnected', reason: 'User disconnected' });
  }

  // ============================================================
  // Session operations
  // ============================================================

  /**
   * Extend the session TTL.
   *
   * @param newExpiry - New expiry timestamp (seconds from epoch).
   */
  async extendSession(newExpiry: number): Promise<void> {
    if (!this.activeSession || !this.relay) return;

    const id = this.nextRpcId++;
    const notification = {
      jsonrpc: '2.0',
      method: 'wc_sessionExtend',
      params: {
        expiry: newExpiry,
      },
    };

    const encrypted = this.encryptSessionMessage(id, notification);
    await this.relay.publish(this.activeSession.topic, encrypted);

    this.activeSession.expiry = newExpiry * 1000;
    this.emitEvent({ type: 'session_extend', topic: this.activeSession.topic, newExpiry: this.activeSession.expiry });
  }

  /**
   * Update session namespaces (add/remove methods, events, accounts).
   *
   * @param namespaces - Updated namespaces.
   */
  async updateSession(namespaces: Record<string, SessionNamespace>): Promise<void> {
    if (!this.activeSession || !this.relay) return;

    const id = this.nextRpcId++;
    const notification = {
      jsonrpc: '2.0',
      method: 'wc_sessionUpdate',
      params: { namespaces },
    };

    const encrypted = this.encryptSessionMessage(id, notification);
    await this.relay.publish(this.activeSession.topic, encrypted);

    this.activeSession.namespaces = namespaces;
    this.emitEvent({ type: 'session_update', session: this.activeSession });
  }

  /**
   * Emit a session notification (wallet → dApp event).
   *
   * @param chainId - CAIP-2 chain ID.
   * @param name - Event name.
   * @param data - Event data.
   */
  async emitSessionEvent(chainId: string, name: string, data: unknown): Promise<void> {
    if (!this.activeSession || !this.relay) return;

    const id = this.nextRpcId++;
    const notification: JsonRpcRequest<SessionNotification> = {
      id,
      jsonrpc: '2.0',
      method: 'wc_sessionEmit',
      params: { chainId, name, data },
    };

    const encrypted = this.encryptSessionMessage(id, notification);
    await this.relay.publish(this.activeSession.topic, encrypted);

    this.emitEvent({
      type: 'session_notification',
      notification: { chainId, name, data },
    });
  }

  /**
   * Send a session ping and wait for pong.
   *
   * @param timeoutMs - Timeout in milliseconds (default: 5000).
   * @returns Whether the peer responded.
   */
  async sessionPing(timeoutMs: number = 5000): Promise<boolean> {
    if (!this.activeSession || !this.relay || !this.sessionSharedSecret) {
      return false;
    }

    return new Promise((resolve) => {
      const id = this.nextRpcId++;
      const request: JsonRpcRequest = {
        id,
        jsonrpc: '2.0',
        method: 'wc_sessionPing',
        params: {},
      };

      const handler = (payload: string) => {
        try {
          const decrypted = decrypt(this.sessionSharedSecret!, payload);
          const msg = JSON.parse(new TextDecoder().decode(decrypted)) as Record<string, unknown>;
          if (msg.id === id && msg.result !== undefined) {
            this.relay!.unsubscribe(this.activeSession!.topic, handler);
            resolve(true);
          }
          // Handle incoming ping from peer
          if (msg.method === 'wc_sessionPing' && msg.id !== id) {
            const pong: JsonRpcResponse = {
              id: msg.id as number,
              jsonrpc: '2.0',
              result: {},
            };
            const pongEncrypted = encrypt(this.sessionSharedSecret!, new TextEncoder().encode(JSON.stringify(pong)));
            this.relay!.publish(this.activeSession!.topic, pongEncrypted).catch(() => {});
          }
        } catch {
          // Ignore
        }
      };

      this.relay!.subscribe(this.activeSession!.topic, handler);

      const encrypted = encrypt(this.sessionSharedSecret!, new TextEncoder().encode(JSON.stringify(request)));
      this.relay!.publish(this.activeSession!.topic, encrypted).catch(() => {});

      setTimeout(() => {
        this.relay!.unsubscribe(this.activeSession!.topic, handler);
        resolve(false);
      }, timeoutMs);
    });
  }

  // ============================================================
  // JSON-RPC requests
  // ============================================================

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

      this.publishToSession(request).catch(reject);
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

  // ============================================================
  // Internal: session proposal
  // ============================================================

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

  // ============================================================
  // Internal: message handlers
  // ============================================================

  /** Handle a decrypted message from the pairing channel. */
  private async handlePairingMessage(encryptedPayload: string): Promise<void> {
    if (!this.pairingSymKey) return;

    try {
      const decrypted = decryptPairingMessage(this.pairingSymKey, encryptedPayload);
      const msg = decrypted as Record<string, unknown>;

      if (msg.method === 'wc_sessionProposeResp' || (msg.result && typeof msg.result === 'object')) {
        const result = msg.result as Record<string, unknown>;
        if (result && 'responderPublicKey' in result) {
          await this.handleSessionProposalResponse(result);
        }
      } else if (msg.method === 'wc_sessionPropose') {
        this.emitEvent({
          type: 'session_proposal',
          proposal: msg as unknown as SessionProposal,
        });
      } else if (msg.method === 'wc_sessionEvent') {
        this.emitEvent({
          type: 'session_notification',
          notification: msg.params as SessionNotification,
        });
      } else if (msg.method === 'wc_pairingDelete') {
        this.emitEvent({ type: 'pairing_delete', topic: this.pairingTopic ?? '' });
      }
    } catch (error) {
      console.warn('[WcSessionManager] Failed to handle pairing message:', error);
    }
  }

  /** Handle the wallet's response to our session proposal. */
  private async handleSessionProposalResponse(result: Record<string, unknown>): Promise<void> {
    if (!this.relay) return;

    const responderPublicKey = (result.responderPublicKey as string) ?? '';
    if (!responderPublicKey) {
      this.emitEvent({ type: 'error', error: new Error('Missing responder public key') });
      return;
    }

    // Store peer public key for later encryption
    this.peerSessionPublicKey = responderPublicKey;

    // Derive the session topic from our public key and the wallet's public key
    const peerPub = hexToBytes(responderPublicKey);
    const sessionTopic = this.deriveSessionTopicFromKeys(responderPublicKey);

    // Derive and store the session shared secret
    this.sessionSharedSecret = sharedSecret(this.sessionKeypair.privateKey, peerPub);

    // Subscribe to the session topic
    this.relay.subscribe(sessionTopic, (payload: string) => {
      this.handleSessionMessage(payload);
    });

    // Build session object
    const accounts = (result.accounts as string[]) ?? [];
    const sessionExpiry = (result.expiry as number) ?? Date.now() + this.config.sessionTtl * 1000;

    this.activeSession = {
      topic: sessionTopic,
      peerMetadata: (result.peerMetadata as AppMetadata) ?? {
        name: 'Unknown Wallet',
        description: '',
        url: '',
        icons: [],
      },
      accounts,
      namespaces: (result.namespaces as Record<string, SessionNamespace>) ?? {},
      requiredNamespaces: this.buildRequiredNamespaces(),
      expiry: sessionExpiry,
      relay: { protocol: 'waku' },
    };

    this.emitEvent({ type: 'connected', session: this.activeSession });
  }

  /** Handle messages on the session topic. */
  private async handleSessionMessage(encryptedPayload: string): Promise<void> {
    if (!this.sessionSharedSecret) return;

    try {
      const plaintext = decrypt(this.sessionSharedSecret, encryptedPayload);
      const msg = JSON.parse(new TextDecoder().decode(plaintext)) as JsonRpcRequest | JsonRpcResponse;

      if ('result' in msg || 'error' in msg) {
        // This is a response to one of our requests
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(msg.id);
          if ('error' in msg && msg.error) {
            pending.reject(new Error((msg.error as { message: string }).message));
          } else {
            pending.resolve(msg.result);
          }
        }
      } else if ('method' in msg) {
        // This is a request or notification from the wallet
        const request = msg as JsonRpcRequest;

        switch (request.method) {
          case 'wc_sessionUpdate':
            if (this.activeSession) {
              this.activeSession.namespaces = (request.params as { namespaces: Record<string, SessionNamespace> }).namespaces;
              this.emitEvent({ type: 'session_update', session: this.activeSession });
            }
            break;
          case 'wc_sessionDelete':
            if (this.activeSession) {
              this.emitEvent({ type: 'session_delete', topic: this.activeSession.topic });
              this.activeSession = null;
              this.sessionSharedSecret = null;
              this.peerSessionPublicKey = null;
            }
            break;
          case 'wc_sessionExtend':
            if (this.activeSession) {
              const expiry = (request.params as { expiry: number }).expiry;
              this.activeSession.expiry = expiry * 1000;
              this.emitEvent({ type: 'session_extend', topic: this.activeSession.topic, newExpiry: this.activeSession.expiry });
            }
            break;
          case 'wc_sessionEmit':
            this.emitEvent({
              type: 'session_notification',
              notification: request.params as SessionNotification,
            });
            break;
          case 'wc_sessionPing': {
            const pong: JsonRpcResponse = {
              id: request.id,
              jsonrpc: '2.0',
              result: {},
            };
            const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(pong)));
            await this.relay?.publish(this.activeSession?.topic ?? '', encrypted);
            break;
          }
          default:
            // Forward to subclass handler
            try {
              const result = await this.handleRequest(request);
              const response: JsonRpcResponse = {
                id: request.id,
                jsonrpc: '2.0',
                result,
              };
              const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(response)));
              await this.relay?.publish(this.activeSession?.topic ?? '', encrypted);
            } catch (error) {
              const errorResponse: JsonRpcResponse = {
                id: request.id,
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: error instanceof Error ? error.message : String(error),
                },
              };
              const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(errorResponse)));
              await this.relay?.publish(this.activeSession?.topic ?? '', encrypted);
            }
        }
      }
    } catch (error) {
      console.warn('[WcSessionManager] Failed to handle session message:', error);
    }
  }

  // ============================================================
  // Internal: helpers
  // ============================================================

  /** Publish a JSON-RPC message to the session topic. */
  private async publishToSession(request: JsonRpcRequest): Promise<void> {
    if (!this.activeSession || !this.relay || !this.sessionSharedSecret) return;

    const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(request)));
    await this.relay.publish(this.activeSession.topic, encrypted);
  }

  /** Encrypt a message for the session topic. */
  private encryptSessionMessage(id: number, message: unknown): string {
    if (!this.sessionSharedSecret) {
      throw new Error('No session shared secret');
    }
    return encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify({ id, jsonrpc: '2.0', ...message })));
  }

  /** Send a session delete notification. */
  private async sendSessionDelete(topic: string, code: number, message: string): Promise<void> {
    if (!this.relay || !this.sessionSharedSecret) return;

    const notification = {
      jsonrpc: '2.0',
      method: 'wc_sessionDelete',
      params: { code, message },
    };

    const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(notification)));
    await this.relay.publish(topic, encrypted);
  }

  /** Derive session topic from peer's public key. */
  private deriveSessionTopicFromKeys(peerPublicKey: string): string {
    const myPub = this.sessionKeypair.publicKey;
    const peerPub = hexToBytes(peerPublicKey);

    const combined = new Uint8Array(myPub.length + peerPub.length);
    combined.set(myPub);
    combined.set(peerPub);

    return this.hashToHex(combined);
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
  private hashToHex(data: Uint8Array): string {
    const hash = sha256(data);
    return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
