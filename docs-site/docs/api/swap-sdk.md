# Swap SDK

> `@cinacoin/swap-sdk` — Swap aggregator SDK for Cinacoin.

## Installation

```bash
npm install @cinacoin/swap-sdk
```

## Overview

The Swap SDK aggregates liquidity from multiple DEXs (Uniswap, 1inch, 0x, etc.) to find the best swap routes and execute token swaps.

## Usage

```typescript
import { SwapSDK } from '@cinacoin/swap-sdk'

const swap = new SwapSDK({
  chainId: 1,
  providers: ['uniswap', '1inch', '0x'],
})

const route = await swap.getBestRoute({
  fromToken: 'USDC',
  toToken: 'ETH',
  amount: '100',
})

await swap.execute(route)
```

## Features

- **Multi-DEX Aggregation** — Query multiple DEXs for best price
- **Route Optimization** — Smart routing through liquidity pools
- **Slippage Protection** — Configurable slippage tolerance
- **Gas Estimation** — Accurate gas cost estimates
- **Token Allowance** — Handle ERC-20 approvals

## Related

- [Payment Flow](/api/payment-flow)
- [On-Ramp SDK](/api/onramp-sdk)
- [Token List](/api/token-list)
