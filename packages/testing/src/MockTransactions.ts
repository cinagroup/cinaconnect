/**
 * MockTransactions — Mock transaction generation and management for testing.
 *
 * Generates deterministic mock transactions, receipts, and supports
 * simulating pending / confirmed / failed states.
 */

export interface MockTxParams {
  from?: string;
  to?: string;
  value?: string; // hex wei
  gas?: string; // hex
  gasPrice?: string; // hex
  data?: string;
  nonce?: number;
  chainId?: string; // hex
}

export interface MockTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  data: string;
  nonce: number;
  chainId: string;
  blockNumber: null;
  blockHash: null;
  transactionIndex: null;
}

export interface MockTxReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  cumulativeGasUsed: string;
  gasUsed: string;
  status: "0x0" | "0x1";
  logs: MockLog[];
  logsBloom: string;
  contractAddress: string | null;
  effectiveGasPrice: string;
  type: string;
}

export interface MockLog {
  address: string;
  blockHash: string;
  blockNumber: number;
  data: string;
  logIndex: number;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: number;
}

export type TxStatus = "pending" | "confirmed" | "failed" | "reverted";

// ── Transaction generation ──────────────────────────────────────────────────

let _counter = 0;

function nextHash(): string {
  _counter++;
  const hex = _counter.toString(16).padStart(64, "0");
  return `0x${hex}`;
}

function nextBlock(): number {
  return 18_000_000 + _counter;
}

/** Create a mock pending transaction */
export function createMockTransaction(params?: MockTxParams): MockTransaction {
  return {
    hash: params?.hash ?? nextHash(),
    from: params?.from ?? "0x0000000000000000000000000000000000000001",
    to: params?.to ?? "0x0000000000000000000000000000000000000002",
    value: params?.value ?? "0x0",
    gas: params?.gas ?? "0x5208",
    gasPrice: params?.gasPrice ?? "0x4a817c800",
    data: params?.data ?? "0x",
    nonce: params?.nonce ?? _counter,
    chainId: params?.chainId ?? "0x1",
    blockNumber: null,
    blockHash: null,
    transactionIndex: null,
  };
}

/** Create a mock confirmed receipt */
export function createMockReceipt(
  tx: MockTransaction,
  status: TxStatus = "confirmed"
): MockTxReceipt {
  const success = status === "confirmed";
  return {
    transactionHash: tx.hash,
    transactionIndex: 0,
    blockHash: `0xblock${_counter.toString(16).padStart(64 - 5, "0")}`,
    blockNumber: nextBlock(),
    from: tx.from,
    to: tx.to,
    cumulativeGasUsed: "0x5208",
    gasUsed: "0x5208",
    status: success ? "0x1" : "0x0",
    logs: [],
    logsBloom: "0x" + "0".repeat(512),
    contractAddress: null,
    effectiveGasPrice: tx.gasPrice,
    type: "0x2",
  };
}

/** Create a mock event log */
export function createMockLog(
  txHash: string,
  address: string = "0x0000000000000000000000000000000000000002",
  topics: string[] = [],
  data: string = "0x"
): MockLog {
  return {
    address,
    blockHash: `0xblock${_counter.toString(16).padStart(64 - 5, "0")}`,
    blockNumber: nextBlock(),
    data,
    logIndex: 0,
    removed: false,
    topics,
    transactionHash: txHash,
    transactionIndex: 0,
  };
}

/** Reset the internal counter (useful between test runs) */
export function resetTxCounter(): void {
  _counter = 0;
}

/**
 * Simulate a transaction lifecycle.
 * Returns the receipt after an optional delay.
 */
export async function simulateTransaction(
  params?: MockTxParams,
  status: TxStatus = "confirmed",
  delayMs = 0
): Promise<{ tx: MockTransaction; receipt: MockTxReceipt }> {
  const tx = createMockTransaction(params);
  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }
  const receipt = createMockReceipt(tx, status);
  return { tx, receipt };
}
