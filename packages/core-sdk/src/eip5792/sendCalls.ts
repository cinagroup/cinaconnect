/** @ts-nocheck */
/**
 * wallet_sendCalls implementation (EIP-5792).
 *
 * Sends a batch of calls to a wallet for execution. Supports
 * atomic batch transactions and capabilities like paymaster.
 */

import type { Address, WalletClient } from 'viem';
import type {
  Call,
  SendCallsParams,
  SendCallsResult,
  WalletCapabilities,
} from './types.js';

/**
 * Send a batch of calls to the wallet via wallet_sendCalls.
 *
 * The wallet will execute all calls atomically (or sequentially
 * depending on wallet support). Returns a batch ID for status polling.
 *
 * @param client - Viem WalletClient connected to the wallet.
 * @param params - Send calls parameters.
 * @returns SendCallsResult containing the batch ID.
 */
export async function walletSendCalls(
  client: WalletClient,
  params: SendCallsParams,
): Promise<SendCallsResult> {
  const account = params.from ?? (client.account as Address | undefined);
  if (!account) {
    throw new Error('wallet_sendCalls requires a "from" address');
  }

  const requestParams = [
    {
      version: params.version ?? '1.0.0',
      chainId: params.chainId ?? '0x1',
      from: account,
      calls: params.calls,
      ...(params.capabilities ? { capabilities: params.capabilities } : {}),
    },
  ];

  try {
    const result = await client.request({
      method: 'wallet_sendCalls',
      params: requestParams,
    });

    return result as SendCallsResult;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === -32601) {
      throw new Error('wallet_sendCalls is not supported by this wallet');
    }
    throw error;
  }
}

/**
 * Send a single call (convenience wrapper around walletSendCalls).
 *
 * @param client - Viem WalletClient connected to the wallet.
 * @param call - A single call to execute.
 * @param account - Sender address.
 * @param chainId - Optional chain ID (hex).
 * @param capabilities - Optional capabilities.
 * @returns SendCallsResult with batch ID.
 */
export async function sendSingleCall(
  client: WalletClient,
  call: Call,
  account: Address,
  chainId?: string,
  capabilities?: WalletCapabilities,
): Promise<SendCallsResult> {
  return walletSendCalls(client, {
    version: '1.0.0',
    calls: [call],
    chainId: chainId as `0x${string}` | undefined,
    from: account,
    capabilities,
  });
}

/**
 * Build and send an ERC-20 transfer call.
 *
 * @param client - Viem WalletClient.
 * @param tokenAddress - ERC-20 token contract address.
 * @param recipient - Recipient address.
 * @param amount - Amount in token's smallest unit (bigint or hex string).
 * @param account - Sender address.
 * @param chainId - Optional chain ID (hex).
 * @returns SendCallsResult with batch ID.
 */
export async function sendErc20Transfer(
  client: WalletClient,
  tokenAddress: Address,
  recipient: Address,
  amount: bigint | string,
  account: Address,
  chainId?: string,
): Promise<SendCallsResult> {
  const amountHex = typeof amount === 'bigint' ? `0x${amount.toString(16)}` : amount as string;

  const paddedRecipient = recipient.toLowerCase().replace('0x', '').padStart(64, '0');
  const paddedAmount = amountHex.replace('0x', '').padStart(64, '0');

  const data = `0xa9059cbb${paddedRecipient}${paddedAmount}`;

  return sendSingleCall(
    client,
    {
      to: tokenAddress,
      data: data as `0x${string}`,
    },
    account,
    chainId,
  );
}

/**
 * Build and send multiple calls in a batch.
 *
 * @param client - Viem WalletClient.
 * @param calls - Array of calls to execute.
 * @param account - Sender address.
 * @param chainId - Optional chain ID (hex).
 * @param capabilities - Optional capabilities.
 * @param version - Optional EIP-5792 version string.
 * @returns SendCallsResult with batch ID.
 */
export async function sendBatch(
  client: WalletClient,
  calls: Call[],
  account: Address,
  chainId?: string,
  capabilities?: WalletCapabilities,
  version?: string,
): Promise<SendCallsResult> {
  if (calls.length === 0) {
    throw new Error('sendBatch requires at least one call');
  }

  return walletSendCalls(client, {
    version: version ?? '1.0.0',
    calls,
    chainId: chainId as `0x${string}` | undefined,
    from: account,
    capabilities,
  });
}
