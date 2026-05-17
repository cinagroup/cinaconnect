# @cinaconnect/adapter-near

CinaConnect NEAR chain adapter — NEAR Wallet, Here Wallet, Meteor Wallet support.

## Installation

```bash
npm install @cinaconnect/adapter-near
```

## Usage

```ts
import { NearChainAdapter } from '@cinaconnect/adapter-near';

const adapter = new NearChainAdapter();
await adapter.connect({ connectorId: 'near-wallet' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `NearChainAdapter` | class | Main NEAR chain adapter |
| `NearWalletConnector` | class | NEAR Wallet connector |
| `HereWalletConnector` | class | Here Wallet connector |
| `NEAR_CHAINS` | const | Available NEAR chain presets |
| `NEAR_WALLETS` | const | Available NEAR wallets list |
| `NearWalletInfo` | type | Wallet metadata type |
| `NearTransaction` | type | Transaction type |
| `NearFunctionCall` | type | Function call type |
| `NearTransferAction` | type | Transfer action type |
