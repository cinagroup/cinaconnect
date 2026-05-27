# On-Ramp SDK API

> `@cinacoin/onramp-sdk` — Multi-provider fiat-to-crypto gateway aggregator.

## Overview

The On-Ramp SDK aggregates quotes from multiple fiat-to-crypto providers (MoonPay, Ramp, Transak, Stripe, Coinbase) and selects the best one based on cost, delivery speed, and user preferences. It includes a unified widget that can be embedded or opened as a popup.

## Installation

```bash
npm install @cinacoin/onramp-sdk
```

## Quick Start

```typescript
import {
  OnRampAggregator,
  OnRampWidget,
  MoonPayProvider,
  RampProvider,
  TransakProvider,
} from '@cinacoin/onramp-sdk'

// Create aggregator
const aggregator = new OnRampAggregator()

// Register providers
aggregator.registerProvider(new MoonPayProvider({
  apiKey: process.env.MOONPAY_API_KEY,
  environment: 'production',
}))
aggregator.registerProvider(new RampProvider({
  apiKey: process.env.RAMP_API_KEY,
}))
aggregator.registerProvider(new TransakProvider({
  apiKey: process.env.TRANSAK_API_KEY,
  environment: 'production',
}))

// Get the best quote
const bestQuote = await aggregator.getBestQuote({
  fiatCurrency: 'USD',
  fiatAmount: 100,
  cryptoToken: 'ETH',
  chainId: 1,
  destinationAddress: '0x...',
  userRegion: 'US',
})

console.log(`Best: ${bestQuote.providerName} → ${bestQuote.cryptoAmount} ETH`)
```

## Core Classes

### OnRampAggregator

Fetches quotes from all registered providers concurrently and selects the best option.

```typescript
import { OnRampAggregator } from '@cinacoin/onramp-sdk'

const aggregator = new OnRampAggregator(config?: Partial<AggregatorConfig>)
```

#### AggregatorConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `quoteTimeoutMs` | `number` | `8000` | Max time to wait for quotes (ms) |
| `defaultRegion` | `string` | `'US'` | Default user region |
| `providerInfoTTL` | `number` | `300000` | Cache TTL for provider info (5 min) |

#### Methods

##### `registerProvider(provider: OnRampProviderAdapter): void`

Register a provider adapter.

##### `unregisterProvider(id: string): void`

Unregister a provider by ID.

##### `getProviders(region?: string): OnRampProvider[]`

Get all registered providers, optionally filtered by region.

##### `getQuotes(params: OnRampQuoteParams): Promise<OnRampQuote[]>`

Fetch quotes from all providers concurrently.

##### `getBestQuote(params: OnRampQuoteParams, preferences?: UserPreferences): Promise<OnRampQuote | null>`

Get the best quote based on user preferences.

Selection priority:
1. Lowest total cost
2. Shortest delivery time
3. Preferred payment method match

##### `getWidgetUrl(params: OnRampWidgetParams): string | null`

Get the widget URL for the best available provider.

##### `handleWidgetResult(result: OnRampResult): void`

Handle the result of a widget session.

### OnRampWidget

Provides a unified widget interface for all supported on-ramp providers.

```typescript
import { OnRampWidget } from '@cinacoin/onramp-sdk'

const widget = new OnRampWidget(aggregator, {
  containerId: 'onramp-widget', // for embedded mode
  width: 400,
  height: 600,
  popup: true,          // open as popup instead of embedded
  popupWidth: 480,
  popupHeight: 720,
  onEvent: (event) => console.log(event),
})
```

#### WidgetConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `containerId` | `string` | — | Container element ID for embedded mode |
| `width` | `number` | `400` | Widget width (px) |
| `height` | `number` | `600` | Widget height (px) |
| `popup` | `boolean` | `true` | Open as popup instead of embedded |
| `popupWidth` | `number` | `480` | Popup width (px) |
| `popupHeight` | `number` | `720` | Popup height (px) |
| `onEvent` | `OnRampWidgetCallback` | — | Event callback |

#### Widget Events

| Event Type | Payload | Description |
|------------|---------|-------------|
| `open` | — | Widget opened |
| `close` | — | Widget closed |
| `success` | `OnRampResult` | Purchase completed |
| `error` | `string` | Error occurred |
| `payment_initiated` | — | Payment started |
| `payment_completed` | — | Payment completed |
| `kyc_started` | — | KYC process started |

#### Methods

##### `open(params: OnRampWidgetParams): Promise<OnRampResult>`

Open the widget with the given parameters.

##### `close(): void`

Close the widget.

### OnRampProviderAdapter (Interface)

All provider adapters must implement this interface.

```typescript
interface OnRampProviderAdapter {
  id: string
  getProviderInfo(): OnRampProvider
  getQuote(params: OnRampQuoteParams): Promise<OnRampQuote>
  getWidgetUrl(params: OnRampWidgetParams): string
}
```

### Built-in Providers

#### MoonPayProvider

