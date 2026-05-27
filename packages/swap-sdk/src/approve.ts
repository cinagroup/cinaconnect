/**
 * ERC-20 Approval Flow
 *
 * Provides helpers for checking and setting ERC-20 token allowances,
 * including standard approve() and EIP-2612 permit (gasless approval).
 *
 * Standard approval flow:
 *   1. checkAllowance(token, spender, owner) → read current allowance
 *   2. buildApproveTx(token, spender, amount) → encode approve calldata
 *   3. approve(token, spender, amount, walletClient) → send approve transaction
 *   4. ensureAllowance(token, spender, amount, walletClient) → check + approve if needed
 *
 * EIP-2612 permit (gasless approval):
 *   5. buildPermitCalldata(token, permitParams) → encode permit call for DEX routers
 *      that support permit-and-swap in a single transaction
 */

import type {
  Address,
  WalletClient,
  PublicClient,
  Transport,
  Chain,
  Account,
} from "viem";
import { encodeFunctionData, decodeErrorResult, erc20Abi } from "viem";

// ============================================================
// Types
// ============================================================

/**
 * Parameters for an EIP-2612 permit.
 */
export interface PermitParams {
  /** Token address that supports EIP-2612 */
  token: Address;
  /** Owner of the tokens */
  owner: Address;
  /** Spender to approve */
  spender: Address;
  /** Amount to approve */
  value: bigint;
  /** Permit nonce (from token's DOMAIN + nonces) */
  nonce: bigint;
  /** Permit deadline (unix timestamp, 0 for no deadline) */
  deadline: bigint;
  /** EIP-712 domain separator (chainId + verifyingContract) */
  chainId: number;
}

/**
 * Result of a permit signature operation.
 */
export interface PermitSignature {
  /** r component of the signature */
  r: `0x${string}`;
  /** s component of the signature */
  s: `0x${string}`;
  /** v component of the signature */
  v: bigint;
}

/**
 * Result of an approval check.
 */
export interface AllowanceResult {
  /** Current approved amount for the spender */
  allowance: bigint;
  /** Whether the current allowance is sufficient */
  isSufficient: boolean;
  /** Additional amount needed (0 if sufficient) */
  shortfall: bigint;
}

// ============================================================
// ERC-20 ABI (approve + allowance + decimals + name + version)
// ============================================================

const ERC20_APPROVE_ABI = [
  {
    type: "function" as const,
    name: "approve",
    stateMutability: "nonpayable" as const,
    inputs: [
      { type: "address" as const, name: "spender" },
      { type: "uint256" as const, name: "amount" },
    ],
    outputs: [{ type: "bool" as const }],
  },
  {
    type: "function" as const,
    name: "allowance",
    stateMutability: "view" as const,
    inputs: [
      { type: "address" as const, name: "owner" },
      { type: "address" as const, name: "spender" },
    ],
    outputs: [{ type: "uint256" as const }],
  },
  {
    type: "function" as const,
    name: "decimals",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ type: "uint8" as const }],
  },
  {
    type: "function" as const,
    name: "name",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ type: "string" as const }],
  },
];

// EIP-2612 permit function ABI
const PERMIT_ABI = [
  {
    type: "function" as const,
    name: "permit",
    stateMutability: "nonpayable" as const,
    inputs: [
      { type: "address" as const, name: "owner" },
      { type: "address" as const, name: "spender" },
      { type: "uint256" as const, name: "value" },
      { type: "uint256" as const, name: "deadline" },
      { type: "uint8" as const, name: "v" },
      { type: "bytes32" as const, name: "r" },
      { type: "bytes32" as const, name: "s" },
    ],
    outputs: [],
  },
  {
    type: "function" as const,
    name: "nonces",
    stateMutability: "view" as const,
    inputs: [{ type: "address" as const, name: "owner" }],
    outputs: [{ type: "uint256" as const }],
  },
  {
    type: "function" as const,
    name: "DOMAIN_SEPARATOR",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ type: "bytes32" as const }],
  },
  {
    type: "function" as const,
    name: "version",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ type: "string" as const }],
  },
];

