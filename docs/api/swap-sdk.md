# Swap SDK API

> `@cinacoin/swap-sdk` — Multi-DEX swap routing with slippage protection.

## Overview

The Swap SDK aggregates quotes from multiple DEX providers (Uniswap, 1inch, 0x) and selects the best route for token swaps. It handles slippage protection, price impact calculation, and transaction encoding.

## Installation

```bash
npm install @cinacoin/swap-sdk
```

## Quick Start

```typescript
import {
  SwapQuoter,
  SwapRouter,
  UniswapExecutor,
  OneInchExecutor,
  ZeroxExecutor,
} from '@cinacoin/swap-sdk'

// Set up executors
const executors = [
  new UniswapExecutor({ rpcUrl: 'https://eth-rpc.example.com' }),
  new OneInchExecutor(process.env.ONEINCH_API_KEY),
  new ZeroxExecutor(process.env.ZEROX_API_KEY),
]

// Create quoter + router
const quoter = new SwapQuoter(executors, {
  quoteTimeoutMs: 5000,
  defaultSlippageBps: 50,
  enablePriceImpactCheck: true,
})

const router = new SwapRouter(quoter)
router.setExecutionEnabled(true)

// Get the best quote
const best = await router.getBestQuote({
  fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',  // WETH
  fromAmount: 1_000n * 10n ** 6n, // 1,000 USDC
  chainId: 1,
  slippageBps: 50, // 0.5%
})

console.log(`Best: ${best.quote.provider} → ${best.quote.toAmount}`)
```

## Core Classes

### SwapQuoter

Fetches quotes from all configured DEX executors concurrently and returns the best one.

```typescript
import { SwapQuoter } from '@cinacoin/swap-sdk'

const quoter = new SwapQuoter(executors, config?: Partial<QuoterConfig>)
```

#### QuoterConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `quoteTimeoutMs` | `number` | `5000` | Max time to wait for each quote (ms) |
| `defaultSlippageBps` | `number` | `50` | Default slippage tolerance in basis points |
| `enablePriceImpactCheck` | `boolean` | `true` | Whether to calculate price impact |
| `minOutputThreshold` | `bigint` | `0n` | Minimum output amount to consider valid |

#### Methods

##### `getBestQuote(params: SwapQuoteParams): Promise<BestQuote>`

Fetch quotes from all providers and return the best one sorted by output amount.

```typescript
const best = await quoter.getBestQuote({
  fromToken: '0x...',
  toToken: '0x...',
  fromAmount: 1000000000000000000n,
  chainId: 1,
  slippageBps: 50,
})
```

##### `getQuoteFrom(provider: string, params: SwapQuoteParams): Promise<SwapQuote>`

Get a quote from a specific provider.

```typescript
const uniswapQuote = await quoter.getQuoteFrom('Uniswap', params)
```

##### `getAvailableProviders(): string[]`

List all registered executor names.

##### `addExecutor(executor: SwapExecutor): void`

Add a new executor at runtime.

##### `removeExecutor(name: string): void`

Remove an executor by name.

### SwapRouter

Manages executor lifecycle, caches quotes, and provides swap execution.

```typescript
import { SwapRouter } from '@cinacoin/swap-sdk'

const router = new SwapRouter(quoter)
```

#### Methods

##### `getBestQuote(params: SwapQuoteParams): Promise<BestQuote>`

Delegate to the quoter to find the best price.

##### `compareQuotes(params: SwapQuoteParams): Promise<SwapQuote[]>`

Return all quotes for comparison.

##### `setExecutionEnabled(enabled: boolean): void`

Enable or disable swap execution (dry-run mode).

##### `executeSwap(params: SwapQuoteParams, executeParams?: Partial<SwapExecuteParams>): Promise<SwapReceipt>`

Execute a swap using the best available quote.

```typescript
const receipt = await router.executeSwap(
  {
    fromToken: '0x...',
    toToken: '0x...',
    fromAmount: 1000000000000000000n,
    chainId: 1,
    slippageBps: 50,
  },
  {
    slippageBps: 30,        // override slippage
    maxGasPrice: 50000000n, // max 50 gwei
    timeoutMs: 60000,       // 60s timeout
  }
)
```

##### `getSupportedTokens(chainId: number): Promise<TokenInfo[]>`

Get supported tokens from all providers for a chain.

##### `getPriceImpact(params: SwapQuoteParams): Promise<number>`

Calculate the price impact for a given swap.

### SwapExecutor (Interface)

All DEX executors must implement this interface.

```typescript
interface SwapExecutor {
  name: string
  isAvailable(): Promise<boolean>
  getQuote(params: SwapQuoteParams): Promise<SwapQuote>
  getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction>
  getSupportedTokens(chainId: number): Promise<TokenInfo[]>
}
```

### Built-in Executors

#### UniswapExecutor

Direct integration with Uniswap V2/V3 pools.

```typescript
import { UniswapExecutor } from '@cinacoin/swap-sdk'

const executor = new UniswapExecutor({
  rpcUrl: 'https://eth-rpc.example.com',
  version: 'v3', // 'v2' or 'v3'
})
```

#### OneInchExecutor

Uses the 1inch Aggregation API.

