/**
 * batch.ts — Real batch transaction service for the demo app.
 *
 * Supports:
 *  - EIP-5792 (wallet_sendCalls) when available
 *  - Fallback to sequential eth_sendTransaction calls
 *  - Gas estimation for batch calls
 *  - Atomic batch (all-or-nothing) semantics
 */

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface Call {
  to: `0x${string}`;
  value: `0x${string}`;
  data: `0x${string}`;
}

export interface BatchResult {
  success: boolean;
  callId?: string;            // EIP-5792 call ID
  txHashes?: string[];        // Individual tx hashes (fallback mode)
  error?: string;
}

export interface GasEstimate {
  individual: string[];       // per-call gas estimates (hex)
  total: string;              // total gas (hex)
  totalDecimal: number;
}

/** Minimal EIP-1193 provider interface we need. */
export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

/** Validate that a string is a 0x-prefixed hex value. */
function isValidHex(value: string): boolean {
  return /^0x([0-9a-fA-F]*)$/.test(value);
}

/** Validate address is 0x-prefixed 20-byte value. */
function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/* ─── Build batch tx data ────────────────────────────────────────────────────── */

/**
 * Build batch transaction data from an array of call objects.
 * Validates and normalizes inputs.
 */
export function buildBatchTx(calls: Call[]): {
  valid: boolean;
  calls: Call[];
  error?: string;
} {
  if (!Array.isArray(calls) || calls.length === 0) {
    return { valid: false, calls: [], error: 'No calls provided' };
  }

  const normalized: Call[] = [];
  for (let i = 0; i < calls.length; i++) {
    const c = calls[i];
    if (!isValidAddress(c.to)) {
      return { valid: false, calls: [], error: `Call #${i + 1}: invalid "to" address: ${c.to}` };
    }
    if (!isValidHex(c.value)) {
      return { valid: false, calls: [], error: `Call #${i + 1}: invalid "value" (must be hex): ${c.value}` };
    }
    if (!isValidHex(c.data)) {
      return { valid: false, calls: [], error: `Call #${i + 1}: invalid "data" (must be hex): ${c.data}` };
    }
    normalized.push({
      to: c.to.toLowerCase() as `0x${string}`,
      value: c.value,
      data: c.data,
    });
  }

  return { valid: true, calls: normalized };
}

/* ─── Gas estimation ─────────────────────────────────────────────────────────── */

/**
 * Estimate gas for each call in the batch via eth_estimateGas.
 * Returns individual estimates and a total.
 */
export async function estimateBatchGas(
  provider: EIP1193Provider,
  from: string,
  calls: Call[],
): Promise<GasEstimate> {
  const individual: string[] = [];
  let total = 0n;

  for (const call of calls) {
    try {
      const gas = (await provider.request({
        method: 'eth_estimateGas',
        params: [
          {
            from,
            to: call.to,
            value: call.value,
            data: call.data,
          },
        ],
      })) as string;

      individual.push(gas);
      total += BigInt(gas);
    } catch {
      // If estimate fails for a call (e.g. would revert), use a default
      individual.push('0x0');
      total += 21_000n; // minimum gas for a simple tx
    }
  }

  return {
    individual,
    total: `0x${total.toString(16)}`,
    totalDecimal: Number(total),
  };
}

/* ─── Detect EIP-5792 support ────────────────────────────────────────────────── */

/**
 * Check if the connected wallet supports EIP-5792 wallet_sendCalls.
 */
export async function checkEIP5792Support(
  provider: EIP1193Provider,
  address: string,
): Promise<boolean> {
  try {
    const caps = (await provider.request({
      method: 'wallet_getCapabilities',
      params: [address],
    })) as Record<string, unknown> | null;

    if (!caps) return false;

    // Check if any chain supports atomicBatch or paymasterService
    for (const chainCaps of Object.values(caps)) {
      if (typeof chainCaps === 'object' && chainCaps !== null) {
        const obj = chainCaps as Record<string, unknown>;
        if (obj.atomicBatch || obj.paymasterService) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/* ─── Execute batch ──────────────────────────────────────────────────────────── */

/**
 * Execute a batch of calls.
 *
 * Strategy:
 *  1. Try EIP-5792 wallet_sendCalls (atomic batch)
 *  2. If unsupported, fall back to sequential eth_sendTransaction calls
 *
 * In fallback mode, all calls are sent sequentially — if any fail,
 * the caller should handle rollback (no true atomicity for EOAs).
 */
export async function executeBatchTx(
  provider: EIP1193Provider,
  from: string,
  calls: Call[],
): Promise<BatchResult> {
  // ── Try EIP-5792 first ──
  try {
    const supportsEIP5792 = await checkEIP5792Support(provider, from);
    if (supportsEIP5792) {
      return await executeAtomicBatch(provider, from, calls);
    }
  } catch {
    // Fall through to sequential
  }

  // ── Fallback: sequential send ──
  return await executeSequentialBatch(provider, from, calls);
}

/**
 * Execute batch via EIP-5792 wallet_sendCalls (atomic).
 */
async function executeAtomicBatch(
  provider: EIP1193Provider,
  from: string,
  calls: Call[],
): Promise<BatchResult> {
  try {
    const chainIdHex = (await provider.request({
      method: 'eth_chainId',
    })) as string;

    const result = (await provider.request({
      method: 'wallet_sendCalls',
      params: [
        {
          version: '1.0.0',
          chainId: chainIdHex,
          from,
          calls,
        },
      ],
    })) as { id: string };

    return {
      success: true,
      callId: result.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // If wallet_sendCalls fails, fall back to sequential
    return await executeSequentialBatch(provider, from, calls);
  }
}

/**
 * Execute batch via sequential eth_sendTransaction calls.
 * Not truly atomic — each call is a separate tx.
 */
async function executeSequentialBatch(
  provider: EIP1193Provider,
  from: string,
  calls: Call[],
): Promise<BatchResult> {
  const txHashes: string[] = [];

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    try {
      const txHash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from,
            to: call.to,
            value: call.value,
            data: call.data,
          },
        ],
      })) as string;

      txHashes.push(txHash);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        txHashes: txHashes.length > 0 ? txHashes : undefined,
        error: `Call #${i + 1} failed: ${message}`,
      };
    }
  }

  return {
    success: true,
    txHashes,
  };
}

/* ─── Get batch status (EIP-5792) ────────────────────────────────────────────── */

export interface CallsStatus {
  status: 'PENDING' | 'CONFIRMED' | 'REVERTED' | string;
  receipts?: {
    transactionHash?: string;
    receipt: { status: string; gasUsed?: string };
  }[];
}

/**
 * Poll wallet_getCallsStatus for an EIP-5792 batch call.
 */
export async function getBatchStatus(
  provider: EIP1193Provider,
  callId: string,
): Promise<CallsStatus> {
  const result = (await provider.request({
    method: 'wallet_getCallsStatus',
    params: [callId],
  })) as CallsStatus;

  return result;
}
