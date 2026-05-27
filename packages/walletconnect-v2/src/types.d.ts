/**
 * WalletConnect v2 type definitions.
 *
 * Covers pairing, session, proposal, JSON-RPC, relay, notifications,
 * error codes, and envelope types — fully compatible with the WC v2
 * protocol specification.
 */
import type { AppMetadata, RequiredNamespace } from '@cinacoin/core-sdk';
/** Standard WC v2 pairing error codes. */
export declare const WC_PAIRING_ERRORS: {
    /** Invalid pairing proposal. */
    readonly INVALID_PAIRING: 1000;
    /** Pairing proposal expiry is too short. */
    readonly USER_REJECTED: 1001;
    /** Pairing request expired. */
    readonly USER_REJECTED_CHAINS: 1002;
    /** Pairing proposal has invalid parameters. */
    readonly USER_REJECTED_EVM_CHAINS: 1003;
    /** Pairing proposal expiry is too short. */
    readonly USER_REJECTED_STATUS: 1004;
};
/** Standard WC v2 session error codes. */
export declare const WC_SESSION_ERRORS: {
    /** User rejected the session. */
    readonly USER_REJECTED: 5000;
    /** User rejected chains. */
    readonly USER_REJECTED_CHAINS: 5001;
    /** User rejected EVM chains. */
    readonly USER_REJECTED_EVM_CHAINS: 5002;
    /** User rejected status. */
    readonly USER_REJECTED_STATUS: 5003;
    /** Unsupported chains requested. */
    readonly UNSUPPORTED_CHAINS: 5004;
    /** Unsupported namespace key. */
    readonly UNSUPPORTED_NAMESPACE_KEY: 5005;
    /** User rejected methods. */
    readonly USER_REJECTED_METHODS: 5006;
    /** User rejected events. */
    readonly USER_REJECTED_EVENTS: 5007;
};
/** JSON-RPC error codes (per JSON-RPC 2.0 spec). */
export declare const WC_JSON_RPC_ERRORS: {
    /** Invalid JSON received. */
    readonly INVALID_REQUEST: -32600;
    /** Method not found. */
    readonly METHOD_NOT_FOUND: -32601;
    /** Invalid method parameters. */
    readonly INVALID_PARAMS: -32602;
    /** Internal error. */
    readonly INTERNAL_ERROR: -32603;
    /** Parse error. */
    readonly PARSE_ERROR: -32700;
    /** Request timed out. */
    readonly REQUEST_TIMEOUT: -32003;
    /** Session expired. */
    readonly SESSION_EXPIRED: -32004;
    /** Session not found. */
    readonly SESSION_NOT_FOUND: -32005;
    /** Method not supported. */
    readonly UNSUPPORTED_METHOD: -32006;
};
/** Type for all WC error code enums. */
export type WcErrorCode = typeof WC_PAIRING_ERRORS[keyof typeof WC_PAIRING_ERRORS] | typeof WC_SESSION_ERRORS[keyof typeof WC_SESSION_ERRORS] | typeof WC_JSON_RPC_ERRORS[keyof typeof WC_JSON_RPC_ERRORS];
/**
 * Type-0 envelope: used for pairing channels where both parties
 * share a symmetric key from the WC URI.
 */
export interface EnvelopeType0 {
    /** Envelope type identifier. */
    type: 0;
    /** 12-byte nonce (base64). */
    iv: string;
    /** Ciphertext || auth tag (base64). */
    ciphertext: string;
}
/**
 * Type-1 envelope: used for session channels where keys are
 * derived via X25519 DH between session keypairs.
 */
