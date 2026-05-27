import { ConnectorConfig, ConnectorEvents, ConnectionResult } from '../types';
/**
 * Configuration for WalletConnectConnector.
 */
interface WCConnectorOptions {
    /** WalletConnect Cloud relay project ID */
    projectId: string;
    /** App metadata displayed in the wallet */
    metadata?: {
        name: string;
        description: string;
        url: string;
        icons: string[];
    };
    /** Required EIP-155 chains (default: ["eip155:1"]) */
    chains?: string[];
    /** Optional methods beyond defaults */
    optionalMethods?: string[];
}
/**
 * Full WalletConnect v2 connector using @cinacoin/core-sdk SignClient.
 *
 * Supports pairing via QR code URI, deep links, and direct session management.
 */
export declare class WalletConnectConnector implements ConnectorConfig {
    readonly id = "walletconnect";
    readonly name = "WalletConnect";
    readonly icon = "data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"%233B99FC\" d=\"M16.275 5.366a.64.64 0 0 0-.913-.022l-3.139 2.78-3.139-2.78a.64.64 0 0 0-.914.022.683.683 0 0 0 .022.944l3.565 3.158-3.565 3.157a.683.683 0 0 0-.022.944c.237.257.643.272.913.022l3.14-2.78 3.139 2.78c.27.25.676.235.913-.022a.683.683 0 0 0-.022-.944L12.69 11.466l3.564-3.157a.683.683 0 0 0 .022-.944z\"/></svg>";
    readonly type: "walletconnect";
    /** Internal event handlers */
    private _handlers;
    /** WalletConnect SignClient instance */
    private _signClient;
    /** Active session topic */
    private _sessionTopic;
    /** Cached accounts */
    private _accounts;
    /** Cached chain ID */
    private _chainId;
    /** Whether connected */
    private _connected;
    /** Last generated URI */
    private _uri;
    /** Connector options */
    private _options;
    constructor(options: WCConnectorOptions);
    /**
     * Initialize the WalletConnect SignClient.
     *
     * Must be called before any connection attempt.
     */
    init(): Promise<void>;
    /**
     * Connect via WalletConnect.
     *
     * Generates a new pairing URI and waits for the remote wallet to approve.
     * Call getURI() after connect() to retrieve the QR code URI.
     */
    connect(_params?: Record<string, unknown>): Promise<ConnectionResult>;
    /**
     * Disconnect the active WalletConnect session.
     */
    disconnect(): Promise<void>;
    /**
     * Send a JSON-RPC request through the active WalletConnect session.
     */
    request(args: {
        method: string;
        params?: unknown[];
    }): Promise<unknown>;
    getAccounts(): Promise<string[]>;
    getChainId(): Promise<string>;
    /**
     * WalletConnect is always available as long as the browser has network access.
     */
    isAvailable(): boolean;
    /**
     * Get the current pairing URI for QR code display.
     */
    getURI(): string | null;
    /**
     * Get the raw SignClient instance for advanced usage.
     */
    getSignClient(): any;
    on<E extends keyof ConnectorEvents>(event: E, handler: ConnectorEvents[E]): void;
    off<E extends keyof ConnectorEvents>(event: E, handler: ConnectorEvents[E]): void;
    private _getClientOrThrow;
    /**
     * Attempt to restore active sessions from SignClient storage.
     */
    private _restoreSessions;
    /**
     * Bind SignClient session events to internal event handlers.
     */
    private _bindSessionEvents;
}
export {};
//# sourceMappingURL=walletconnect.d.ts.map