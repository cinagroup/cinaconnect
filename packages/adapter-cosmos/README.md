# @cinacoin/adapter-cosmos

Cosmos ecosystem chain adapter for Cinacoin — Keplr, Leap, Cosmos SDK chains.

## Installation

```bash
npm install @cinacoin/adapter-cosmos
```

## Usage

```ts
import { CosmosAdapter } from '@cinacoin/adapter-cosmos';

const adapter = new CosmosAdapter({
  projectId: 'YOUR_PROJECT_ID',
});

await adapter.connect({ connectorId: 'keplr' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CosmosAdapter` | class | Main Cosmos chain adapter |
| `KeplrConnector` | class | Keplr wallet connector |
| `LeapConnector` | class | Leap wallet connector |
| `CosmosAdapterConfig` | type | Adapter configuration type |
| `CosmosConnectResult` | type | Connection result type |
| `COSMOS_CHAINS` | const | Available Cosmos chain presets |
| `COSMOS_CHAIN_INFO` | const | Chain info map |
| `CosmosChainId` | type | Chain ID type alias |
| `CosmosTransaction` | type | Transaction type |
| `TransferParams` | type | Token transfer parameters |
