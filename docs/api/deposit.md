# Deposit API

> `@cinacoin/deposit` — 交易所充值功能。

## Installation

```bash
npm install @cinacoin/deposit
```

## Usage

```typescript
import { DepositService, EXCHANGES, useDeposit } from '@cinacoin/deposit'

// Get exchange info
const exchanges = EXCHANGES

// Create deposit
const result = await depositService.createDeposit({
  exchange: 'binance',
  asset: 'ETH',
  network: 'ethereum',
  amount: '1.5',
})

// Track deposit
const status = await depositService.trackDeposit({
  txHash: '0x...',
  exchange: 'binance',
})
```

## React Hook

```tsx
import { useDeposit, useAvailableExchanges } from '@cinacoin/deposit'

const { createDeposit, trackDeposit, depositHistory } = useDeposit()
const { exchanges, isLoading } = useAvailableExchanges()
```

## Components

```tsx
import { DepositModal, DepositButton } from '@cinacoin/deposit'

<DepositModal />
<DepositButton />
```

## Supported Exchanges

Binance, OKX, Bybit, KuCoin, Coinbase

## See Also

- [Core SDK](./core-sdk.md)
