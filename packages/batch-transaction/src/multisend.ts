/**
 * MultiSend contract helper.
 *
 * Encodes multiple transactions into a single calldata blob
 * compatible with the Gnosis Safe MultiSend contract.
 *
 * The MultiSend contract executes a series of calls in a single
 * transaction. If any call fails, the entire batch reverts,
 * providing atomicity guarantees.
 *
 * MultiSend operation encoding (per call):
 *   operationType: uint8   (0 = call, 1 = delegatecall)
 *   to:            address (20 bytes)
 *   value:         uint256 (32 bytes)
 *   dataLength:    uint256 (32 bytes)
 *   data:          bytes   (dataLength bytes)
 *
 * The combined calldata for MultiSend.execute is a single bytes
 * parameter containing all calls concatenated.
 *
 * @see https://github.com/safe-global/safe-contracts/blob/main/contracts/libraries/MultiSend.sol
 */

import type { Address, Hex } from 'viem';
import { concat, pad, toHex, hexToBytes as viemHexToBytes } from 'viem';

// ---------------------------------------------------------------------------
// MultiSend ABI — minimal ABI for encoding the execute call
// ---------------------------------------------------------------------------

/**
 * Minimal MultiSend contract ABI (execute function only).
 */
export const MULTI_SEND_ABI = [
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'transactions', type: 'bytes' }],
    outputs: [],
  },
] as const;

/**
 * Well-known MultiSend contract addresses on various chains.
 * Source: Safe{Core} SDK defaults.
 */
export const MULTI_SEND_ADDRESSES: Record<number, Address> = {
  1: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D',   // Ethereum mainnet
  11155111: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526', // Sepolia
  137: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D',  // Polygon
  42161: '0x998739BFdAAdde7C933B942a68053933098f9EDa',  // Arbitrum One
  10: '0x998739BFdAAdde7C933B942a68053933098f9EDa',   // Optimism
  8453: '0x998739BFdAAdde7C933B942a68053933098f9EDa',  // Base
  56: '0x998739BFdAAdde7C933B942a68053933098f9EDa',   // BSC
} as const;

/**
 * Get the MultiSend address for a given chain, or undefined if not in the known list.
 */
export function getMultiSendAddress(chainId: number): Address | undefined {
  return MULTI_SEND_ADDRESSES[chainId as keyof typeof MULTI_SEND_ADDRESSES];
}

// ---------------------------------------------------------------------------
// MultiSend call encoding
// ---------------------------------------------------------------------------

/** A single call within a MultiSend batch. */
export interface MultiSendCall {
  /** Operation type: 0 = call, 1 = delegatecall. */
  operationType: 0 | 1;
  /** Target contract address. */
  to: Address;
  /** ETH value to send (in wei). */
  value: bigint;
  /** ABI-encoded calldata. */
  data: Hex;
}

/**
 * Encode a single call into MultiSend byte format.
 *
 * Format: operationType(1) + to(20) + value(32) + dataLength(32) + data(N)
 */
export function encodeMultiSendCall(call: MultiSendCall): Hex {
  const operationBytes = toHex(call.operationType, { size: 1 });
  const toBytes = pad(call.to as Hex, { size: 20, dir: 'right' });
  const valueBytes = pad(toHex(call.value), { size: 32 });
  const dataBytes = call.data === '0x' ? new Uint8Array(0) : hexToBytes(call.data);
  const dataLengthBytes = pad(toHex(BigInt(call.data === '0x' ? 0 : dataBytes.length)), { size: 32 });

  // Concatenate: operation + to + value + dataLength + data
  const result = new Uint8Array(
    1 + 20 + 32 + 32 + dataBytes.length
  );

  let offset = 0;
  const opArr = hexToBytes(operationBytes);
  result.set(opArr, offset); offset += opArr.length;

  const toArr = hexToBytes(toBytes);
  result.set(toArr, offset); offset += toArr.length;

  const valArr = hexToBytes(valueBytes);
  result.set(valArr, offset); offset += valArr.length;

  const lenArr = hexToBytes(dataLengthBytes);
  result.set(lenArr, offset); offset += lenArr.length;

  result.set(dataBytes, offset);

  return bytesToHex(result);
}

/**
 * Encode multiple calls into a single MultiSend calldata blob.
 */
