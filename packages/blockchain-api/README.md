# @cinacoin/blockchain-api

Managed Blockchain API (ENS, balance history, tx lookup) for Cinacoin.

## Installation

```bash
npm install @cinacoin/blockchain-api
```

## Usage

```ts
import { BlockchainApiClient } from '@cinacoin/blockchain-api';

const client = createBlockchainApi({ apiKey: 'YOUR_API_KEY' });
const balance = await client.getBalance('0x...');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `BlockchainApiClient` | class | Main API client |
| `createBlockchainApi` | function | Factory for API client |
| `Balance` | type | Balance data type |
| `Transaction` | type | Transaction data type |
| `TokenMetadata` | type | Token metadata type |
| `PaginatedResult` | type | Paginated response type |
