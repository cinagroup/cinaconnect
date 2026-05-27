# Analytics API Documentation

> Generated API reference for `@cinacoin/analytics`.

## Overview

The Analytics SDK provides self-hosted, privacy-first analytics for tracking wallet connection flows, transaction success rates, and user engagement. No third-party data sharing — all data stays on your infrastructure.

## Installation

```bash
npm install @cinacoin/analytics
```

## Core Classes

### `AnalyticsTracker`

Main analytics tracking instance.

```typescript
import { AnalyticsTracker } from '@cinacoin/analytics'

const analytics = new AnalyticsTracker({
  endpoint: 'https://analytics.yourdomain.com/api/v1/track',
  projectId: 'your-project-id',
  autoTrack: true,
})
```

#### Constructor Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `endpoint` | `string` | ✅ | — | Analytics API endpoint |
| `projectId` | `string` | ✅ | — | Project identifier |
| `autoTrack` | `boolean` | ❌ | `true` | Automatically track connection events |
| `batchSize` | `number` | ❌ | `10` | Events per batch flush |
| `flushInterval` | `number` | ❌ | `30000` | Flush interval in milliseconds |
| `userId` | `string` | ❌ | — | Custom user identifier |
| `privacy` | `'strict' \| 'standard'` | ❌ | `'standard'` | Privacy level |

#### Methods

##### `track(event: AnalyticsEvent): void`

Track a custom analytics event.

```typescript
analytics.track({
  event: 'wallet_connected',
  properties: {
    walletType: 'metamask',
    chainId: 1,
    connectionMethod: 'injected',
    duration: 1234,
  },
})
```

##### `trackConnection(connector: Connector, duration: number, success: boolean): void`

Track a wallet connection attempt.

```typescript
analytics.trackConnection(connector, connectionTimeMs, true)
```

##### `trackTransaction(tx: TransactionData): void`

Track a transaction lifecycle.

```typescript
analytics.trackTransaction({
  hash: txHash,
  chainId: 1,
  type: 'swap',
  status: 'confirmed',
  gasUsed: 150000n,
  duration: 12000,
})
```

##### `identify(userId: string, traits?: Record<string, unknown>): void`

Identify a user with custom traits (stored server-side only in standard privacy mode).

```typescript
analytics.identify(walletAddress, {
  chainId: 1,
  ensName,
  joinedAt: new Date().toISOString(),
})
```

##### `flush(): Promise<void>`

Force flush all pending events to the endpoint.

##### `getQueueLength(): number`

Get the number of events pending in the queue.

##### `enable(): void`

Resume tracking after being disabled.

##### `disable(): void`

Pause all tracking (GDPR compliance).

## Event Types

### Built-in Events

| Event | Triggered When | Properties |
|-------|---------------|------------|
| `app_initialized` | Cinacoin is initialized | `version`, `chains` |
| `connector_detected` | A wallet connector is discovered | `type`, `name`, `isAvailable` |
| `connect_attempt` | User clicks connect | `connector`, `method` |
| `wallet_connected` | Connection succeeds | `walletType`, `chainId`, `duration` |
| `connect_failed` | Connection fails | `connector`, `errorCode`, `duration` |
| `chain_switched` | User switches chain | `from`, `to` |
| `disconnect` | User disconnects | `walletType`, `sessionDuration` |
| `transaction_sent` | Transaction is submitted | `type`, `chainId` |
| `transaction_confirmed` | Transaction is confirmed | `type`, `gasUsed`, `duration` |
| `transaction_failed` | Transaction fails | `type`, `errorCode`, `reason` |
| `modal_opened` | Connect modal opens | `view`, `walletCount` |
| `modal_closed` | Connect modal closes | `view`, `action` |

### Custom Events

Any custom event can be tracked via `analytics.track()`:

```typescript
analytics.track({
  event: 'custom_feature_used',
  properties: {
    featureName: 'batch_swap',
    tokenCount: 3,
    totalValue: '5000',
  },
})
```

## Interfaces

### `AnalyticsEvent`

```typescript
interface AnalyticsEvent {
  event: string
  properties?: Record<string, unknown>
  timestamp?: number          // defaults to Date.now()
  sessionId?: string
}
```

### `TransactionData`

```typescript
interface TransactionData {
  hash: Hex
  chainId: number
  type: string                // 'swap', 'transfer', 'approve', etc.
  status: 'pending' | 'confirmed' | 'failed' | 'reverted'
  gasUsed?: bigint
  gasPrice?: bigint
  duration?: number           // ms from submission to finality
  error?: string
}
```

## Privacy Modes

### `'strict'` Mode

- No user identification
- No wallet addresses stored
- Only aggregate metrics
- Events batched and anonymized
- Compliant with GDPR without consent

### `'standard'` Mode

- User identification via `identify()`
- Wallet addresses stored server-side
- Full event properties tracked
- Requires user consent banner

## Usage Examples

### Basic Setup with Auto-Track

```typescript
import { AnalyticsTracker } from '@cinacoin/analytics'

const analytics = new AnalyticsTracker({
  endpoint: 'https://analytics.yourdomain.com/api/v1/track',
  projectId: 'my-dapp',
  autoTrack: true,  // Automatically tracks connection events
  batchSize: 20,
  flushInterval: 15000,
})
```

### Custom Tracking with Strict Privacy

```typescript
import { AnalyticsTracker } from '@cinacoin/analytics'

const analytics = new AnalyticsTracker({
  endpoint: '/api/analytics',
  projectId: 'my-dapp',
  privacy: 'strict',  // No PII stored
})

// Track custom events
analytics.track({
  event: 'page_view',
  properties: {
    page: '/swap',
    referrer: '/home',
  },
})

// Track swap analytics
analytics.track({
  event: 'swap_completed',
  properties: {
    tokenPair: 'WETH/USDC',
    amount: '1.5',
    provider: 'uniswap-v3',
  },
})
```

### GDPR Compliance — Disable on Opt-Out

```typescript
// User opts out of analytics
function onUserOptOut() {
  analytics.disable()
  localStorage.removeItem('cinacoin_analytics_id')
}

// User opts back in
function onUserOptIn() {
  analytics.enable()
  analytics.identify(walletAddress)
}
```
