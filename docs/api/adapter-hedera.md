# Hedera Adapter API

> `@cinacoin/adapter-hedera` — Hedera Hashgraph 链适配器。

## Installation

```bash
npm install @cinacoin/adapter-hedera
```

## Usage

```typescript
import { HederaAdapter, HashPackConnector } from '@cinacoin/adapter-hedera'

// Announce providers for EIP-6963 discovery
import { announceHederaProviders } from '@cinacoin/adapter-hedera'
announceHederaProviders()

const adapter = new HederaAdapter()
const result = await adapter.connect({ connectorId: 'hashpack' })

// Transfer HBAR
const { transactionId } = await adapter.transferHbar({
  recipient: '0.0.12345',
  amount: '100000000', // 1 HBAR in tinybar
})
```

## Connectors

| Connector | Wallet |
|-----------|--------|
| `HashPackConnector` | HashPack |
| `BladeWalletConnector` | Blade Wallet |
| `KantaraWalletConnector` | Kantara Wallet |

## Features

- HBAR transaction signing and token operations
- HIP-compliant wallet connectors
- Contract call support

## See Also

- [Core SDK](./core-sdk.md)
