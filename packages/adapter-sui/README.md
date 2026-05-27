# @cinacoin/adapter-sui

Sui chain adapter for Cinacoin — Sui Wallet, Ethos, Suiet, Martian connectors.

## Installation

```bash
npm install @cinacoin/adapter-sui
```

## Usage

```ts
import { SuiChainAdapter, SUI_CHAINS } from '@cinacoin/adapter-sui';

const adapter = new SuiChainAdapter();
await adapter.connect({ connectorId: 'suiet' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `SuiChainAdapter` | class | Main Sui chain adapter |
| `SUI_CHAINS` | const | Available Sui chain presets |
| `SUI_WALLETS` | const | Available Sui wallets list |
| `mistToSui` | function | Convert MIST to SUI |
| `suiToMist` | function | Convert SUI to MIST |
| `SuiWalletConnector` | class | Sui Wallet connector |
| `SuietConnector` | class | Suiet wallet connector |
| `EthosConnector` | class | Ethos wallet connector |
| `MartianConnector` | class | Martian wallet connector |
| `isValidSuiAddress` | function | Validate Sui address |
| `SuiNetwork` | type | Network type |
| `SuiTransactionCall` | type | Transaction call type |
