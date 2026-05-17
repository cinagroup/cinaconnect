/**
 * wagmi Adapter — integrates wagmi's hooks and config with CinaConnect.
 *
 * Provides a WagmiConnector that wraps wagmi's createConfig and supports
 * multi-chain via wagmi's chains configuration.
 *
 * Designed for React/Next.js apps using wagmi v2+.
 *
 * @example
 * ```ts
 * import { createWagmiConnector } from '@cinaconnect/core-sdk';
 * import { http } from 'viem';
 * import { mainnet, polygon } from 'wagmi/chains';
 *
 * const connector = createWagmiConnector({
 *   chains: [mainnet, polygon],
 *   transports: {
 *     [mainnet.id]: http(),
 *     [polygon.id]: http(),
 *   },
 * });
 * ```
 */
import type { Connector, RedirectHandler } from '../connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest } from '../types.js';
import type { DeepLinkParams, RedirectResult } from '../links/index.js';
import { EventEmitter } from '../events.js';
/** Minimal wagmi Config shape. */
export interface WagmiConfig {
    chains: WagmiChain[];
    transports: Record<number, WagmiTransport>;
    connectors?: WagmiConnectorInstance[];
    storage?: WagmiStorage;
}
/** wagmi Chain configuration. */
export interface WagmiChain {
    id: number;
    name: string;
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: {
        default: {
            http: string[];
        };
    };
    blockExplorers?: {
        default: {
            url: string;
        };
    };
}
/** wagmi Transport (viem-compatible). */
export interface WagmiTransport {
    value?: {
        request(args: {
            method: string;
            params?: unknown[];
        }): Promise<unknown>;
    };
    /** viem http() returns a function, so also support call-style. */
    (params?: unknown): {
        request: (a: {
            method: string;
            params?: unknown[];
        }) => Promise<unknown>;
    };
}
/** wagmi ConnectorInstance (e.g., injected, walletconnect). */
export interface WagmiConnectorInstance {
    id: string;
    name: string;
    type: string;
    connect(params?: Record<string, unknown>): Promise<{
        accounts: string[];
        chainId: number;
    }>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<string[]>;
    getChainId(): Promise<number>;
    switchChain?(chainId: number): Promise<void>;
}
/** wagmi Storage interface. */
export interface WagmiStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
/** CreateConfig parameters. */
export interface CreateWagmiConfig {
    chains: WagmiChain[];
    transports: Record<number, WagmiTransport>;
    connectors?: WagmiConnectorInstance[];
    storage?: WagmiStorage;
}
/**
 * WagmiConnector bridges wagmi's configuration and connector system
 * with CinaConnect's Connector abstract base class.
 *
 * It wraps a WagmiConnectorInstance (injected, walletconnect, etc.)
 * and exposes the standard CinaConnect connector API.
 */
export declare class WagmiConnector extends EventEmitter implements Connector {
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly installed: boolean;
    readonly type: string;
    private wagmiConfig;
    private wagmiConnector;
    private _accounts;
    private _chainId;
    constructor(wagmiConnector: WagmiConnectorInstance, wagmiConfig: WagmiConfig, options?: {
        icon?: string;
    });
    connect(params?: ConnectParams): Promise<ConnectionResult>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<string[]>;
    getChainId(): Promise<number>;
    switchChain(chainId: number): Promise<void>;
    signMessage(message: string): Promise<string>;
    signTransaction(tx: TransactionRequest): Promise<string>;
    getProvider(): unknown;
    /** Get the underlying wagmi config. */
    getWagmiConfig(): WagmiConfig;
    /** Get the underlying wagmi connector instance. */
    getWagmiConnectorInstance(): WagmiConnectorInstance | null;
    openDeepLink(_walletId: string, _uri: string, _params?: Partial<DeepLinkParams>): Promise<RedirectResult>;
    generateDeepLink(_walletId: string, _uri: string, _queryParams?: Record<string, string>): string;
    setRedirectHandler(_handler?: RedirectHandler): void;
}
/**
 * MultiChainConnector wraps a full wagmi config with multiple connector
 * instances and exposes the CinaConnect Connector API.
 *
 * Use this when you need to support multiple wallet types (injected,
 * WalletConnect, Coinbase, etc.) through a single connector.
 */
export declare class MultiChainConnector extends EventEmitter implements Connector {
    readonly id = "wagmi-multi";
    readonly name = "wagmi Multi-Chain";
    readonly icon = "";
    readonly installed = true;
    readonly type = "multi";
    private config;
    private activeConnector;
    private _accounts;
    private _chainId;
    constructor(config: WagmiConfig);
    /** Set the active wagmi connector by ID. */
    setActiveConnector(connectorId: string): void;
    /** Get all available connector IDs. */
    getAvailableConnectors(): string[];
    connect(params?: ConnectParams): Promise<ConnectionResult>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<string[]>;
    getChainId(): Promise<number>;
    switchChain(chainId: number): Promise<void>;
    signMessage(message: string): Promise<string>;
    signTransaction(tx: TransactionRequest): Promise<string>;
    getProvider(): unknown;
    openDeepLink(_walletId: string, _uri: string, _params?: Partial<DeepLinkParams>): Promise<RedirectResult>;
    generateDeepLink(_walletId: string, _uri: string, _queryParams?: Record<string, string>): string;
    setRedirectHandler(_handler?: RedirectHandler): void;
}
/**
 * Create a WagmiConnector from a wagmi connector instance and config.
 *
 * @param wagmiConnector - wagmi ConnectorInstance (e.g., injected).
 * @param wagmiConfig - wagmi Config object.
 * @param options - Optional settings (icon).
 * @returns WagmiConnector instance.
 */
export declare function createWagmiConnector(wagmiConnector: WagmiConnectorInstance, wagmiConfig: WagmiConfig, options?: {
    icon?: string;
}): WagmiConnector;
/**
 * Create a MultiChainConnector from a full wagmi config.
 *
 * @param config - wagmi Config with multiple connectors.
 * @returns MultiChainConnector instance.
 */
export declare function createMultiChainConnector(config: WagmiConfig): MultiChainConnector;
//# sourceMappingURL=wagmi.d.ts.map