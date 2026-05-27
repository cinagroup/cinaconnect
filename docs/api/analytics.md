# Analytics API

> `@cinacoin/analytics` — GDPR 合规的事件追踪和指标分析。

## Installation

```bash
npm install @cinacoin/analytics
```

## Usage

```typescript
import { EventTracker, InMemoryProvider, ConsentManager } from '@cinacoin/analytics'

const tracker = new EventTracker()
tracker.addProvider(new InMemoryProvider())

// Track events
await tracker.trackWalletConnected('metamask', 1)
await tracker.trackTransactionAttempted('0x123', 1, 'metamask')
await tracker.trackTransactionCompleted('0x123', 1, 'metamask')
await tracker.trackChainSwitched(1, 137)
await tracker.trackModalOpened()
await tracker.trackModalClosed()
```

## Metrics

```typescript
import {
  calculateConnectionMetrics,
  calculateWalletPopularity,
  calculateChainUsage,
  calculateTransactionSuccessRate,
  countUniqueSessions,
} from '@cinacoin/analytics'

const metrics = calculateConnectionMetrics(events)
const popularity = calculateWalletPopularity(events)
const usage = calculateChainUsage(events)
const rate = calculateTransactionSuccessRate(events)
const sessions = countUniqueSessions(events)
```

## Privacy

```typescript
import { ConsentManager, anonymizeEvent, exportUserData, deleteUserData } from '@cinacoin/analytics'

const consent = new ConsentManager()

// Set consent preferences
consent.setPreferences({
  analytics: true,
  personalization: false,
  marketing: false,
})

// Anonymize events
const anonEvents = anonymizeEvent(event, { removeIp: true, hashAddress: true })

// GDPR: Export user data
const data = await exportUserData(userId)

// GDPR: Delete user data
await deleteUserData(userId)
```

## Providers

```typescript
import { LocalStorageProvider, InMemoryProvider, RemoteProvider } from '@cinacoin/analytics'

// Local storage
const local = new LocalStorageProvider()

// In-memory (testing)
const memory = new InMemoryProvider()

// Remote (custom backend)
const remote = new RemoteProvider({
  url: 'https://analytics.yourdomain.com/api',
  apiKey: 'your-api-key',
})

// Add provider to tracker
tracker.addProvider(remote)
```

## Error Handling

```typescript
try {
  await tracker.trackWalletConnected('metamask', 1)
} catch (err) {
  if (err.code === 'PROVIDER_ERROR') { /* analytics provider failed */ }
}
```

## See Also

- [Core SDK](./core-sdk.md)
