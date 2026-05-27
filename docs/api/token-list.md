# Token List API

> `@cinacoin/token-list` — 代币发现、元数据和验证。

## Installation

```bash
npm install @cinacoin/token-list
```

## Usage

```typescript
import { TokenList, CoinGeckoSource, TrustWalletSource } from '@cinacoin/token-list'

// Create token list
const tokenList = new TokenList({
  sources: [
    new CoinGeckoSource({ apiKey: 'your-api-key' }),
    new TrustWalletSource(),
  ],
})

// Search tokens
const tokens = await tokenList.search('ETH')

// Get token by address
const token = await tokenList.getToken('0x...', 1)

// Get popular tokens
const popular = await tokenList.getPopular(1, 50)

// Validate token
const valid = await tokenList.validate('0x...', 1)
```

## Caching

```typescript
import { LRUTokenCache } from '@cinacoin/token-list'

const cache = new LRUTokenCache({ maxSize: 1000, ttl: 300_000 })
```

## Error Handling

```typescript
try {
  const tokens = await tokenList.search('ETH')
} catch (err) {
  if (err.code === 'SOURCE_ERROR') { /* token source unavailable */ }
  if (err.code === 'NOT_FOUND') { /* token not found */ }
}
```

## See Also

- [Core SDK](./core-sdk.md)
