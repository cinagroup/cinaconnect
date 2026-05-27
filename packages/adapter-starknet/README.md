# @cinacoin/adapter-starknet

Cinacoin Starknet chain adapter — Argent X, Braavos wallet support with native account abstraction.

## Installation

```bash
npm install @cinacoin/adapter-starknet
```

## Usage

```ts
import { StarknetChainAdapter } from '@cinacoin/adapter-starknet';

const adapter = new StarknetChainAdapter();
await adapter.connect({ connectorId: 'argent-x' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `StarknetChainAdapter` | class | Main Starknet chain adapter |
| `ArgentXConnector` | class | Argent X wallet connector |
| `BraavosConnector` | class | Braavos wallet connector |
| `STARKNET_CHAINS` | const | Available Starknet chain presets |
| `STARKNET_WALLETS` | const | Available Starknet wallets list |
| `StarknetWalletInfo` | type | Wallet metadata type |
| `StarknetCall` | type | Contract call type |
| `StarknetTransaction` | type | Transaction type |
| `StarknetConnectParams` | type | Connection parameters |