// EIP-712 domain for permit signatures
const PERMIT_DOMAIN_ABI = [
  {
    type: "function" as const,
    name: "DOMAIN_SEPARATOR",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ type: "bytes32" as const }],
  },
];

// ============================================================
// Core Approval Functions
// ============================================================

/**
 * Check the current allowance of a token for a spender.
 *
 * @param token ERC-20 token address
 * @param spender Address to check allowance for
 * @param owner Token owner address
 * @param publicClient viem PublicClient for reading state
 * @returns AllowanceResult with current allowance and sufficiency check
 */
export async function checkAllowance(
  token: Address,
  spender: Address,
  owner: Address,
  publicClient: PublicClient<Transport, Chain>,
): Promise<AllowanceResult> {
  try {
    const allowance = await publicClient.readContract({
      address: token,
      abi: ERC20_APPROVE_ABI,
      functionName: "allowance",
      args: [owner, spender],
    });

    return {
      allowance,
      isSufficient: false, // caller provides the required amount
      shortfall: 0n,
    };
  } catch (err) {
    throw new Error(
      `Failed to read allowance for ${token} (owner: ${owner}, spender: ${spender}): ${formatError(err)}`,
    );
  }
}

/**
 * Check allowance and determine if it meets a required amount.
 *
 * @param token ERC-20 token address
 * @param spender Address to check allowance for
 * @param owner Token owner address
 * @param requiredAmount Minimum required allowance
 * @param publicClient viem PublicClient for reading state
 * @returns AllowanceResult with sufficiency based on requiredAmount
 */
export async function checkAllowanceFor(
  token: Address,
  spender: Address,
  owner: Address,
  requiredAmount: bigint,
  publicClient: PublicClient<Transport, Chain>,
): Promise<AllowanceResult> {
  const result = await checkAllowance(token, spender, owner, publicClient);
  const shortfall = requiredAmount > result.allowance
    ? requiredAmount - result.allowance
    : 0n;

  return {
    ...result,
    isSufficient: result.allowance >= requiredAmount,
    shortfall,
  };
}

/**
 * Build an ERC-20 approve transaction calldata.
 *
 * @param token ERC-20 token address
 * @param spender Address to approve
 * @param amount Amount to approve (in token's smallest unit)
 * @returns Encoded calldata for the approve function
 */
export function buildApproveTx(
  token: Address,
  spender: Address,
  amount: bigint,
): { to: Address; data: `0x${string}` } {
  const data = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [spender, amount],
  });

  return { to: token, data };
}

/**
 * Execute an ERC-20 approve transaction.
 *
 * @param token ERC-20 token address
 * @param spender Address to approve
 * @param amount Amount to approve (in token's smallest unit)
 * @param walletClient viem WalletClient for signing and sending
 * @returns Transaction hash of the approve transaction
 */
export async function approve(
  token: Address,
  spender: Address,
  amount: bigint,
  walletClient: WalletClient<Transport, Chain, Account>,
): Promise<`0x${string}`> {
  const { to, data } = buildApproveTx(token, spender, amount);

  const txHash = await walletClient.sendTransaction({
    to,
    data,
    value: 0n,
  });

  return txHash;
}

/**
 * Check allowance and approve if insufficient.
 *
 * This is the main entry point: call this before any swap to ensure
 * the spender (DEX router) has sufficient allowance.
 *
 * @param token ERC-20 token address
 * @param spender Address that needs allowance (e.g., DEX router)
 * @param amount Required amount (in token's smallest unit)
 * @param walletClient viem WalletClient for signing and sending
 * @param publicClient viem PublicClient for reading allowance
 * @param options.approveExact If true, approve exactly `amount`. If false, approve `amount * 2`
 *   to reduce future approve calls. Default: false.
 * @returns `{ approved: true, txHash }` if approve was needed and sent,
 *   `{ approved: false, txHash: undefined }` if allowance was already sufficient.
 */
