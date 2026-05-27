# @cinacoin/swap-sdk

Cinacoin Swap Aggregator SDK — multi-DEX token swap with best-rate routing.

## Installation

```bash
npm install @cinacoin/swap-sdk
```

## Usage

```ts
import { SwapAggregator } from '@cinacoin/swap-sdk';

const aggregator = new SwapAggregator();
const quote = await aggregator.getBestRoute({
  fromToken: 'ETH',
  toToken: 'USDC',
  amount: '1.0',
  slippage: 0.5,
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `SwapAggregator` | class | Main swap aggregator |
| `RouteFinder` | class | Finds best swap routes |
| `QuoteCache` | class | Quote caching layer |
| `getBestRoute` | function | Find optimal swap route |
| `executeSwap` | function | Execute a swap transaction |
| `SwapQuote` | type | Quote type |
| `SwapRoute` | type | Route type |
| `SwapConfig` | type | Configuration type |
| `SlippageConfig` | type | Slippage settings type |
