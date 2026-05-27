# On-Ramp SDK

> `@cinacoin/onramp-sdk` — Fiat on-ramp aggregation SDK for Cinacoin.

## Installation

```bash
npm install @cinacoin/onramp-sdk
```

## Overview

Integrate multiple fiat on-ramp providers (MoonPay, Ramp, Transak, Stripe) to allow users to buy crypto with fiat currency.

## Usage

```typescript
import { OnRampSDK } from '@cinacoin/onramp-sdk'

const onRamp = new OnRampSDK({
  providers: ['moonpay', 'ramp', 'transak', 'stripe'],
  defaultCurrency: 'USD',
})

const url = await onRamp.getCheckoutUrl({
  fiatAmount: 100,
  currency: 'USD',
  cryptoCurrency: 'ETH',
})
```

## Related

- [Swap SDK](/api/swap-sdk)
- [Payment Flow](/api/payment-flow)
- [Deposit](/api/deposit)
