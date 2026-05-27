/**
 * TxIndexer — lightweight event indexer.
 *
 * Scans blocks on multiple chains for Transfer, Swap, Deposit, Withdrawal events.
 * Stores indexed events to SQLite. Polls for new blocks at configurable intervals.
 * Supports ETH, Polygon, BSC out of the box.
 */

import {
  createPublicClient,
  http,
  type Address,
  type Hash,
  type Log,
  type Hex,
  formatUnits,
  keccak256,
  toEventHash,
  parseEventLogs,
} from 'viem';
import { mainnet, polygon, bsc, type Chain } from 'viem/chains';
import type { RpcLog } from 'viem';
import { EventStore } from './storage.js';
import type {
  IndexedEvent,
  EventType,
  EventQuery,
  PaginatedEvents,
  IndexerConfig,
  ChainConfig,
} from './types.js';
import { ERC20_TRANSFER_ABI, UNISWAP_V2_SWAP_ABI, BRIDGE_DEPOSIT_ABI, BRIDGE_WITHDRAWAL_ABI } from './types.js';

// ---------------------------------------------------------------------------
// Event signatures
// ---------------------------------------------------------------------------

const TRANSFER_TOPIC = toEventHash({
  name: 'Transfer',
  type: 'event',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
});

const SWAP_TOPIC = toEventHash({
  name: 'Swap',
  type: 'event',
  inputs: [
    { name: 'sender', type: 'address', indexed: true },
    { name: 'amount0In', type: 'uint256', indexed: false },
    { name: 'amount1In', type: 'uint256', indexed: false },
    { name: 'amount0Out', type: 'uint256', indexed: false },
    { name: 'amount1Out', type: 'uint256', indexed: false },
    { name: 'to', type: 'address', indexed: true },
  ],
});

const DEPOSIT_TOPIC = toEventHash({
  name: 'Deposit',
  type: 'event',
  inputs: [
    { name: 'depositor', type: 'address', indexed: true },
    { name: 'recipient', type: 'address', indexed: false },
    { name: 'amount', type: 'uint256', indexed: false },
  ],
});

const WITHDRAWAL_TOPIC = toEventHash({
  name: 'Withdrawal',
  type: 'event',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: false },
    { name: 'amount', type: 'uint256', indexed: false },
  ],
});

/** Map of topic → event type. */
const TOPIC_TO_TYPE: Record<string, EventType> = {
  [TRANSFER_TOPIC.toLowerCase()]: 'transfer',
  [SWAP_TOPIC.toLowerCase()]: 'swap',
  [DEPOSIT_TOPIC.toLowerCase()]: 'deposit',
  [WITHDRAWAL_TOPIC.toLowerCase()]: 'withdrawal',
};

const ALL_TOPICS = Object.keys(TOPIC_TO_TYPE) as Hex[];

// ---------------------------------------------------------------------------
// Chain registry
// ---------------------------------------------------------------------------

