# Cross-Chain Sync API

> `@cinacoin/cross-chain-sync` — 跨链账户状态和身份同步。

## Installation

```bash
npm install @cinacoin/cross-chain-sync
```

## Usage

```typescript
import { StateSync, CrossChainIdentityManager, InMemoryStorage } from '@cinacoin/cross-chain-sync'
import { syncEvmState, syncSolanaState, syncBitcoinState } from '@cinacoin/cross-chain-sync'

const storage = new InMemoryStorage()
const sync = new StateSync(storage)

// Register EVM adapter
sync.registerAdapter('evm', async () => {
  return syncEvmState({
    chain: 'evm',
    chainId: 1,
    address: '0x...',
    addedAt: Date.now(),
  }, storage)
})

// Sync across chains
const result = await sync.syncAll()
```

## Identity Management

```typescript
import {
  generateIdentityHash,
  verifyLinkingProof,
  createLinkingProof,
} from '@cinacoin/cross-chain-sync'

// Generate unified identity hash
const hash = generateIdentityHash({
  evm: '0x...',
  solana: 'So1111...',
  bitcoin: 'bc1q...',
})

// Create linking proof
const proof = await createLinkingProof(addressA, addressB, provider)

// Verify linking proof
const valid = await verifyLinkingProof(proof)
```

## Storage

```typescript
import { InMemoryStorage, LocalStorage } from '@cinacoin/cross-chain-sync'

// In-memory (testing)
const memory = new InMemoryStorage()

// Browser localStorage
const local = new LocalStorage()
```

## See Also

- [Core SDK](./core-sdk.md)
