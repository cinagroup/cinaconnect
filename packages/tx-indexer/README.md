# @cinacoin/tx-indexer

Lightweight transaction history indexer for EVM chains. Scans on-chain events (Transfer, Swap, Deposit, Withdrawal), stores them to SQLite, and serves them via a REST API.

## Features

- **Multi-chain**: Ethereum, Polygon, BSC out of the box; Arbitrum, Optimism, Base also supported
- **Event types**: ERC-20 Transfer, Uniswap V2 Swap, bridge Deposit/Withdrawal
- **SQLite persistence**: Embedded, zero-config storage with WAL mode
- **REST API**: Query by address, chain, event type, time range, pagination
- **Configurable polling**: Adjustable block batch size, poll interval, start block

## Installation

```bash
npm install @cinacoin/tx-indexer
```

## Usage

### Library

```ts
import { TxIndexer } from '@cinacoin/tx-indexer';

const indexer = new TxIndexer({
  dbPath: './indexer.db',
  chains: [
    { chainId: 1, name: 'Ethereum', rpcUrl: process.env.ETH_RPC_URL! },
    { chainId: 137, name: 'Polygon', rpcUrl: process.env.POLYGON_RPC_URL! },
    { chainId: 56, name: 'BSC', rpcUrl: process.env.BSC_RPC_URL! },
  ],
  autoStart: true,
});

await indexer.start();

// Query events
const result = indexer.queryEvents({
  address: '0x...',
  chainId: 1,
  limit: 20,
  offset: 0,
});

console.log(result.events, result.total, result.hasMore);
```

### REST API Server

```ts
import { createIndexerServer } from '@cinacoin/tx-indexer';

const server = await createIndexerServer(
  {
    dbPath: './indexer.db',
    chains: [
      { chainId: 1, name: 'Ethereum', rpcUrl: process.env.ETH_RPC_URL! },
    ],
  },
  { port: 3456, basePath: '/api/v1' },
);

// GET /api/v1/events?address=0x...&chainId=1&limit=50
// GET /api/v1/health
// GET /api/v1/events/{id}
// GET /api/v1/chains
```

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Indexer health and sync status |
| GET | `/api/v1/events` | Query events (paginated) |
| GET | `/api/v1/events/{id}` | Get single event by ID |
| GET | `/api/v1/chains` | List chain sync states |

### Query Parameters for `/events`

| Param | Type | Description |
|-------|------|-------------|
| `address` | string | Wallet address (from or to) |
| `chainId` | number | Chain ID filter |
| `eventType` | string | `transfer`, `swap`, `deposit`, `withdrawal` |
| `tokenAddress` | string | Token contract address |
| `timeFrom` | number | Unix timestamp (inclusive) |
| `timeTo` | number | Unix timestamp (inclusive) |
| `limit` | number | Page size (default 50, max 200) |
| `offset` | number | Offset for pagination |
| `sortOrder` | string | `desc` (default) or `asc` |

## Supported Chains

| Chain | Chain ID |
|-------|----------|
| Ethereum | 1 |
| Polygon | 137 |
| BSC | 56 |
| Arbitrum One | 42161 |
| Optimism | 10 |
| Base | 8453 |

## Development

```bash
pnpm build
pnpm test
pnpm test:watch
```

## License

MIT
