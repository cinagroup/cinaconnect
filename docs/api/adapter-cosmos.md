# Cosmos Adapter API

> `@cinacoin/adapter-cosmos` — Cosmos 生态系统链适配器。

## Installation

```bash
npm install @cinacoin/adapter-cosmos
```

## Usage

```typescript
import { CosmosAdapter, COSMOS_CHAINS, KeplrConnector, LeapConnector } from '@cinacoin/adapter-cosmos'

const cosmos = new CosmosAdapter({
  chainId: 'cosmoshub-4',
  rpcUrl: 'https://rpc.cosmos.network',
})

// Connect via Keplr
const keplr = new KeplrConnector()
const { address } = await cosmos.connect()

// IBC transfer
const tx = await cosmos.sendTransfer({
  to: 'cosmos1...',
  amount: 1000000,
  denom: 'uatom',
})
```

## Connectors

| Connector | Wallet |
|-----------|--------|
| `KeplrConnector` | Keplr Wallet |
| `LeapConnector` | Leap Wallet |

## Supported Chains

- Cosmos Hub (ATOM)
- Osmosis (OSMO)
- Injective (INJ)
- Celestia (TIA)

## Features

- IBC (Inter-Blockchain Communication) transaction signing
- Multi-chain Cosmos wallet connection
- CosmWasm contract interaction

## Error Handling

```typescript
try {
  const tx = await cosmos.sendTransfer({ to: 'cosmos1...', amount: 1000000, denom: 'uatom' })
} catch (err) {
  // Handle Cosmos-specific errors
}
```

## See Also

- [Core SDK](./core-sdk.md)
