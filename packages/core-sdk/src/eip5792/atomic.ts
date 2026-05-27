/**
 * Atomic batch transaction builder (EIP-5792).
 *
 * Constructs atomic batch transactions that execute multiple
 * calls in a single on-chain operation.
 */

import type { Address, Hex } from 'viem';
import type {
  EIP5792Client,
  AtomicBatchConfig,
  AtomicBatchResult,
  Call,
  SendCallsParams,
  SendCallsResult,
  WalletCapabilities,
} from './types.js';
import { walletSendCalls } from './sendCalls.js';

// Chains that support atomic batch via wallet_sendCalls
const KNOWN_ATOMIC_CHAINS = new Set([
  '0x1', // Ethereum mainnet (with account abstraction)
  '0xaa36a7', // Sepolia
  '0x89', // Polygon
  '0xa4b1', // Arbitrum One
  '0xa', // Optimism
  '0x2105', // Base
]);

/**
 * Check if a chain supports atomic batch transactions.
 *
 * @param chainId - Chain ID in hex format.
 * @returns True if the chain is known to support atomic batches.
 */
export function supportsAtomicBatch(chainId: Hex): boolean {
  return KNOWN_ATOMIC_CHAINS.has(chainId.toLowerCase());
}

/**
 * Build an atomic batch from configuration.
 *
 * @param config - Atomic batch configuration.
 * @returns AtomicBatchResult with params and metadata.
 */
export function buildAtomicBatch(
  config: AtomicBatchConfig,
): AtomicBatchResult {
  const chainId = config.chainId;
  const isAtomic = supportsAtomicBatch(chainId);

  const params: SendCallsParams = {
    version: config.version ?? '1.0.0',
    calls: config.calls,
    chainId,
    from: config.from,
    ...(config.capabilities ? { capabilities: config.capabilities } : {}),
  };

  return {
    params,
    isAtomic,
  };
}

/**
 * Build and execute an atomic batch.
 *
 * @param client - Minimal client with a JSON-RPC request method.
 * @param config - Atomic batch configuration.
 * @returns SendCallsResult with batch ID.
 */
export async function executeAtomicBatch(
  client: EIP5792Client,
  config: AtomicBatchConfig,
): Promise<SendCallsResult> {
  const { params } = buildAtomicBatch(config);
  return walletSendCalls(client, params);
}

/**
 * Create a batch that includes an ETH transfer.
 *
 * @param to - Recipient address.
 * @param amountWei - Amount in wei.
 * @returns A Call object for the ETH transfer.
 */
export function createEthTransferCall(
  to: Address,
  amountWei: bigint,
): Call {
  return {
    to,
    value: `0x${amountWei.toString(16)}` as Hex,
  };
}

/**
 * Create a batch that includes a contract function call.
 *
 * @param to - Contract address.
 * @param data - ABI-encoded calldata.
 * @param value - Optional ETH value to send with the call.
 * @returns A Call object.
 */
export function createContractCall(
  to: Address,
  data: Hex,
  value?: bigint,
): Call {
  return {
    to,
    data,
    ...(value !== undefined ? { value: `0x${value.toString(16)}` as Hex } : {}),
  };
}

/**
 * Create a batch that includes an ERC-20 approve call.
 *
 * @param tokenAddress - ERC-20 token contract address.
 * @param spender - Address to approve spending for.
 * @param amount - Amount to approve (in token's smallest unit).
 * @returns A Call object for the approve.
 */
export function createErc20ApproveCall(
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
): Call {
  // approve(address,uint256) selector = 0x095ea7b3
  const paddedSpender = spender.toLowerCase().replace('0x', '').padStart(64, '0');
  const paddedAmount = amount.toString(16).padStart(64, '0');
  const data = `0x095ea7b3${paddedSpender}${paddedAmount}` as Hex;

  return {
    to: tokenAddress,
    data,
  };
}

/**
 * Create a combined approve + swap batch (common DeFi pattern).
 *
 * @param tokenAddress - ERC-20 token address.
 * @param spender - Router/spender address.
 * @param amount - Amount to approve.
 * @param swapCalls - Swap call(s) to execute after approval.
 * @returns Array of Call objects.
 */
export function createApproveAndSwapCalls(
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
  swapCalls: Call[],
): Call[] {
  return [createErc20ApproveCall(tokenAddress, spender, amount), ...swapCalls];
}

/**
 * Validate that a batch configuration is well-formed.
 *
 * @param config - Atomic batch configuration to validate.
 * @throws Error if the configuration is invalid.
 */
export function validateBatchConfig(config: AtomicBatchConfig): void {
  if (!config.chainId) {
    throw new Error('chainId is required');
  }
  if (!config.from) {
    throw new Error('from address is required');
  }
  if (!config.calls || config.calls.length === 0) {
    throw new Error('at least one call is required');
  }
  for (let i = 0; i < config.calls.length; i++) {
    const call = config.calls[i];
    if (!call.to) {
      throw new Error(`call[${i}]: 'to' address is required`);
    }
    if (call.value !== undefined && !isValidHex(call.value)) {
      throw new Error(`call[${i}]: invalid hex value: ${call.value}`);
    }
    if (call.data !== undefined && !isValidHex(call.data)) {
      throw new Error(`call[${i}]: invalid hex data: ${call.data}`);
    }
  }
}

/**
 * Check if a string is a valid hex value.
 *
 * @param value - String to check.
 * @returns True if valid hex.
 */
function isValidHex(value: string): boolean {
  return /^0x[0-9a-fA-F]*$/.test(value);
}