export async function ensureAllowance(
  token: Address,
  spender: Address,
  amount: bigint,
  walletClient: WalletClient<Transport, Chain, Account>,
  publicClient: PublicClient<Transport, Chain>,
  options?: {
    approveExact?: boolean;
  },
): Promise<{ approved: boolean; txHash?: `0x${string}`; allowance: bigint }> {
  const check = await checkAllowanceFor(token, spender, walletClient.account.address, amount, publicClient);

  if (check.isSufficient) {
    return { approved: false, txHash: undefined, allowance: check.allowance };
  }

  // Approve the shortfall (or full amount if approveExact)
  const approveAmount = options?.approveExact ? amount : amount * 2n;
  const txHash = await approve(token, spender, approveAmount, walletClient);

  return { approved: true, txHash, allowance: approveAmount };
}

// ============================================================
// EIP-2612 Permit (Gasless Approval)
// ============================================================

/**
 * EIP-712 domain for ERC-2612 permit.
 */
interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

/**
 * Read the EIP-712 domain separator from a token contract.
 *
 * @param token ERC-20 token address that supports EIP-2612
 * @param publicClient viem PublicClient for reading state
 * @param chainId Chain ID
 * @returns EIP-712 domain parameters
 */
export async function getPermitDomain(
  token: Address,
  publicClient: PublicClient<Transport, Chain>,
  chainId: number,
): Promise<EIP712Domain> {
  // Try to read name and version from the token
  let tokenName: string;
  let tokenVersion: string;

  try {
    tokenName = await publicClient.readContract({
      address: token,
      abi: ERC20_APPROVE_ABI,
      functionName: "name",
    });
  } catch {
    tokenName = "Unknown Token";
  }

  try {
    tokenVersion = await publicClient.readContract({
      address: token,
      abi: PERMIT_ABI,
      functionName: "version",
    });
  } catch {
    // Many tokens use "1" as default version
    tokenVersion = "1";
  }

  return {
    name: tokenName,
    version: tokenVersion,
    chainId,
    verifyingContract: token,
  };
}

/**
 * Get the current permit nonce for a token owner.
 *
 * @param token ERC-20 token address
 * @param owner Token owner address
 * @param publicClient viem PublicClient for reading state
 * @returns Current nonce for permit signatures
 */
export async function getPermitNonce(
  token: Address,
  owner: Address,
  publicClient: PublicClient<Transport, Chain>,
): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: token,
      abi: PERMIT_ABI,
      functionName: "nonces",
      args: [owner],
    });
  } catch (err) {
    throw new Error(
      `Failed to read permit nonce for ${token} (owner: ${owner}): ${formatError(err)}`,
    );
  }
}

/**
 * Build the typed data for an EIP-2612 permit signature.
 *
 * @param domain EIP-712 domain
 * @param params Permit parameters
 * @returns Typed data object for walletClient.signTypedData
 */
export function buildPermitTypedData(
  domain: EIP712Domain,
  params: {
    owner: Address;
    spender: Address;
    value: bigint;
    nonce: bigint;
    deadline: bigint;
  },
): {
  domain: Record<string, unknown>;
  types: Record<string, unknown>;
  primaryType: string;
  message: Record<string, unknown>;
} {
  return {
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    },
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    message: {
      owner: params.owner,
      spender: params.spender,
      value: params.value,
      nonce: params.nonce,
      deadline: params.deadline,
    },
  };
}

/**
 * Sign an EIP-2612 permit with the wallet client.
 *
 * @param walletClient viem WalletClient for signing
 * @param domain EIP-712 domain
 * @param params Permit parameters
 * @returns Permit signature (r, s, v)
 */
export async function signPermit(
  walletClient: WalletClient<Transport, Chain, Account>,
  domain: EIP712Domain,
  params: {
    owner: Address;
    spender: Address;
    value: bigint;
    nonce: bigint;
    deadline: bigint;
  },
): Promise<PermitSignature> {
  const typedData = buildPermitTypedData(domain, params);

  const signature = await walletClient.signTypedData({
    domain: typedData.domain as Record<string, unknown>,
    types: typedData.types as Record<string, unknown>,
    primaryType: typedData.primaryType,
    message: typedData.message as Record<string, unknown>,
  });

  // Parse signature into r, s, v
  const sigBytes = signature.slice(2) as string;
  const r = `0x${sigBytes.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sigBytes.slice(64, 128)}` as `0x${string}`;
  const v = BigInt(parseInt(sigBytes.slice(128, 130), 16));

  return { r, s, v };
}

