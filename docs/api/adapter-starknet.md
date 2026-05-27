# Starknet Adapter API

> `@cinacoin/adapter-starknet` — Starknet 链适配器，原生账户抽象支持。

## Installation

```bash
npm install @cinacoin/adapter-starknet
```

## Usage

```typescript
import { StarknetChainAdapter, STARKNET_CHAINS, ArgentXConnector, BraavosConnector } from '@cinacoin/adapter-starknet'

const adapter = new StarknetChainAdapter()
adapter.registerChains(STARKNET_CHAINS)

// Connect via Argent X
const argent = new ArgentXConnector()
if (argent.isAvailable()) {
  const result = await argent.connect()
  console.log('Connected:', result.address)
}

// Execute Starknet call
const result = await adapter.executeCall({
  contractAddress: '0x...',
  entrypoint: 'transfer',
  calldata: ['0x...', '1000'],
})
```

## Connectors

| Connector | Wallet |
|-----------|--------|
| `ArgentXConnector` | Argent X |
| `BraavosConnector` | Braavos |

## Features

- Native account abstraction integration (Starknet uses AA by default)
- Cairo contract interaction support
- Starknet-specific transaction building

## See Also

- [Core SDK](./core-sdk.md)
