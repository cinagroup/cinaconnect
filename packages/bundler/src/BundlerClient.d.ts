import { type Address, type Hash } from 'viem';
import type { UserOperation, UserOperationGasEstimate, UserOperationReceipt, UserOperationStatus, SendUserOperationResult, BundlerConfig } from './types';
/**
 * ERC-4337 BundlerClient — communicates with a bundler RPC endpoint
 * to send and manage UserOperations.
 */
export declare class BundlerClient {
    private readonly bundlerUrl;
    private readonly chain;
    private readonly entryPoint;
    constructor(config: BundlerConfig);
    get chainId(): number;
    getEntryPoint(): Address;
    /**
     * Send a UserOperation to the bundler.
     * Returns the userOpHash for tracking.
     */
    sendUserOperation(userOp: UserOperation): Promise<SendUserOperationResult>;
    /**
     * Get the status of a previously submitted UserOperation.
     */
    getUserOperationStatus(userOpHash: Hash): Promise<UserOperationStatus>;
    /**
     * Estimate gas for a UserOperation before sending.
     */
    estimateUserOperationGas(userOp: Partial<UserOperation>): Promise<UserOperationGasEstimate>;
    /**
     * Prepare a UserOperation with estimated gas values and current gas prices.
     */
    prepareUserOperation(userOp: Partial<UserOperation> & {
        sender: Address;
        callData: Hex;
    }): Promise<UserOperation>;
    /**
     * Get the receipt for a UserOperation.
     */
    getUserOperationReceipt(userOpHash: Hash): Promise<UserOperationReceipt | null>;
    private serializeUserOperation;
    private serializePartialUserOperation;
    private rpcCall;
}
//# sourceMappingURL=BundlerClient.d.ts.map