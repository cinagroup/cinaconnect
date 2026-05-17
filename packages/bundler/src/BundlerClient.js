/**
 * ERC-4337 BundlerClient — communicates with a bundler RPC endpoint
 * to send and manage UserOperations.
 */
export class BundlerClient {
    constructor(config) {
        this.bundlerUrl = config.bundlerUrl;
        this.chain = config.chain;
        this.entryPoint = config.entryPoint;
    }
    get chainId() {
        return this.chain.id;
    }
    getEntryPoint() {
        return this.entryPoint;
    }
    /**
     * Send a UserOperation to the bundler.
     * Returns the userOpHash for tracking.
     */
    async sendUserOperation(userOp) {
        const response = await this.rpcCall('eth_sendUserOperation', [
            this.serializeUserOperation(userOp),
            this.entryPoint,
        ]);
        return { userOpHash: response.userOpHash };
    }
    /**
     * Get the status of a previously submitted UserOperation.
     */
    async getUserOperationStatus(userOpHash) {
        try {
            const receipt = await this.getUserOperationReceipt(userOpHash);
            if (!receipt)
                return UserOperationStatus.Pending;
            return receipt.success ? UserOperationStatus.Included : UserOperationStatus.Reverted;
        }
        catch {
            return UserOperationStatus.Pending;
        }
    }
    /**
     * Estimate gas for a UserOperation before sending.
     */
    async estimateUserOperationGas(userOp) {
        const response = await this.rpcCall('eth_estimateUserOperationGas', [
            this.serializePartialUserOperation(userOp),
            this.entryPoint,
        ]);
        return {
            preVerificationGas: BigInt(response.preVerificationGas),
            verificationGasLimit: BigInt(response.verificationGasLimit),
            callGasLimit: BigInt(response.callGasLimit),
        };
    }
    /**
     * Prepare a UserOperation with estimated gas values and current gas prices.
     */
    async prepareUserOperation(userOp) {
        const estimates = await this.estimateUserOperationGas(userOp);
        return {
            sender: userOp.sender,
            nonce: userOp.nonce ?? 0n,
            initCode: userOp.initCode ?? '0x',
            callData: userOp.callData,
            callGasLimit: estimates.callGasLimit,
            verificationGasLimit: estimates.verificationGasLimit,
            preVerificationGas: estimates.preVerificationGas,
            maxFeePerGas: userOp.maxFeePerGas ?? 0n,
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas ?? 0n,
            paymasterAndData: userOp.paymasterAndData ?? '0x',
            signature: userOp.signature ?? '0x',
        };
    }
    /**
     * Get the receipt for a UserOperation.
     */
    async getUserOperationReceipt(userOpHash) {
        return this.rpcCall('eth_getUserOperationReceipt', [userOpHash]);
    }
    serializeUserOperation(op) {
        return {
            sender: op.sender,
            nonce: '0x' + op.nonce.toString(16),
            initCode: op.initCode,
            callData: op.callData,
            callGasLimit: '0x' + op.callGasLimit.toString(16),
            verificationGasLimit: '0x' + op.verificationGasLimit.toString(16),
            preVerificationGas: '0x' + op.preVerificationGas.toString(16),
            maxFeePerGas: '0x' + op.maxFeePerGas.toString(16),
            maxPriorityFeePerGas: '0x' + op.maxPriorityFeePerGas.toString(16),
            paymasterAndData: op.paymasterAndData,
            signature: op.signature,
        };
    }
    serializePartialUserOperation(op) {
        const base = {};
        if (op.sender)
            base.sender = op.sender;
        if (op.nonce !== undefined)
            base.nonce = '0x' + op.nonce.toString(16);
        if (op.initCode)
            base.initCode = op.initCode;
        if (op.callData)
            base.callData = op.callData;
        if (op.callGasLimit !== undefined)
            base.callGasLimit = '0x' + op.callGasLimit.toString(16);
        if (op.verificationGasLimit !== undefined)
            base.verificationGasLimit = '0x' + op.verificationGasLimit.toString(16);
        if (op.preVerificationGas !== undefined)
            base.preVerificationGas = '0x' + op.preVerificationGas.toString(16);
        if (op.maxFeePerGas !== undefined)
            base.maxFeePerGas = '0x' + op.maxFeePerGas.toString(16);
        if (op.maxPriorityFeePerGas !== undefined)
            base.maxPriorityFeePerGas = '0x' + op.maxPriorityFeePerGas.toString(16);
        if (op.paymasterAndData)
            base.paymasterAndData = op.paymasterAndData;
        if (op.signature)
            base.signature = op.signature;
        return base;
    }
    async rpcCall(method, params) {
        const response = await fetch(this.bundlerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        });
        if (!response.ok) {
            throw new Error(`Bundler RPC error: ${response.status} ${response.statusText}`);
        }
        const json = (await response.json());
        if (json.error) {
            throw new Error(`Bundler RPC error: ${json.error.message}`);
        }
        return json.result;
    }
}
//# sourceMappingURL=BundlerClient.js.map