export interface EnvelopeType1 {
    /** Envelope type identifier. */
    type: 1;
    /** Sender's public key (32 bytes, base64). */
    senderPublicKey: string;
    /** 12-byte nonce (base64). */
    iv: string;
    /** Ciphertext || auth tag (base64). */
    ciphertext: string;
}
/** Union of all WC envelope types. */
export type Envelope = EnvelopeType0 | EnvelopeType1;
/** A WC v2 pairing between a dApp and a wallet. */
export interface Pairing {
    /** Pairing topic (64-char hex). */
    topic: string;
    /** Pairing URI in wc: format. */
    uri: string;
    /** Peer wallet metadata. */
    peerMetadata?: AppMetadata;
    /** Whether the pairing is active. */
    active: boolean;
    /** Expiration timestamp (ms). */
    expiry: number;
    /** Symmetric key for the pairing channel (64-char hex). */
    symKey?: string;
}
/** Parsed WalletConnect URI components. */
export interface ParsedWcUri {
    /** Protocol version (always 2 for WC v2). */
    version: 2;
    /** Pairing topic (32-byte hex). */
    topic: string;
    /** Relay protocol (e.g., 'waku', 'irn'). */
    relayProtocol: string;
    /** Relay URL. */
    relayUrl: string;
    /** Symmetric key for encrypting the pairing channel (64-char hex). */
    symKey: string;
    /** WC methods the proposer supports. */
    methods?: string[];
}
/** An active WC v2 session. */
export interface Session {
    /** Session topic (64-char hex). */
    topic: string;
    /** Peer metadata. */
    peerMetadata: AppMetadata;
    /** Connected account addresses (CAIP-10 format: chain:address). */
    accounts: string[];
    /** Approved namespaces. */
    namespaces: Record<string, SessionNamespace>;
    /** Required namespaces that were requested. */
    requiredNamespaces: Record<string, RequiredNamespace>;
    /** Session expiry timestamp (ms). */
    expiry: number;
    /** Relay info. */
    relay: {
        protocol: string;
        data?: string;
    };
}
/** Session namespace (approved chains, methods, events). */
export interface SessionNamespace {
    /** Approved chains (CAIP-2). */
    chains: string[];
    /** Approved methods. */
    methods: string[];
    /** Approved events. */
    events: string[];
    /** Account addresses for this namespace. */
    accounts: string[];
}
/** Session proposal sent by the dApp. */
export interface SessionProposal {
    /** Proposal ID (JSON-RPC request id). */
    id: number;
    /** Required namespaces. */
    requiredNamespaces: Record<string, RequiredNamespace>;
    /** Optional namespaces. */
    optionalNamespaces?: Record<string, RequiredNamespace>;
    /** Relayer info. */
    relays: {
        protocol: string;
        data?: string;
    }[];
    /** Proposer (dApp) metadata and public key. */
    proposer: {
        publicKey: string;
        metadata: AppMetadata;
    };
}
/** Session proposal response sent by the wallet. */
export interface SessionProposalResponse {
    /** Responder (wallet) public key. */
    responderPublicKey: string;
}
/** JSON-RPC request structure. */
export interface JsonRpcRequest<T = unknown> {
    /** JSON-RPC ID. */
    id: number;
    /** JSON-RPC version. */
    jsonrpc: '2.0';
    /** Method name. */
    method: string;
    /** Method parameters. */
    params: T;
}
/** JSON-RPC response structure. */
export interface JsonRpcResponse<T = unknown> {
    /** JSON-RPC ID. */
    id: number;
    /** JSON-RPC version. */
    jsonrpc: '2.0';
    /** Result data (present on success). */
    result?: T;
    /** Error data (present on failure). */
    error?: JsonRpcError;
}
/** JSON-RPC error. */
export interface JsonRpcError {
    /** Error code. */
    code: number;
    /** Human-readable message. */
    message: string;
    /** Optional error data. */
    data?: unknown;
}
/** Encrypted envelope wrapping a JSON-RPC message. */
export interface EncryptedEnvelope {
    /** Encrypted payload (base64: nonce || ciphertext || tag). */
    payload: string;
    /** Sender's public key (hex). */
    senderPublicKey: string;
    /** Topic this message was published to. */
    topic: string;
    /** Message type tag. */
    tag: number;
}
/** Relay protocol configuration. */
export interface RelayConfig {
    /** WebSocket URL of the relay server. */
    url: string;
    /** Connection timeout in milliseconds. */
    connectionTimeout?: number;
    /** Heartbeat interval in milliseconds. */
    heartbeatInterval?: number;
    /** Maximum reconnection attempts. */
    maxReconnectAttempts?: number;
}
/** Relay message as defined by our relay server. */
export interface RelayMessage {
    type: 'publish' | 'subscribe' | 'unsubscribe' | 'message' | 'ping' | 'pong' | 'ack' | 'error';
    topic: string;
    payload: string;
    tag?: number;
    id?: string;
    timestamp: number;
    message?: string;
}
/** Registry entry for a wallet. */
export interface WalletRegistryEntry {
    /** Unique wallet ID. */
    id: string;
    /** Display name. */
    name: string;
    /** Homepage URL. */
    homepage: string;
    /** Deep link scheme (e.g., 'metamask://'). */
    deepLink: string;
    /** Universal link domain for iOS fallback. */
    universalLink?: string;
    /** App Store URL (iOS). */
    appStoreUrl?: string;
    /** Play Store URL (Android). */
    playStoreUrl?: string;
    /** Wallet image URL. */
    imageUrl?: string;
    /** Whether the wallet supports WalletConnect v2. */
    supportsWcV2: boolean;
    /** Supported chains (CAIP-2). */
    chains?: string[];
    /** RDNS for EIP-6963 discovery. */
    rdns?: string;
}
/** Session notification params (wc_sessionEmit). */
export interface SessionNotification {
    /** CAIP-2 chain where the event originated. */
    chainId: string;
    /** Event name (e.g., 'accountsChanged'). */
    name: string;
    /** Event data. */
    data: unknown;
}
/** Events emitted by the WC v2 client. */
export type WcClientEvent = {
    type: 'pairing_created';
    pairing: Pairing;
} | {
    type: 'pairing_expired';
    topic: string;
} | {
    type: 'pairing_delete';
    topic: string;
} | {
    type: 'session_proposal';
    proposal: SessionProposal;
} | {
    type: 'session_approved';
    session: Session;
} | {
    type: 'session_update';
    session: Session;
} | {
    type: 'session_extend';
    topic: string;
    newExpiry: number;
} | {
    type: 'session_delete';
    topic: string;
} | {
    type: 'session_expired';
    topic: string;
} | {
    type: 'session_notification';
    notification: SessionNotification;
} | {
    type: 'request';
    request: JsonRpcRequest;
    topic: string;
} | {
    type: 'response';
    response: JsonRpcResponse;
    topic: string;
} | {
    type: 'connected';
    session: Session;
} | {
    type: 'disconnected';
    reason?: string;
} | {
    type: 'error';
    error: Error;
};
//# sourceMappingURL=types.d.ts.map