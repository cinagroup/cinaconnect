# Wallet Recommender API

> `@cinacoin/wallet-recommender` — 智能钱包推荐引擎。

## Installation

```bash
npm install @cinacoin/wallet-recommender
```

## Usage

```typescript
import { WalletRecommender, scoreWallet, getChainCompatibleWallets } from '@cinacoin/wallet-recommender'

const recommender = new WalletRecommender({
  targetChain: 'evm',
  platform: 'browser',
})

recommender.registerWallets(wallets)
const top = recommender.recommend(3)

console.log('Recommended wallets:', top)
```

## Scoring

```typescript
import { scoreWallet, DEFAULT_WEIGHTS } from '@cinacoin/wallet-recommender'

const score = scoreWallet(wallet, {
  chain: 'eip155:1',
  platform: 'browser',
  weights: {
    ...DEFAULT_WEIGHTS,
    brandRecognition: 0.3,
    security: 0.3,
    ux: 0.2,
    chainCompatibility: 0.2,
  },
})
```

## Get Compatible Wallets

```typescript
import { getChainCompatibleWallets } from '@cinacoin/wallet-recommender'

const wallets = getChainCompatibleWallets('eip155:1')
```

## See Also

- [Explorer](./explorer.md)
