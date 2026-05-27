# On-Ramp SDK API Documentation

> Generated API reference for `@cinacoin/onramp-sdk`.

## Overview

The On-Ramp SDK provides a unified interface for fiat-to-crypto on-ramp providers. It aggregates multiple providers (MoonPay, Ramp, Transak, Stripe) and finds the best rates based on region, payment method, and token.

## Installation

```bash
npm install @cinacoin/onramp-sdk
```

## Core Classes

### `OnRampAggregator`

Main entry point for on-ramp operations.

```typescript
import { OnRampAggregator } from '@cinacoin/onramp-sdk'

const aggregator = new OnRampAggregator({
  defaultChainId: 1,
  defaultCurrency: 'USD',
  providers: ['moonpay', 'ramp', 'transak'],
})
```

#### Constructor Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `defaultChainId` | `number` | ✅ | — | Default blockchain network |
| `defaultCurrency` | `string` | ❌ | `'USD'` | Default fiat currency |
| `providers` | `string[]` | ✅ | — | On-ramp providers to use |
| `apiKey` | `string` | ❌ | — | API key for provider auth |
| `environment` | `'sandbox' \| 'production'` | ❌ | `'sandbox'` | Environment mode |

#### Methods

##### `getBestOffer(input: OnRampInput): Promise<OnRampOffer>`

Find the best on-ramp offer based on amount, region, and payment method.

```typescript
const offer = await aggregator.getBestOffer({
  fiatAmount: 100,
  fiatCurrency: 'USD',
  token: 'ETH',
  chainId: 1,
  region: 'US',
  paymentMethod: 'credit_card',
})

console.log(offer.provider)           // "moonpay"
console.log(offer.cryptoAmount)       // Amount of ETH received
console.log(offer.fees)              // Total fees
console.log(offer.url)               // Checkout URL
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fiatAmount` | `number` | ✅ | Fiat amount to convert |
| `fiatCurrency` | `string` | ❌ | Fiat currency code (default: USD) |
| `token` | `string` | ✅ | Target cryptocurrency symbol |
| `chainId` | `number` | ❌ | Target chain ID |
| `region` | `string` | ❌ | User's region (ISO 3166-1 alpha-2) |
| `paymentMethod` | `'credit_card' \| 'debit_card' \| 'bank_transfer' \| 'apple_pay'` | ❌ | Payment method |

**Returns:** `OnRampOffer` with the best available offer.

##### `getAllOffers(input: OnRampInput): Promise<OnRampOffer[]>`

Get offers from all available providers for comparison.

##### `openWidget(offer: OnRampOffer, options?: WidgetOptions): void`

Open the on-ramp provider's widget/checkout.

```typescript
aggregator.openWidget(offer, {
  theme: 'dark',
  redirectUrl: 'https://myapp.com/onramp/success',
})
```

**WidgetOptions:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `theme` | `'light' \| 'dark'` | ❌ | `'light'` | Widget theme |
| `redirectUrl` | `string` | ❌ | — | Redirect after completion |
| `onClose` | `() => void` | ❌ | — | Callback on widget close |
| `onSuccess` | `(txHash: string) => void` | ❌ | — | Callback on successful purchase |

##### `getSupportedRegions(): Promise<string[]>`

Get list of supported regions (ISO country codes).

##### `getSupportedTokens(region: string): Promise<TokenInfo[]>`

Get tokens available for on-ramp in a specific region.

## Interfaces

### `OnRampInput`

```typescript
interface OnRampInput {
  fiatAmount: number
  fiatCurrency?: string       // default: 'USD'
  token: string               // e.g., 'ETH', 'USDC'
  chainId?: number            // target chain
  region?: string             // ISO country code
  paymentMethod?: string      // credit_card, bank_transfer, etc.
  walletAddress?: Address     // destination wallet
}
```

### `OnRampOffer`

```typescript
interface OnRampOffer {
  provider: string            // 'moonpay', 'ramp', 'transak'
  fiatAmount: number
  fiatCurrency: string
  cryptoAmount: number
  cryptoToken: string
  chainId: number
  fees: {
    providerFee: number
    networkFee: number
    totalFee: number
    feePercentage: number
  }
  exchangeRate: number
  url: string                 // checkout URL
  expiresAt: Date
  minAmount: number
  maxAmount: number
}
```

### `TokenInfo`

```typescript
interface TokenInfo {
  symbol: string
  name: string
  chainId: number
  address: Address | null     // null for native tokens
  decimals: number
  minAmount: number
  maxAmount: number
}
```

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| `ONRAMP_001` | `NoProvidersAvailable` | No providers available for the given region |
| `ONRAMP_002` | `AmountBelowMinimum` | Amount is below provider minimum |
| `ONRAMP_003` | `AmountAboveMaximum` | Amount exceeds provider maximum |
| `ONRAMP_004` | `KYCRequired` | User region requires KYC verification |
| `ONRAMP_005` | `WidgetFailedToLoad` | Widget failed to initialize |

## Usage Examples

### Basic On-Ramp

```typescript
import { OnRampAggregator } from '@cinacoin/onramp-sdk'

const aggregator = new OnRampAggregator({
  defaultChainId: 1,
  providers: ['moonpay', 'ramp', 'transak'],
})

const offer = await aggregator.getBestOffer({
  fiatAmount: 100,
  token: 'ETH',
  region: 'US',
  paymentMethod: 'credit_card',
})

aggregator.openWidget(offer, {
  theme: 'dark',
  onSuccess: (txHash) => console.log('Purchase complete:', txHash),
})
```

### Compare All Offers

```typescript
const offers = await aggregator.getAllOffers({
  fiatAmount: 500,
  fiatCurrency: 'EUR',
  token: 'USDC',
  chainId: 1,
  region: 'DE',
  paymentMethod: 'bank_transfer',
})

offers.sort((a, b) => b.cryptoAmount - a.cryptoAmount)
console.log('Best offer:', offers[0].provider, offers[0].cryptoAmount)
```
