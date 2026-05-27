# Bitcoin Adapter API

> `@cinacoin/adapter-bitcoin` — 原生比特币钱包连接器。

## Installation

```bash
npm install @cinacoin/adapter-bitcoin
```

## Usage

```typescript
import { BitcoinChainAdapter, BITCOIN_CHAINS, BITCOIN_WALLETS } from '@cinacoin/adapter-bitcoin'
import { UnisatConnector } from '@cinacoin/adapter-bitcoin/connectors/unisat'

const adapter = new BitcoinChainAdapter()
adapter.registerChains(BITCOIN_CHAINS)

// Connect via connector
const unisat = new UnisatConnector()
if (unisat.isAvailable()) {
  const result = await unisat.connect()
  console.log('Connected:', result.address)
}

// Send transfer
const tx = await adapter.sendTransfer({
  to: 'bc1q...',
  amount: 10000, // satoshis
})
```

## Connectors

| Connector | Wallet | Description |
|-----------|--------|-------------|
| `UnisatConnector` | Unisat | Most popular Bitcoin wallet |
| `LeatherConnector` | Leather | Formerly Stacks Wallet |
| `OKXConnector` | OKX Wallet | OKX multi-chain wallet |
| `SatsConnectConnector` | SatsConnect | SatsConnect protocol |
| `XverseConnector` | Xverse | Xverse wallet |
| `WalletStandardConnector` | Wallet Standard | Wallet Standard protocol |

## Features

- Full Ordinals and BRC-20 support
- Cross-namespace wallet discovery (EIP-6963)
- PSBT (Partially Signed Bitcoin Transaction) signing
- Multiple address formats (legacy, segwit, taproot)

## Error Handling

Bitcoin adapter throws `BitcoinAdapterError` for network and signing failures:

```typescript
try {
  const tx = await adapter.sendTransfer({ to: 'bc1q...', amount: 10000 })
} catch (err) {
  if (err.code === 'INSUFFICIENT_FUNDS') { /* ... */ }
  if (err.code === 'USER_REJECTED') { /* ... */ }
}
```

## See Also

- [Core SDK](./core-sdk.md)
- [Multi-chain](../examples/multi-chain.md)