```typescript
import { MoonPayProvider } from '@cinacoin/onramp-sdk'

new MoonPayProvider({
  apiKey: 'moonpay-api-key',
  environment: 'production', // or 'sandbox'
})
```

#### RampProvider

```typescript
import { RampProvider } from '@cinacoin/onramp-sdk'

new RampProvider({
  apiKey: 'ramp-api-key',
})
```

#### TransakProvider

```typescript
import { TransakProvider } from '@cinacoin/onramp-sdk'

new TransakProvider({
  apiKey: 'transak-api-key',
  environment: 'production', // or 'staging'
})
```

## Types

### OnRampQuoteParams

```typescript
interface OnRampQuoteParams {
  fiatCurrency: string           // 'USD', 'EUR', 'CNY', etc.
  fiatAmount: number             // Amount in fiat currency
  cryptoToken: string            // Target token address or symbol
  chainId: number                // Target chain ID
  destinationAddress: Address    // Destination wallet
  userRegion: string             // ISO 3166-1 alpha-2
  paymentMethod?: string         // Preferred payment method
}
```

### OnRampQuote

```typescript
interface OnRampQuote {
  provider: OnRampProviderId
  providerName: string
  fiatAmount: number
  fiatCurrency: string
  cryptoAmount: number           // How much crypto the user gets
  cryptoToken: string
  exchangeRate: number           // Crypto per fiat unit
  totalCost: number              // Including all fees
  fees: OnRampFees               // Fee breakdown
  estimatedTime: number          // Delivery time in minutes
  requiresKyc: boolean
  paymentMethods: string[]       // Supported payment methods
  regions: string[]              // Supported regions
  expiresAt: number              // Quote expiration
  widgetUrl?: string             // Provider widget URL
}
```

### OnRampFees

```typescript
interface OnRampFees {
  networkFeeBps: number          // Network fee in basis points
  providerFeeBps: number         // Provider fee in basis points
  fixedFee: number               // Fixed fee in source currency
  totalFeePercent: number        // Total effective fee percentage
}
```

### OnRampProvider

```typescript
interface OnRampProvider {
  id: OnRampProviderId
  name: string
  icon: string
  supportedCurrencies: string[]
  supportedPaymentMethods: string[]
  fees: OnRampFees
  regions: string[]              // ISO 3166-1 alpha-2
  minPurchaseAmount: number
  maxPurchaseAmount: number
  estimatedTimeMinutes: number
  requiresKyc: boolean
}
```

### OnRampWidgetParams

```typescript
interface OnRampWidgetParams {
  defaultFiatAmount?: number
  defaultFiatCurrency?: string
  defaultCryptoToken?: string
  destinationAddress: Address
  userRegion?: string
  enabledProviders?: OnRampProviderId[]
  theme?: 'light' | 'dark'
  primaryColor?: string
  redirectUrl?: string
  closeOnComplete?: boolean
}
```

### OnRampResult

```typescript
interface OnRampResult {
  completed: boolean
  orderId?: string
  txHash?: `0x${string}`
  cryptoAmount?: number
  fiatAmount?: number
  provider?: OnRampProviderId
  error?: string
}
```

### UserPreferences

```typescript
interface UserPreferences {
  preferredPaymentMethods?: string[]
  maxFeePercent?: number         // Max acceptable fee
  maxDeliveryTimeMinutes?: number
  skipKyc?: boolean              // Skip KYC-required providers
}
```

### OnRampProviderId

```typescript
type OnRampProviderId =
  | 'moonpay'
  | 'ramp'
  | 'transak'
  | 'stripe'
  | 'coinbase'
```

## Provider Comparison

| Provider | Min Purchase | KYC | Regions | Payment Methods |
|----------|-------------|-----|---------|-----------------|
| MoonPay | $5 | Yes | 160+ countries | Card, Bank, Apple Pay |
| Ramp | $1 | Optional | 150+ countries | Card, Bank, SEPA |
| Transak | $10 | Optional | 180+ countries | Card, Bank, Google Pay |
| Stripe | $1 | Varies | 45+ countries | Card |
| Coinbase | $2 | Yes | 100+ countries | Card, Bank |

## Error Handling

```typescript
try {
  const quote = await aggregator.getBestQuote(params)
  if (!quote) {
    // No providers available for this region/token
  }
} catch (error) {
  // Handle provider failures
}
```

## Architecture

```
┌──────────────────────────────────────────────┐
│               OnRampWidget                    │
│  ┌────────────────────────────────────────┐  │
│  │         OnRampAggregator               │  │
│  │  ┌────────┐ ┌──────┐ ┌────────┐ ┌────┐│  │
│  │  │MoonPay │ │Ramp  │ │Transak │ │... ││  │
│  │  │Provider│ │Prov. │ │Provider│ │    ││  │
│  │  └────────┘ └──────┘ └────────┘ └────┘│  │
│  └────────────────────────────────────────┘  │
│                    │                         │
│         ┌──────────┴──────────┐              │
│         │    Providers'       │              │
│         │    Checkout Flows   │              │
│         └─────────────────────┘              │
└──────────────────────────────────────────────┘
```
