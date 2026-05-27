import type { Connector } from '@cinacoin/core-sdk';
import type { HederaConnector, HederaPlatform, HederaFeature, HederaConnectionResult, HederaConnectorEvents, HederaNetwork, HbarTransferParams, TokenTransferParams, ContractCallParams } from './types';
/**
 * Hedera Hashgraph chain adapter for Cinacoin.
 *
 * Supports Blade Wallet, HashPack, and Kantara Wallet.
 * Provides HBAR transfers, token transfers, smart contract calls,
 * and standard chain adapter operations.
 *
 * @example
 * ```ts
 * import { HederaAdapter } from '@cinacoin/adapter-hedera';
 *
 * const adapter = new HederaAdapter();
 * adapter.registerConnector(new HashPackConnector());
 * adapter.registerConnector(new BladeWalletConnector());
 * adapter.registerConnector(new KantaraWalletConnector());
 *
 * await adapter.connect();
 * const balance = await adapter.getBalance();
 * const { transactionId } = await adapter.transferHbar({
 *   recipient: '0.0.12345',
 *   amount: '100000000', // 1 HBAR in tinybar
 * });
 * ```
 */
export declare class HederaAdapter implements HederaConnector {
    readonly id = "hedera";
    readonly name = "Hedera Hashgraph";
    readonly icon = "data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 32\"><rect width=\"32\" height=\"32\" rx=\"4\" fill=\"%23232323\"/><text x=\"16\" y=\"22\" text-anchor=\"middle\" font-size=\"14\" fill=\"white\" font-family=\"sans-serif\" font-weight=\"bold\">HBAR</text></svg>";
    readonly platforms: HederaPlatform[];
    private _connector;
    private _registry;
    private _handlers;
    private _coreConnector;
    constructor();
    private _registerBuiltInConnectors;
    /**
     * Register a Hedera connector.
     */
    registerConnector(connector: HederaConnector): void;
    /**
     * Get a connector by id.
     */
    getConnector(id: string): HederaConnector | undefined;
    /**
     * Get all registered connectors.
     */
    getAllConnectors(): HederaConnector[];
    /**
     * Detect which connectors are currently available (wallet installed).
     */
    detectAvailableConnectors(): HederaConnector[];
    /**
     * Get recommended connectors in priority order.
     */
    getRecommendedConnectors(): HederaConnector[];
    /**
     * Set the underlying Cinacoin core connector.
     */
    setConnector(connector: Connector): void;
    get supportedFeatures(): HederaFeature[];
    /**
     * Connect via the best available connector.
     * Optionally specify a connector id to use a specific wallet.
     */
    connect(params?: {
        connectorId?: string;
        network?: HederaNetwork;
    }): Promise<HederaConnectionResult>;
    disconnect(): Promise<void>;
    request<T = unknown>(args: {
        method: string;
        params?: unknown[] | Record<string, unknown>;
    }): Promise<T>;
    getAccounts(): Promise<string[]>;
    getNetwork(): Promise<HederaNetwork>;
    switchNetwork(network: HederaNetwork): Promise<void>;
    isAvailable(): boolean;
    signTransaction(params: {
        transaction: string;
    }): Promise<{
        signedTransaction: string;
    }>;
    executeTransaction(params: {
        transaction: string;
    }): Promise<{
        transactionId: string;
    }>;
    getBalance(accountId?: string): Promise<{
        balance: string;
        unit: 'tinybar';
    }>;
    transferHbar(params: HbarTransferParams): Promise<{
        transactionId: string;
    }>;
    transferToken(params: TokenTransferParams): Promise<{
        transactionId: string;
    }>;
    contractCall(params: ContractCallParams): Promise<{
        transactionId: string;
    }>;
    on<E extends keyof HederaConnectorEvents>(event: E, handler: HederaConnectorEvents[E]): void;
    off<E extends keyof HederaConnectorEvents>(event: E, handler: HederaConnectorEvents[E]): void;
    private _getConnectorOrThrow;
}
/**
 * Announce all registered Hedera providers via EIP-6963.
 * Call this during application bootstrap.
 */
export declare function announceHederaProviders(): void;
//# sourceMappingURL=HederaAdapter.d.ts.map