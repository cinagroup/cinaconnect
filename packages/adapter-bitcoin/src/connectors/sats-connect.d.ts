import type { BitcoinConnector, BitcoinPlatform, BitcoinFeature, BitcoinConnectionResult, BitcoinConnectorEvents } from '../types';
export type { AddressPurpose, RpcError, RpcMethod, GetAddressResponse, SignMessageResponse, SignTransactionResponse, SendTransferResponse, } from '@sats-connect/core';
/**
 * SatsConnect connector.
 *
 * Uses the `@sats-connect/core` SDK to connect to multiple Bitcoin wallets
 * through a unified interface. SatsConnect acts as an abstraction layer over
 * wallets like Xverse, Oyl, Leather, and others that implement the sats-connect protocol.
 *
 * @see https://github.com/secretkeylabs/sats-connect
 *
 * @example
 * ```ts
 * import { SatsConnectConnector } from '@cinacoin/adapter-bitcoin';
 *
 * const connector = new SatsConnectConnector();
 * if (connector.isAvailable()) {
 *   const result = await connector.connect();
 *   console.log(result.accounts);
 * }
 * ```
 */
export declare class SatsConnectConnector implements BitcoinConnector {
    readonly id = "sats-connect";
    readonly name = "SatsConnect";
    readonly icon = "data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"16\" fill=\"%23FF9500\"/><text x=\"16\" y=\"22\" text-anchor=\"middle\" font-size=\"12\" fill=\"white\" font-family=\"sans-serif\" font-weight=\"bold\">S</text></svg>";
    readonly platforms: BitcoinPlatform[];
    readonly supportedFeatures: BitcoinFeature[];
    private _handlers;
    private _connectedAccounts;
    private _network;
    isAvailable(): boolean;
    connect(params?: {
        accounts?: string[];
    }): Promise<BitcoinConnectionResult>;
    disconnect(): Promise<void>;
    request<T = unknown>(args: {
        method: string;
        params?: unknown[];
    }): Promise<T>;
    getAccounts(): Promise<string[]>;
    getNetwork(): Promise<string>;
    switchNetwork(network: string): Promise<void>;
    signMessage(params: {
        message: string;
        address: string;
    }): Promise<{
        signature: string;
    }>;
    signPsbt(params: {
        psbt: string;
        signInputs?: Record<number, number[]>;
    }): Promise<{
        psbt: string;
    }>;
    sendTransfer(params: {
        recipient: string;
        amount: number;
        feeRate?: number;
    }): Promise<{
        txid: string;
    }>;
    on<E extends keyof BitcoinConnectorEvents>(event: E, handler: BitcoinConnectorEvents[E]): void;
    off<E extends keyof BitcoinConnectorEvents>(event: E, handler: BitcoinConnectorEvents[E]): void;
    /**
     * Bind to sats-connect global events.
     *
     * SatsConnect uses postMessage, so we listen on window for relevant events.
     */
    private _bindGlobalEvents;
}
//# sourceMappingURL=sats-connect.d.ts.map