```typescript
import { OneInchExecutor } from '@cinacoin/swap-sdk'

const executor = new OneInchExecutor(process.env.ONEINCH_API_KEY)
```

#### ZeroxExecutor

Uses the 0x Protocol API.

```typescript
import { ZeroxExecutor } from '@cinacoin/swap-sdk'

const executor = new ZeroxExecutor(process.env.ZEROX_API_KEY)
```

## Types

### SwapQuoteParams

```typescript
interface SwapQuoteParams {
  fromToken: Address | 'native'      // Source token address
  toToken: Address | 'native'        // Destination token address
  fromAmount: bigint                  // Input amount (in smallest unit)
  chainId: number                     // Target chain ID
  slippageBps: number                 // Max slippage in basis points (50 = 0.5%)
  recipient?: Address                 // Optional recipient (defaults to sender)
  feeRecipient?: Address              // Fee recipient address
  feeBps?: number                     // Protocol fee in basis points
}
```

### SwapQuote

```typescript
interface SwapQuote {
  id: string                          // Unique quote ID
  fromToken: Address | 'native'
  toToken: Address | 'native'
  fromAmount: bigint
  toAmount: bigint                    // Expected output
  priceImpact: number                 // Price impact percentage (0-100)
  route: SwapRoute[]                  // Route hops
  gasEstimate: bigint                 // Total estimated gas
  minimumReceived: bigint             // Min amount after slippage
  provider: string                    // Source DEX
  expiresAt: number                   // Unix timestamp
  tx?: SwapTransaction                // Encoded transaction data
}
```

### BestQuote

```typescript
interface BestQuote {
  quote: SwapQuote                    // The best individual quote
  allQuotes: SwapQuote[]              // All quotes (for comparison)
  savingsVsSecond: bigint             // Savings vs second-best option
}
```

### SwapReceipt

```typescript
interface SwapReceipt {
  txHash: `0x${string}`               // Transaction hash
  quoteId: string                     // Executed quote ID
  fromAmount: bigint                  // Actual input
  toAmount: bigint                    // Actual output received
  gasUsed: bigint
  gasPrice: bigint
  blockNumber: bigint
  success: boolean
}
```

### SwapRoute

```typescript
interface SwapRoute {
  protocol: string                    // DEX/protocol name
  fromToken: Address | 'native'
  toToken: Address | 'native'
  fromAmount: bigint
  toAmount: bigint
  gasEstimate: bigint
}
```

### TokenInfo

```typescript
interface TokenInfo {
  address: Address
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  isDefault?: boolean
}
```

### PriceImpact

```typescript
interface PriceImpact {
  percentage: number                  // Impact percentage (0-100)
  severity: 'low' | 'medium' | 'high' | 'critical'
  warning?: string                    // Warning message if applicable
}
```

## Slippage Utilities

```typescript
import {
  calculateMinimumReceived,
  calculatePriceImpact,
  classifyPriceImpact,
  getImpactWarning,
  isPriceImpactAcceptable,
  getExchangeRate,
  percentDiff,
  adjustSlippageForVolatility,
} from '@cinacoin/swap-sdk'
```

### `calculateMinimumReceived(toAmount: bigint, slippageBps: number): bigint`

Calculate the minimum output amount after slippage.

```typescript
const minReceived = calculateMinimumReceived(1_000000000000000000n, 50)
// With 0.5% slippage: 995000000000000000
```

### `calculatePriceImpact(fromAmount: bigint, toAmount: bigint, midPrice: bigint): number`

Calculate the price impact percentage.

### `classifyPriceImpact(impact: number): PriceImpact`

Classify price impact severity.

| Severity | Range |
|----------|-------|
| `low` | < 1% |
| `medium` | 1% – 3% |
| `high` | 3% – 5% |
| `critical` | > 5% |

### `isPriceImpactAcceptable(impact: number, maxAcceptable: number): boolean`

Check if price impact is within acceptable range.

## Error Handling

The quoter handles individual executor failures gracefully — if one provider fails, others still return quotes.

```typescript
try {
  const best = await quoter.getBestQuote(params)
  // Use the best quote
} catch (error) {
  if (error.message === 'No valid swap quotes available') {
    // No providers returned valid quotes
  }
}
```

Common errors:

| Error | Cause |
|-------|-------|
| `No valid swap quotes available` | All providers failed or returned zero output |
| `Unknown provider: X` | Requested provider not registered |
| `Quote has expired` | Quote TTL exceeded before execution |
| `Swap execution is disabled` | `setExecutionEnabled(false)` |

## Architecture

```
┌─────────────────────────────────────────────┐
│                SwapRouter                    │
│  ┌───────────┐  ┌───────────────────────┐   │
│  │ Execution │  │    SwapQuoter         │   │
│  │  Control  │  │  ┌─────┐ ┌─────┐ ┌──┐ │   │
│  └─────┬─────┘  │  │Uni  │ │1inch│ │0x│ │   │
│        │        │  │swap │ │Exec │ │Ex│ │   │
│        ▼        │  └─────┘ └─────┘ └──┘ │   │
│   SwapReceipt   │     SwapExecutor[]     │   │
└─────────────────┴────────────────────────┘   │
              │                                │
              ▼                                │
     On-chain execution                         │
```
