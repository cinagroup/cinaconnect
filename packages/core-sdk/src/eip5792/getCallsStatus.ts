/**
 * wallet_getCallsStatus implementation (EIP-5792).
 *
 * Polls for the status of a batch of calls submitted via
 * wallet_sendCalls.
 */

import type { EIP5792Client, GetCallsStatusResult, CallsStatus } from './types.js';

/**
 * Get the status of a batch of calls by batch ID.
 *
 * Calls the `wallet_getCallsStatus` JSON-RPC method to check
 * whether a batch is pending or confirmed.
 *
 * @param client - Minimal client with a JSON-RPC request method.
 * @param batchId - The batch ID returned by wallet_sendCalls.
 * @returns GetCallsStatusResult with status and optional receipts.
 */
export async function walletGetCallsStatus(
  client: EIP5792Client,
  batchId: string,
): Promise<GetCallsStatusResult> {
  try {
    const result = await client.request({
      method: 'wallet_getCallsStatus',
      params: [batchId],
    });

    return result as unknown as GetCallsStatusResult;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === -32601) {
      throw new Error('wallet_getCallsStatus is not supported by this wallet');
    }
    throw error;
  }
}

/**
 * Wait for a batch of calls to be confirmed.
 *
 * Polls wallet_getCallsStatus at regular intervals until the
 * batch status is CONFIRMED or a timeout is reached.
 *
 * @param client - Minimal client with a JSON-RPC request method.
 * @param batchId - The batch ID to wait for.
 * @param options - Polling options.
 * @returns GetCallsStatusResult with CONFIRMED status and receipts.
 */
export async function waitForCallsStatus(
  client: EIP5792Client,
  batchId: string,
  options: {
    /** Polling interval in milliseconds. Default: 2000. */
    intervalMs?: number;
    /** Maximum wait time in milliseconds. Default: 60000. */
    timeoutMs?: number;
    /** Optional abort signal to cancel waiting. */
    signal?: AbortSignal;
  } = {},
): Promise<GetCallsStatusResult> {
  const intervalMs = options.intervalMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? 60000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (options.signal?.aborted) {
      throw new Error('waitForCallsStatus aborted');
    }

    const result = await walletGetCallsStatus(client, batchId);

    if (result.status === 'CONFIRMED') {
      return result;
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `waitForCallsStatus timed out after ${timeoutMs}ms for batch ${batchId}`,
  );
}

/**
 * Check if a batch result indicates success for all calls.
 *
 * @param result - GetCallsStatusResult to check.
 * @returns True if the batch is confirmed and all calls succeeded.
 */
export function allCallsSucceeded(result: GetCallsStatusResult): boolean {
  if (result.status !== 'CONFIRMED') return false;
  if (!result.receipts || result.receipts.length === 0) return false;

  return result.receipts.every(
    (receipt) => receipt.receipt.status === '0x1',
  );
}

/**
 * Get failed call receipts from a batch result.
 *
 * @param result - GetCallsStatusResult to check.
 * @returns Array of receipts for failed calls.
 */
export function getFailedReceipts(result: GetCallsStatusResult) {
  if (result.status !== 'CONFIRMED' || !result.receipts) return [];

  return result.receipts.filter(
    (receipt) => receipt.receipt.status === '0x0',
  );
}

/** Utility sleep function. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
