# XRP Ledger Adapter API

> `@cinacoin/adapter-xrpl` — XRP Ledger 链适配器。

## Installation

```bash
npm install @cinacoin/adapter-xrpl
```

## Usage

```typescript
import { XrplAdapter, XamanConnector } from '@cinacoin/adapter-xrpl'

// Announce providers for EIP-6963 discovery
import { announceXrplProviders } from '@cinacoin/adapter-xrpl'
announceXrplProviders()

const adapter = new XrplAdapter()
const result = await adapter.connect({ connectorId: 'xaman' })

// Send XRP
const { transactionHash } = await adapter.sendXRP({
  destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDH',
  amount: '1000000', // in drops
})
```

## Connectors

| Connector | Wallet |
|-----------|--------|
| `XamanConnector` | Xaman (formerly Xumm) |

## Features

- XRP transaction signing and XRPL token operations
- Multisig wallet support
- NFT minting and burning on XRPL

## See Also

- [Core SDK](./core-sdk.md)
