# @cinaconnect/wallet-recommender

CinaConnect Wallet Recommender — suggests optimal wallets based on user context.

## Installation

```bash
npm install @cinaconnect/wallet-recommender
```

## Usage

```ts
import { WalletRecommender } from '@cinaconnect/wallet-recommender';

const recommender = new WalletRecommender();
const wallets = recommender.recommend({
  chain: 'eip155:1',
  platform: 'mobile',
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `WalletRecommender` | class | Main recommender engine |
| `recommend` | function | Get wallet recommendations |
| `RecommenderConfig` | type | Configuration type |
| `RecommendationResult` | type | Result type |
| `RecommendationScore` | type | Score type |
