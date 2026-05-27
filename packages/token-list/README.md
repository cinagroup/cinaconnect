# @cinacoin/token-list

Token discovery, metadata management, and validation for the Cinacoin ecosystem.

## Installation

```bash
npm install @cinacoin/token-list
```

## Usage

### Basic Token List

```ts
import { TokenList, CoinGeckoSource, TrustWalletSource, LocalSource } from '@cinacoin/token-list';

// Create a token list with multiple sources
const list = new TokenList({
  sources: [
    new CoinGeckoSource(),
    new LocalSource({
      tokens: [
        {
          address: '0x123...',
          chainId: 1,
          name: 'My Token',
          symbol: 'MTK',
          decimals: 18,
        },
      ],
    }),
  ],
});

// Fetch all tokens
const tokens = await list.fetchAll();

// Search
const results = list.search('ETH');

// Filter
const stablecoins = list.filter({ tags: ['stablecoin'] });
const ethTokens = list.filter({ chainId: 1 });

// Validate
const validation = list.validateToken(tokens[0]);
```

### Custom Token Source

```ts
import type { TokenSource } from '@cinacoin/token-list';

const mySource: TokenSource = {
  name: 'my-source',
  async fetch() {
    // Fetch tokens from your API
    return [/* TokenInfo[] */];
  },
};

list.addSource(mySource);
```

## API

### TokenList

| Method | Description |
|--------|-------------|
| `addAllSources()` | Fetch from all registered sources |
| `search(query, options?)` | Search by symbol, name, or address |
| `filter(options)` | Filter by chainId, tags, address, symbol |
| `validateToken(token)` | Validate a token against schema rules |
| `getToken(address, chainId)` | Get a single token |
| `clear()` | Clear cache and token map |

### Sources

- **CoinGeckoSource** — Fetches from CoinGecko API (supports API key)
- **TrustWalletSource** — Fetches from trustwallet/assets GitHub
- **LocalSource** — Static custom token list with add/remove/merge

## License

MIT
