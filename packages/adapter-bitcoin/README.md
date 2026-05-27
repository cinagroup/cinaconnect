# @cinacoin/adapter-bitcoin

Native Bitcoin wallet connectors for Cinacoin — Unisat, Leather, OKX, SatsConnect, Xverse, Wallet Standard.

## Installation

```bash
npm install @cinacoin/adapter-bitcoin
```

## Usage

```ts
import { BitcoinAdapter } from '@cinacoin/adapter-bitcoin';

const adapter = new BitcoinAdapter({
  networks: ['mainnet', 'testnet'],
});

await adapter.connect({ connectorId: 'unisat' });
```

## API Reference

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `BitcoinAdapter` | class | Main adapter for Bitcoin wallet connections |
| `UnisatConnector` | class | Unisat wallet connector |
| `LeatherConnector` | class | Leather wallet connector |
| `SatsConnectConnector` | class | SatsConnect protocol connector |
| `XverseConnector` | class | Xverse wallet connector |
| `OKXConnector` | class | OKX Bitcoin wallet connector |
| `WalletStandardConnector` | class | Wallet Standard connector |
| `BitcoinChainPreset` | type | Bitcoin chain configuration preset |
| `BitcoinConnectorEvents` | type | Event types for Bitcoin connectors |
| `BitcoinConnectionResult` | type | Connection result type |
| `BitcoinProvider` | type | Bitcoin provider detail type |
