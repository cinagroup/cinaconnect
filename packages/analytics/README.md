# @cinacoin/analytics

Cinacoin Analytics SDK — GDPR-compliant event tracking and metrics.

## Installation

```bash
npm install @cinacoin/analytics
```

## Usage

```ts
import { EventTracker, ConsentManager } from '@cinacoin/analytics';

const tracker = new EventTracker();
await tracker.trackConnection('metamask', 'eip155:1');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `EventTracker` | class | Main event tracking class |
| `LocalStorageProvider` | class | Local storage analytics provider |
| `InMemoryProvider` | class | In-memory analytics provider |
| `RemoteProvider` | class | Remote analytics provider |
| `calculateConnectionMetrics` | function | Calculate connection metrics |
| `calculateWalletPopularity` | function | Calculate wallet popularity stats |
| `calculateChainUsage` | function | Calculate chain usage stats |
| `calculateTransactionSuccessRate` | function | Calculate tx success rate |
| `ConsentManager` | class | GDPR consent management |
| `anonymizeEvent` | function | Anonymize a single event |
| `exportUserData` | function | Export user data (GDPR) |
| `deleteUserData` | function | Delete user data (GDPR) |
| `AnalyticsEvent` | type | Event data type |
| `ConnectionMetrics` | type | Metrics type |
