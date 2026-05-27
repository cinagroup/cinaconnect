import type { Connector } from '@cinacoin/core-sdk';
import type { XrplConnector, XrplPlatform, XrplFeature, XrplConnectionResult, XrplConnectorEvents, XrplNetwork, XrpSendParams, AccountSettingsParams, TrustLineParams, NftMintParams, NftBurnParams } from './types';
/**
 * XRP Ledger chain adapter for Cinacoin.
 *
 * Supports Xaman (formerly Xumm), Fireblocks, and Ledger.
 * Provides XRP transfers, account settings, trust lines,
 * and NFT minting/burning.
 *
 * @example
 * ```ts
 * import { XrplAdapter, XamanConnector, announceXrplProviders } from '@cinacoin/adapter-xrpl';
 *
 * // Announce providers for EIP-6963 discovery
 * announceXrplProviders();
 *
 * // Use the adapter directly
 * const adapter = new XrplAdapter();
 * const result = await adapter.connect({ connectorId: 'xaman' });
 * const { transactionHash } = await adapter.sendXRP({
 *   destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDH',
 *   amount: '1000000', // 1 XRP in drops
 * });
 *
 * // Or use individual connectors
 * const xaman = new XamanConnector();
 * if (xaman.isAvailable()) {
 *   await xaman.connect();
 * }
 * ```
 */
export declare class XrplAdapter implements XrplConnector {
    readonly id = "xrpl";
    readonly name = "XRP Ledger";
    readonly icon = "data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 32\"><rect width=\"32\" height=\"32\" rx=\"4\" fill=\"%23000\"/><text x=\"16\" y=\"22\" text-anchor=\"middle\" font-size=\"12\" fill=\"white\" font-family=\"sans-serif\" font-weight=\"bold\">XRP</text></svg>";
    readonly platforms: XrplPlatform[];
    private _connector;
    private _registry;
    private _handlers;
    private _coreConnector;
    constructor();
    private _registerBuiltInConnectors;
    /**
     * Register an XRPL connector.
     */
    registerConnector(connector: XrplConnector): void;
    /**
     * Get a connector by id.
     */
    getConnector(id: string): XrplConnector | undefined;
    /**
     * Get all registered connectors.
     */
    getAllConnectors(): XrplConnector[];
    /**
     * Detect which connectors are currently available (wallet installed).
     */
    detectAvailableConnectors(): XrplConnector[];
    /**
     * Get recommended connectors in priority order.
     */
    getRecommendedConnectors(): XrplConnector[];
    /**
     * Set the underlying Cinacoin core connector.
     */
    setConnector(connector: Connector): void;
    get supportedFeatures(): XrplFeature[];
    /**
     * Connect via the best available connector.
     * Optionally specify a connector id to use a specific wallet.
     */
    connect(params?: {
        connectorId?: string;
        network?: XrplNetwork;
    }): Promise<XrplConnectionResult>;
    disconnect(): Promise<void>;
    request<T = unknown>(args: {
        method: string;
        params?: unknown[] | Record<string, unknown>;
    }): Promise<T>;
    getAccounts(): Promise<string[]>;
    getNetwork(): Promise<XrplNetwork>;
    switchNetwork(network: XrplNetwork): Promise<void>;
    isAvailable(): boolean;
    signTransaction(params: {
        transaction: Record<string, unknown>;
    }): Promise<{
        signedTransaction: Record<string, unknown>;
        txBlob: string;
    }>;
    sendXRP(params: XrpSendParams): Promise<{
        transactionHash: string;
    }>;
    getBalance(address?: string): Promise<{
        balance: string;
        unit: 'drops';
    }>;
    updateAccountSettings(params: AccountSettingsParams): Promise<{
        transactionHash: string;
    }>;
    setTrustLine(params: TrustLineParams): Promise<{
        transactionHash: string;
    }>;
    mintNFT(params: NftMintParams): Promise<{
        nftId: string;
        transactionHash: string;
    }>;
    burnNFT(params: NftBurnParams): Promise<{
        transactionHash: string;
    }>;
    on<E extends keyof XrplConnectorEvents>(event: E, handler: XrplConnectorEvents[E]): void;
    off<E extends keyof XrplConnectorEvents>(event: E, handler: XrplConnectorEvents[E]): void;
    private _getConnectorOrThrow;
}
/**
 * Announce all registered XRPL providers via EIP-6963.
 * Call this during application bootstrap.
 */
export declare function announceXrplProviders(): void;
//# sourceMappingURL=XrplAdapter.d.ts.map