const CHAIN_REGISTRY: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  56: bsc,
  42161: { id: 42161, name: 'Arbitrum One', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } } },
  10: { id: 10, name: 'Optimism', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://mainnet.optimism.io'] } } },
  8453: { id: 8453, name: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://mainnet.base.org'] } } },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique event ID. */
function eventId(chainId: number, txHash: Hash, logIndex: number): string {
  return `${chainId}-${txHash}-${logIndex}`;
}

/** Build a viem public client for a chain. */
function buildClient(chainId: number, rpcUrl: string) {
  const chain = CHAIN_REGISTRY[chainId] ?? {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as Chain;

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

// ---------------------------------------------------------------------------
// TxIndexer
// ---------------------------------------------------------------------------

export class TxIndexer {
  private store: EventStore;
  private config: IndexerConfig;
  private clients = new Map<number, ReturnType<typeof buildClient>>();
  private polling = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private _startTime = Date.now();

  /** Per-chain chain-state: { chainId: { latestBlock, name } } */
  private chainStates = new Map<number, { latestBlock: number; name: string }>();

  constructor(config: IndexerConfig) {
    this.config = config;
    this.store = new EventStore(config.dbPath);

    for (const chain of config.chains) {
      this.clients.set(chain.chainId, buildClient(chain.chainId, chain.rpcUrl));
    }
  }

  // -- Lifecycle ---------------------------------------------------------

  /** Start polling for new blocks across all configured chains. */
  async start(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    this._startTime = Date.now();
    console.log('[TxIndexer] Starting indexer for', this.config.chains.length, 'chain(s)');

    for (const chain of this.config.chains) {
      const client = this.clients.get(chain.chainId);
      if (!client) continue;

      const storedBlock = this.store.getLatestBlock(chain.chainId);
      this.chainStates.set(chain.chainId, {
        latestBlock: storedBlock,
        name: chain.name,
      });

      // Start polling for this chain
      this.pollChain(chain.chainId);
    }
  }

  /** Stop polling. */
  stop(): void {
    this.polling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[TxIndexer] Stopped');
  }

  /** Check if indexer is running. */
  isRunning(): boolean {
    return this.polling;
  }

  // -- Indexing ----------------------------------------------------------

  /** Poll a single chain for new blocks. */
  private async pollChain(chainId: number): Promise<void> {
    if (!this.polling) return;

    const chainConfig = this.config.chains.find((c) => c.chainId === chainId);
    if (!chainConfig) return;

    const interval = chainConfig.pollIntervalMs ?? 12_000;

    try {
      await this.indexChain(chainId);
    } catch (err) {
      console.error(`[TxIndexer] Error indexing chain ${chainId}:`, err);
    }

    // Schedule next poll
    if (this.polling) {
      this.pollTimer = setTimeout(() => this.pollChain(chainId), interval);
    }
  }

  /** Index events from the latest block back to the stored block for a chain. */
  async indexChain(chainId: number): Promise<number> {
    const client = this.clients.get(chainId);
    if (!client) return 0;

    const chainConfig = this.config.chains.find((c) => c.chainId === chainId)!;
    const batchSize = chainConfig.batchSize ?? 500;

    const storedBlock = this.store.getLatestBlock(chainId);
    const latestBlock = Number(await client.getBlockNumber());

    if (latestBlock <= storedBlock) {
      // Already up to date
      this.chainStates.set(chainId, {
        latestBlock,
        name: chainConfig.name,
      });
      return 0;
    }

    // Start from either storedBlock+1 or a reasonable start point
    let fromBlock = storedBlock > 0 ? storedBlock + 1 : chainConfig.startBlock ?? Math.max(1, latestBlock - 10_000);

    let totalIndexed = 0;

    // Process in batches
    while (fromBlock <= latestBlock) {
      const toBlock = Math.min(fromBlock + batchSize - 1, latestBlock);

      const events = await this.scanBlockRange(chainId, fromBlock, toBlock);
      if (events.length > 0) {
        this.store.saveEvents(events);
        totalIndexed += events.length;
      }

      this.store.updateChainState(chainId, toBlock);
      this.chainStates.set(chainId, { latestBlock: toBlock, name: chainConfig.name });

      fromBlock = toBlock + 1;
    }

    this.chainStates.set(chainId, { latestBlock, name: chainConfig.name });
    this.store.updateChainState(chainId, latestBlock);

    if (totalIndexed > 0) {
      console.log(
        `[TxIndexer] Chain ${chainId} (${chainConfig.name}): indexed ${totalIndexed} events (blocks ${storedBlock}→${latestBlock})`,
      );
    }

    return totalIndexed;
  }

  /** Scan a block range for indexed events. */
  private async scanBlockRange(chainId: number, fromBlock: number, toBlock: number): Promise<IndexedEvent[]> {
    const client = this.clients.get(chainId);
    if (!client) return [];

    const allEvents: IndexedEvent[] = [];
    for (const topic of ALL_TOPICS) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawLogs: RpcLog[] = await (client as any).request({
          method: 'eth_getLogs',
          params: [{
            fromBlock: `0x${BigInt(fromBlock).toString(16)}`,
            toBlock: `0x${BigInt(toBlock).toString(16)}`,
            topics: [topic],
          }],
        });

        // Convert raw RPC logs to viem Log format
        const viemLogs: Log[] = rawLogs.map((l) => ({
          address: l.address,
          blockHash: l.blockHash,
          blockNumber: l.blockNumber != null ? BigInt(l.blockNumber) : null,
          data: l.data,
          logIndex: l.logIndex != null ? Number(BigInt(l.logIndex)) : null,
          removed: l.removed,
          topics: l.topics,
          transactionHash: l.transactionHash,
          transactionIndex: l.transactionIndex != null ? Number(BigInt(l.transactionIndex)) : null,
        }));

        allEvents.push(...this.parseLogs(chainId, viemLogs));
      } catch {
        // Skip this topic on error
      }
    }
    return allEvents;
  }

  /** Parse raw logs into indexed events. */
  private parseLogs(chainId: number, logs: Log[]): IndexedEvent[] {
    const events: IndexedEvent[] = [];

    for (const log of logs) {
      const topic0 = log.topics?.[0]?.toLowerCase();
      if (!topic0 || !TOPIC_TO_TYPE[topic0]) continue;

      const eventType = TOPIC_TO_TYPE[topic0];
      const indexedEvent = this.parseLog(chainId, log, eventType);
      if (indexedEvent) events.push(indexedEvent);
    }

    return events;
  }

  /** Parse a single log into an IndexedEvent. */
  private parseLog(chainId: number, log: Log, eventType: EventType): IndexedEvent | null {
    const txHash = log.transactionHash;
    if (!txHash) return null; // skip if tx hash is missing
    const blockNum = log.blockNumber != null ? Number(log.blockNumber) : 0;
    const logIndex = log.logIndex != null ? Number(log.logIndex) : 0;
    const topic0 = log.topics?.[0]?.toLowerCase();
    const raw = log.data ?? '0x';

    // Try to get block timestamp (best effort)
    let timestamp = Date.now() / 1000;

    try {
      const client = this.clients.get(chainId);
      if (client && log.blockNumber) {
        // We'll cache timestamps; for now use current time as fallback
      }
    } catch {
      // Ignore
    }

    let fromAddress: Address = '0x0000000000000000000000000000000000000000';
    let toAddress: Address = '0x0000000000000000000000000000000000000000';
    let amount = 0n;
    let tokenAddress: Address | undefined = log.address;
    let decimals = 18;
    let symbol: string | undefined;
    let formattedAmount = '0';

    // Look up known token metadata
    const knownTokens = this.config.knownTokens?.[chainId]?.[log.address?.toLowerCase() ?? ''];
    if (knownTokens) {
      decimals = knownTokens.decimals;
      symbol = knownTokens.symbol;
    }

    if (topic0 === TRANSFER_TOPIC.toLowerCase()) {
      // ERC-20 Transfer: from (topic1), to (topic2), value (data)
      fromAddress = (log.topics?.[1] ?? '0x') as Address;
      toAddress = (log.topics?.[2] ?? '0x') as Address;

      try {
        amount = BigInt(raw);
        formattedAmount = symbol ? formatUnits(amount, decimals) : amount.toString();
      } catch {
        amount = 0n;
        formattedAmount = '0';
      }
    } else if (topic0 === SWAP_TOPIC.toLowerCase()) {
      // Uniswap V2 Swap: sender (topic1), to (topic2), amounts (data)
      fromAddress = (log.topics?.[1] ?? '0x') as Address;
      toAddress = (log.topics?.[2] ?? '0x') as Address;

      // For swaps, use the larger of the two output amounts
      try {
        const data = raw.slice(2).padStart(256, '0');
        const amount0In = BigInt('0x' + data.slice(0, 64));
        const amount1In = BigInt('0x' + data.slice(64, 128));
        const amount0Out = BigInt('0x' + data.slice(128, 192));
        const amount1Out = BigInt('0x' + data.slice(192, 256));
        amount = amount0In + amount1In + amount0Out + amount1Out;
        formattedAmount = amount.toString();
      } catch {
        amount = 0n;
      }
    } else if (topic0 === DEPOSIT_TOPIC.toLowerCase()) {
      // Deposit: depositor (topic1), recipient+amount (data)
      fromAddress = (log.topics?.[1] ?? '0x') as Address;
      try {
        amount = BigInt(raw);
        formattedAmount = amount.toString();
      } catch {
        amount = 0n;
      }
    } else if (topic0 === WITHDRAWAL_TOPIC.toLowerCase()) {
      // Withdrawal: from (topic1), to+amount (data)
      fromAddress = (log.topics?.[1] ?? '0x') as Address;
      try {
        amount = BigInt(raw);
        formattedAmount = amount.toString();
      } catch {
        amount = 0n;
      }
    }

    return {
      id: eventId(chainId, txHash, logIndex),
      chainId,
      eventType,
      blockNumber: blockNum,
      timestamp,
      transactionHash: txHash,
      logIndex,
      fromAddress,
      toAddress,
      tokenAddress,
      amount,
      formattedAmount,
      decimals,
      symbol,
      raw,
    };
  }

  // -- Query -------------------------------------------------------------

  /** Query indexed events with filters and pagination. */
  queryEvents(q: EventQuery = {}): PaginatedEvents {
    return this.store.queryEvents(q);
  }

  /** Get the latest indexed block for a chain. */
  getLatestIndexedBlock(chainId: number): number {
    return this.store.getLatestBlock(chainId);
  }

  /** Get chain sync states. */
  getChainStates(): { chainId: number; latestBlock: number; lastUpdated: number }[] {
    return this.store.getAllChainStates();
  }

  /** Get total event count. */
  getTotalEvents(): number {
    return this.store.getTotalEvents();
  }

  /** Get indexer uptime in ms. */
  getUptime(): number {
    return Date.now() - this._startTime;
  }

  /** Close the indexer and release resources. */
  close(): void {
    this.stop();
    this.store.close();
  }
}