/**
 * Build the calldata for calling permit() on an ERC-20 token.
 *
 * This is used to encode a permit call that can be batched with
 * a swap transaction (e.g., Uniswap's swap with permit).
 *
 * @param token ERC-20 token address
 * @param sig Permit signature (r, s, v)
 * @param params Permit parameters (owner, spender, value, deadline)
 * @returns Encoded calldata for the permit function
 */
export function buildPermitCalldata(
  token: Address,
  sig: PermitSignature,
  params: {
    owner: Address;
    spender: Address;
    value: bigint;
    deadline: bigint;
  },
): { to: Address; data: `0x${string}` } {
  // Convert v to uint8
  const v = Number(sig.v) as 0 | 1 | 27 | 28;

  const data = encodeFunctionData({
    abi: PERMIT_ABI,
    functionName: "permit",
    args: [
      params.owner,
      params.spender,
      params.value,
      params.deadline,
      v,
      sig.r,
      sig.s,
    ],
  });

  return { to: token, data };
}

/**
 * Build a full permit transaction for direct submission.
 *
 * @param token ERC-20 token address
 * @param sig Permit signature
 * @param params Permit parameters
 * @param walletClient viem WalletClient
 * @returns Transaction hash
 */
export async function executePermit(
  token: Address,
  sig: PermitSignature,
  params: {
    owner: Address;
    spender: Address;
    value: bigint;
    deadline: bigint;
  },
  walletClient: WalletClient<Transport, Chain, Account>,
): Promise<`0x${string}`> {
  const { to, data } = buildPermitCalldata(token, sig, params);

  const txHash = await walletClient.sendTransaction({
    to,
    data,
    value: 0n,
  });

  return txHash;
}

// ============================================================
// Batch Approve + Swap
// ============================================================

/**
 * Build a batch of transactions: approve (if needed) + swap.
 *
 * This is a helper for building multicall / batch transactions
 * that combine approve and swap into a single on-chain call.
 *
 * Note: This returns the calldata list. Actual batching depends
 * on the target contract (e.g., Uniswap Universal Router,
 * 1inch Fusion, or a custom batch executor).
 *
 * @param token ERC-20 token address
 * @param spender Spender address
 * @param amount Required amount
 * @param allowance Current allowance (if known)
 * @param swapCalldata Encoded swap calldata
 * @param swapTo Target address for the swap
 * @param swapValue ETH value for the swap
 * @returns Array of transaction objects to batch
 */
export function buildBatchApproveAndSwap(
  token: Address,
  spender: Address,
  amount: bigint,
  allowance: bigint,
  swapCalldata: `0x${string}`,
  swapTo: Address,
  swapValue: bigint = 0n,
): Array<{ to: Address; data: `0x${string}`; value: bigint }> {
  const txs: Array<{ to: Address; data: `0x${string}`; value: bigint }> = [];

  // Add approve if needed
  if (allowance < amount) {
    const approve = buildApproveTx(token, spender, amount * 2n);
    txs.push({ to: approve.to, data: approve.data, value: 0n });
  }

  // Add swap
  txs.push({ to: swapTo, data: swapCalldata, value: swapValue });

  return txs;
}

// ============================================================
// Infinite Approval Helper
// ============================================================

/**
 * Maximum uint256 value for infinite approval.
 */
export const MAX_UINT256 = (2n ** 256n) - 1n;

/**
 * Build an infinite approval transaction.
 *
 * Many DEXes and aggregators recommend infinite approval to avoid
 * repeated approve transactions. The risk is that a compromised
 * spender could drain the token.
 *
 * @param token ERC-20 token address
 * @param spender Address to approve
 * @returns Encoded approve calldata with max uint256
 */
export function buildInfiniteApproveTx(
  token: Address,
  spender: Address,
): { to: Address; data: `0x${string}` } {
  return buildApproveTx(token, spender, MAX_UINT256);
}

// ============================================================
// Error Formatting
// ============================================================

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
