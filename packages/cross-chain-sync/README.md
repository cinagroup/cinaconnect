# @cinacoin/cross-chain-sync

Cinacoin Cross-Chain Account Sync — unified state and identity across EVM/Solana/BTC/TON/TRON/Polkadot.

## Installation

```bash
npm install @cinacoin/cross-chain-sync
```

## Usage

```ts
import { StateSync, CrossChainIdentityManager } from '@cinacoin/cross-chain-sync';

const sync = new StateSync();
await sync.syncAll();
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `StateSync` | class | Main cross-chain state sync engine |
| `CrossChainIdentityManager` | class | Unified identity manager |
| `generateIdentityHash` | function | Generate cross-chain identity hash |
| `verifyLinkingProof` | function | Verify a linking proof |
| `createLinkingProof` | function | Create a linking proof |
| `syncEvmState` | function | Sync EVM chain state |
| `syncSolanaState` | function | Sync Solana state |
| `syncBitcoinState` | function | Sync Bitcoin state |
| `ChainAccount` | type | Chain account type |
| `SyncResult` | type | Sync result type |
| `LinkingProof` | type | Linking proof type |
