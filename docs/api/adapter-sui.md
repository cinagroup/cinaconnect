# Sui Adapter API

> `@cinacoin/adapter-sui` — Sui 链适配器。

## Installation

```bash
npm install @cinacoin/adapter-sui
```

## Usage

```typescript
import { SuiChainAdapter, SUI_CHAINS, SUI_WALLETS } from '@cinacoin/adapter-sui'
import { SuiWalletConnector } from '@cinacoin/adapter-sui'

const adapter = new SuiChainAdapter()
adapter.registerChains(SUI_CHAINS)

// Connect
const address = await adapter.connect()

// Query balance
const balance = await adapter.getBalance(address)

// Query a Sui object
const obj = await adapter.getObject('0x2::sui::SUI')
```

## Connectors

| Connector | Wallet |
|-----------|--------|
| `SuiWalletConnector` | Sui Wallet |
| `SuietConnector` | Suiet |
| `EthosConnector` | Ethos |
| `MartianConnector` | Martian |

## Utilities

```typescript
import { mistToSui, suiToMist, isValidSuiAddress } from '@cinacoin/adapter-sui'

// Convert units
const sui = mistToSui(1_000_000_000) // 1 SUI
const mist = suiToMist(1) // 1_000_000_000 MIST

// Validate address
isValidSuiAddress('0x...') // boolean
```

## See Also

- [Core SDK](./core-sdk.md)
