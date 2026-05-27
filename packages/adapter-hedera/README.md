# @cinacoin/adapter-hedera

Hedera Hashgraph chain adapter for Cinacoin — Blade Wallet, HashPack, Kantara Wallet.

## Installation

```bash
npm install @cinacoin/adapter-hedera
```

## Usage

```ts
import { HederaAdapter } from '@cinacoin/adapter-hedera';

const adapter = new HederaAdapter();
await adapter.connect({ connectorId: 'hashpack' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `HederaAdapter` | class | Main Hedera chain adapter |
| `announceHederaProviders` | function | Announce Hedera providers via EIP-6963 |
| `HashPackConnector` | class | HashPack wallet connector |
| `BladeWalletConnector` | class | Blade Wallet connector |
| `KantaraWalletConnector` | class | Kantara Wallet connector |
| `HederaNetwork` | type | Network type |
| `HederaConnector` | type | Connector interface |
| `HbarTransferParams` | type | HBAR transfer parameters |
| `TokenTransferParams` | type | Token transfer parameters |
| `ContractCallParams` | type | Smart contract call parameters |
