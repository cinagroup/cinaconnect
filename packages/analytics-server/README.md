# @cinacoin/analytics-server

Cloudflare Worker for ingesting analytics events from the Cinacoin analytics SDK.

## Architecture

```
Client SDK (RemoteProvider) ──POST──> Cloudflare Worker ──INSERT──> D1 Database
                                    │
                                    ├── KV Rate Limiting (per app/user)
                                    ├── KV Deduplication (eventId)
                                    ├── GDPR Anonymization (IP hash, UA truncation)
                                    └── Prometheus Metrics (/v1/metrics)
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/events` | Batch event ingestion (202 Accepted) |
| `GET` | `/v1/health` | Health check with DB status |
| `GET` | `/v1/metrics` | Prometheus-format metrics |
| `GET` | `/` | Service info |

## Features

- **Event Validation**: Schema validation against `AnalyticsEvent` types
- **Rate Limiting**: Per-app/user sliding window via KV (configurable limit/window)
- **Event Deduplication**: 24-hour dedup window based on `eventId`
- **GDPR Anonymization**: IP hashing (SHA-256), user agent truncation, PII removal
- **Batch Insert**: Configurable batch size for efficient D1 writes
- **Prometheus Metrics**: Request counts, latency, error tracking

## Quick Start

### Local Development

```bash
cd packages/analytics-server
npm install
npm run dev
# Worker runs at http://localhost:8787
```

### Test the endpoints

```bash
# Health check
curl http://localhost:8787/v1/health

# Send events
curl -X POST http://localhost:8787/v1/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '[{
    "eventId": "evt_test_1",
    "type": "page_viewed",
    "timestamp": 1700000000000,
    "sessionId": "sess_test"
  }, {
    "eventId": "evt_test_2",
    "type": "wallet_connected",
    "timestamp": 1700000000000,
    "sessionId": "sess_test",
    "wallet": "metamask",
    "chainId": 1
  }]'

# View metrics
curl http://localhost:8787/v1/metrics
```

### Deploy

```bash
npx wrangler login
npm run deploy
# Or use the deployment script
npx tsx scripts/deploy.ts
```

## D1 Database Schema

```sql
CREATE TABLE events (
    id TEXT PRIMARY KEY,           -- eventId (dedup key)
    app_id TEXT NOT NULL,          -- Application identifier
    event_type TEXT NOT NULL,      -- AnalyticsEventType enum
    user_id TEXT NOT NULL,         -- Session ID (hashed for GDPR)
    properties TEXT NOT NULL,      -- JSON properties
    timestamp INTEGER NOT NULL,    -- Event timestamp (ms)
    ip_hash TEXT,                  -- Hashed IP address
    created_at INTEGER NOT NULL    -- Server insert time (ms)
);
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | `""` | API key for authentication |
| `RATE_LIMIT` | `1000` | Max requests per window |
| `RATE_WINDOW` | `3600` | Rate limit window (seconds) |
| `BATCH_SIZE` | `100` | D1 batch insert size |
| `GDPR_ANONYMIZE` | `true` | Enable GDPR anonymization |

## Integrating with the Analytics SDK

```typescript
import { RemoteProvider, EventTracker } from '@cinacoin/analytics';

const provider = new RemoteProvider({
  endpoint: 'https://cinacoin-analytics.<account>.workers.dev/v1/events',
  apiKey: 'your-api-key',
  batchSize: 10,
  flushInterval: 5000,
});

const tracker = new EventTracker();
tracker.addProvider(provider);

await tracker.trackWalletConnected('metamask', 1);
```

## Tests

```bash
npm test
npm run test:watch
```

## License

MIT
