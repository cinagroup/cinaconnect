# Swap SDK API Documentation

> Generated API reference for `@cinacoin/swap-sdk`.

## Overview

The Swap SDK provides a cross-DEX swap aggregation engine that finds the best price across multiple DEX providers. It supports multi-chain swaps with automatic slippage management and MEV protection.

## Installation

```bash
npm install @cinacoin/swap-sdk viem
```

## Core Classes

### `SwapQuoter`

The main entry point for finding optimal swap routes.

```typescript
import { SwapQuoter } from '@cinacoin/swap-sdk'

const quoter = new SwapQuoter({
  chainId: 1,
  providers: ['uniswap-v3', 'sushiswap', '1inch'],
  slippage: 0.005, // 0.5%
})
```

#### Constructor Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `chainId` | `number` | ✅ | — | Target chain ID |
| `providers` | `string[]` | ✅ | — | DEX providers to query |
| `slippage` | `number` | ❌ | `0.01` | Max slippage tolerance (decimal) |
| `timeoutMs` | `number` | ❌ | `5000` | Timeout per provider query |
| `publicClient` | `PublicClient` | ❌ | `null` | Viem public client |

#### Methods

##### `getBestQuote(input: SwapQuoteInput): Promise<SwapQuoteResult>`

Fetches quotes from all configured providers in parallel and returns the best one.

```typescript
const quote = await quoter.getBestQuote({
  tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  amountIn: BigInt(1e18), // 1 WETH
})

console.log(quote.bestProvider)    // "uniswap-v3"
console.log(quote.amountOut)       // BigInt amount
console.log(quote.priceImpact)     // 0.0012 (0.12%)
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenIn` | `Address` | ✅ | Input token contract address |
| `tokenOut` | `Address` | ✅ | Output token contract address |
| `amountIn` | `bigint` | ✅ | Input amount in wei |
| `amountOut` | `bigint` | ❌ | For exact-out swaps |
| `recipient` | `Address` | ❌ | Recipient address (defaults to caller) |

**Returns:** `SwapQuoteResult` with the best available quote.

##### `addExecutor(provider: string, executor: Executor): void`

Register a custom DEX executor.

```typescript
quoter.addExecutor('my-dex', new MyDexExecutor())
```

##### `removeExecutor(provider: string): boolean`

Remove a DEX executor. Returns `true` if found and removed.

##### `quoteAll(input: SwapQuoteInput): Promise<QuoteComparison[]>`

Returns quotes from all providers for comparison.

```typescript
const allQuotes = await quoter.quoteAll({ tokenIn, tokenOut, amountIn })
allQuotes.forEach(q => console.log(q.provider, q.amountOut, q.priceImpact))
```

### `SwapExecutor`

Executes approved swap transactions.

```typescript
import { SwapExecutor } from '@cinacoin/swap-sdk'

const executor = new SwapExecutor({
  chainId: 1,
  publicClient,
  walletClient,
})

const txHash = await executor.execute(quote, {
  slippage: 0.005,
  deadline: Math.floor(Date.now() / 1000) + 300, // 5 min
})
```

#### Methods

##### `execute(quote: SwapQuoteResult, options: ExecutionOptions): Promise<Hash>`

Execute a swap transaction using the provided quote.

**ExecutionOptions:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `slippage` | `number` | ❌ | `0.01` | Max slippage |
| `deadline` | `number` | ❌ | `now + 300` | Transaction deadline (Unix timestamp) |
| `gasLimit` | `bigint` | ❌ | `auto` | Gas limit override |
| `value` | `bigint` | ❌ | `0` | ETH value for native token swaps |

##### `estimateGas(quote: SwapQuoteResult): Promise<bigint>`

Estimate gas cost for executing a swap.

##### `setExecutionEnabled(enabled: boolean): void`

Toggle execution gate (safety feature to prevent accidental swaps).

## Interfaces

### `SwapQuoteInput`

```typescript
interface SwapQuoteInput {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  amountOut?: bigint       // for exact-out swaps
  recipient?: Address
}
```

### `SwapQuoteResult`

```typescript
interface SwapQuoteResult {
  bestProvider: string
  amountOut: bigint
  priceImpact: number
  gasEstimate: bigint
  route: SwapHop[]
  txData: Hex
  to: Address
  value: bigint
}
```

### `QuoteComparison`

```typescript
interface QuoteComparison {
  provider: string
  amountOut: bigint
  priceImpact: number
  gasEstimate: bigint
  route: SwapHop[]
}
```

### `SwapHop`

```typescript
interface SwapHop {
  dex: string
  pool: Address
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  amountOut: bigint
}
```

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| `SWAP_001` | `NoValidQuotes` | All providers failed to return a valid quote |
| `SWAP_002` | `QuoteExpired` | Quote TTL exceeded before execution |
| `SWAP_003` | `ExecutionDisabled` | Execution gate is disabled |
| `SWAP_004` | `PriceImpactTooHigh` | Price impact exceeds configured threshold |
| `SWAP_005` | `InsufficientBalance` | Insufficient token balance for swap |

## Usage Examples

### Basic Token Swap

```typescript
import { SwapQuoter, SwapExecutor } from '@cinacoin/swap-sdk'

const quoter = new SwapQuoter({ chainId: 1, providers: ['uniswap-v3', 'sushiswap'] })
const executor = new SwapExecutor({ chainId: 1, publicClient, walletClient })

const quote = await quoter.getBestQuote({
  tokenIn: WETH,
  tokenOut: USDC,
  amountIn: parseEther('1'),
})

console.log(`Best provider: ${quote.bestProvider}`)
console.log(`Expected output: ${formatUnits(quote.amountOut, 6)} USDC`)

const txHash = await executor.execute(quote)
console.log(`Transaction: ${txHash}`)
```

### Multi-Chain Swap

```typescript
const mainnetQuoter = new SwapQuoter({ chainId: 1, providers: ['uniswap-v3'] })
const polygonQuoter = new SwapQuoter({ chainId: 137, providers: ['quickswap'] })

const [mainnetQuote, polygonQuote] = await Promise.all([
  mainnetQuoter.getBestQuote({ tokenIn, tokenOut, amountIn }),
  polygonQuoter.getBestQuote({ tokenIn, tokenOut, amountIn }),
])
```