export function encodeMultiSendBatch(calls: MultiSendCall[]): Hex {
  if (calls.length === 0) {
    throw new Error('encodeMultiSendBatch requires at least one call');
  }

  const encodedCalls = calls.map(encodeMultiSendCall);

  // Concatenate all encoded calls
  let totalLength = 0;
  for (const c of encodedCalls) {
    totalLength += hexToBytes(c).length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of encodedCalls) {
    const arr = hexToBytes(c);
    result.set(arr, offset);
    offset += arr.length;
  }

  return bytesToHex(result);
}

/**
 * Build the full calldata for MultiSend.execute(batch).
 *
 * This is the calldata you would pass to sendTransaction to the
 * MultiSend contract address.
 */
export function buildMultiSendCalldata(calls: MultiSendCall[]): Hex {
  const batchBytes = encodeMultiSendBatch(calls);

  // execute(bytes) selector = 0x8d80ff0a
  // Packed encoding: selector + offset(32) + length(32) + data
  const selector = '0x8d80ff0a';
  const offsetBytes = pad(toHex(32n), { size: 32 });
  const lengthBytes = pad(toHex(BigInt(hexToBytes(batchBytes).length)), { size: 32 });

  const result = new Uint8Array(
    hexToBytes(selector).length +
    hexToBytes(offsetBytes).length +
    hexToBytes(lengthBytes).length +
    hexToBytes(batchBytes).length
  );

  let off = 0;
  const selArr = hexToBytes(selector);
  result.set(selArr, off); off += selArr.length;

  const offArr = hexToBytes(offsetBytes);
  result.set(offArr, off); off += offArr.length;

  const lenArr = hexToBytes(lengthBytes);
  result.set(lenArr, off); off += lenArr.length;

  const dataArr = hexToBytes(batchBytes);
  result.set(dataArr, off);

  return bytesToHex(result);
}

// ---------------------------------------------------------------------------
// Utility: batch-transaction Operation → MultiSendCall conversion
// ---------------------------------------------------------------------------

import type { Operation } from './types.js';

/**
 * Convert a batch-transaction Operation into a MultiSendCall.
 *
 * Handles all operation types: transfer, approve, swap, custom.
 */
export function operationToMultiSendCall(op: Operation): MultiSendCall {
  switch (op.type) {
    case 'transfer':
      if (op.tokenAddress) {
        // ERC-20 transfer: transfer(address,uint256)
        const paddedTo = pad(op.to as Hex, { size: 20, dir: 'right' });
        const paddedAmount = pad(toHex(op.value), { size: 32 });
        const data = `0xa9059cbb${bytesToHex(viemHexToBytes(paddedTo)).slice(2)}${bytesToHex(viemHexToBytes(paddedAmount)).slice(2)}` as Hex;
        return {
          operationType: 0,
          to: op.tokenAddress as Address,
          value: 0n,
          data,
        };
      } else {
        // Native ETH transfer
        return {
          operationType: 0,
          to: op.to as Address,
          value: op.value,
          data: '0x',
        };
      }

    case 'approve': {
      const paddedSpender = pad(op.spender as Hex, { size: 20, dir: 'right' });
      const paddedAmount = pad(toHex(op.amount), { size: 32 });
      const data = `0x095ea7b3${bytesToHex(viemHexToBytes(paddedSpender)).slice(2)}${bytesToHex(viemHexToBytes(paddedAmount)).slice(2)}` as Hex;
      return {
        operationType: 0,
        to: op.tokenAddress as Address,
        value: 0n,
        data,
      };
    }

    case 'swap': {
      if (op.routeData) {
        // Use pre-computed route data
        return {
          operationType: 0,
          to: (op.routerAddress ?? '0x0000000000000000000000000000000000000000') as Address,
          value: 0n,
          data: op.routeData as Hex,
        };
      }
      // Fallback: basic swap (caller should provide routeData)
      throw new Error('Swap operation requires routeData for on-chain execution');
    }

    case 'custom':
      return {
        operationType: 0,
        to: op.to as Address,
        value: op.value ?? 0n,
        data: op.data as Hex,
      };

    default:
      throw new Error(`Unknown operation type: ${(op as Operation).type}`);
  }
}

/**
 * Convert an array of Operations into a MultiSend calldata blob.
 */
export function operationsToMultiSendCalldata(operations: Operation[]): Hex {
  const calls = operations.map(operationToMultiSendCall);
  return buildMultiSendCalldata(calls);
}

// ---------------------------------------------------------------------------
// Hex/bytes helpers (avoid importing encode/decode utilities for simple ops)
// ---------------------------------------------------------------------------

function hexToBytes(hex: Hex): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): Hex {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as Hex;
}
