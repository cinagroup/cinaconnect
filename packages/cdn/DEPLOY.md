# CinaConnect CDN & Analytics — Deployment Guide

## Overview

This guide covers deploying the CinaConnect CDN bundle and analytics ingestion server to Cloudflare's edge network.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Cloudflare account](https://dash.cloudflare.com/) with Workers, Pages, D1, KV, and R2 enabled
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed: `npm i -g wrangler`

## Part 1: Analytics Ingestion Server

### 1.1 One-Command Setup

```bash
cd packages/analytics-server
npm install
npx tsx scripts/deploy.ts
```

This script will:
- Create a D1 database (`CinaConnectAnalytics`)
- Create KV namespaces for rate limiting and deduplication
- Apply the D1 schema migration
- Deploy the Worker

### 1.2 Manual Setup

```bash
# 1. Create D1 database
wrangler d1 create CinaConnectAnalytics

# 2. Copy the returned database_id into wrangler.toml

# 3. Create KV namespaces
wrangler kv:namespace create "rate-limit-analytics"
wrangler kv:namespace create "dedup-analytics"

# 4. Update wrangler.toml with the KV namespace IDs

# 5. Run migrations
wrangler d1 migrations apply CinaConnectAnalytics --remote

# 6. Set API key secret
wrangler secret put API_KEY

# 7. Deploy
wrangler deploy
```

### 1.3 Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `https://cinaconnect-analytics.<account>.workers.dev/v1/events` | Ingest events |
| `GET` | `https://cinaconnect-analytics.<account>.workers.dev/v1/health` | Health check |
| `GET` | `https://cinaconnect-analytics.<account>.workers.dev/v1/metrics` | Prometheus metrics |

### 1.4 Integrating with Analytics SDK

```typescript
import { RemoteProvider, EventTracker } from '@cinaconnect/analytics';

const provider = new RemoteProvider({
  endpoint: 'https://cinaconnect-analytics.<account>.workers.dev/v1/events',
  apiKey: 'your-secret-key',
  batchSize: 10,
  flushInterval: 5000,
});

const tracker = new EventTracker();
tracker.addProvider(provider);
```

## Part 2: CDN Deployment

### Option A: Cloudflare Pages (Recommended)

```bash
cd packages/cdn
npm install

# Build + generate versioned URLs
npm run build:cdn

# Deploy to Pages
npm run deploy:pages
```

This uploads the `cdn-dist/` directory to Cloudflare Pages with:
- Versioned paths (`/v1/`, `/v0.2.0/`)
- Cache headers via `_headers` file
- Redirect rules via `_redirects` file
- SRI hashes in `manifest.json`

### Option B: Cloudflare R2 (Direct Asset Hosting)

```bash
cd packages/cdn
npm install

# Create R2 bucket (one time)
wrangler r2 bucket create cinaconnect-cdn

# Build + upload
npm run deploy:r2
```

Configure R2 as a custom domain or use with Cloudflare Workers as a proxy.

### 2.1 Versioned URLs

After deployment:

```html
<!-- Latest (may update) -->
<script src="https://cdn.cinaconnect.dev/v1/cinaconnect.js"></script>

<!-- Pinned version (immutable) -->
<script
  src="https://cdn.cinaconnect.dev/v0.2.0/cinaconnect.js"
  integrity="sha384-GENERATED_SRI_HASH"
  crossorigin="anonymous"
></script>
```

### 2.2 Generating SRI Hashes

```bash
# Single file
npm run sri

# All bundles
npm run sri:all
```

### 2.3 Demo Page

A demo HTML page is available at `packages/cdn/demo/index.html`:

```bash
# Open in browser
open packages/cdn/demo/index.html
# or serve locally
npx serve packages/cdn/demo
```

## Architecture

```
                              ┌─────────────────────────┐
┌────────────┐  POST /events  │   Cloudflare Worker     │
│  Browser   │ ──────────────►│  (Analytics Server)     │
│  (dApp)    │                │  - Validation           │
│            │                │  - Rate Limiting (KV)   │
│            │                │  - Dedup (KV)           │
│            │                │  - GDPR Anonymization   │
└────────────┘                │  - Batch D1 Insert      │
                              └──────────┬──────────────┘
                                         │
                              ┌──────────▼──────────────┐
                              │   D1 Database           │
                              │   (Events Table)        │
                              └─────────────────────────┘

┌────────────┐                ┌─────────────────────────┐
│  Browser   │◄──GET /cdn.js──│   Cloudflare Pages/R2   │
│  (dApp)    │                │   (CDN Hosting)         │
└────────────┘                └─────────────────────────┘
```

## Cost Estimates

| Service | Free Tier | Typical Cost |
|---------|-----------|--------------|
| Workers | 100K req/day | $5/month (10M req) |
| D1 | 5M reads/day | $5/month |
| KV | 100K reads/day | $5/month |
| Pages | Unlimited bandwidth | Free for basic usage |
| R2 | 10GB storage | ~$0.015/GB/month |

## Monitoring

- **Health**: `GET /v1/health` returns uptime and DB status
- **Metrics**: `GET /v1/metrics` returns Prometheus-compatible metrics
- **Logs**: View in Cloudflare Workers dashboard or use `wrangler tail`

## CI/CD Pipeline

Example GitHub Actions workflow:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-analytics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd packages/analytics-server && npm install
      - run: cd packages/analytics-server && npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}

  deploy-cdn:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd packages/cdn && npm install
      - run: cd packages/cdn && npm run build:cdn
      - run: cd packages/cdn && npx wrangler pages deploy cdn-dist
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `D1_NOT_FOUND` | Run `wrangler d1 create CinaConnectAnalytics` and update `database_id` |
| `KV_NAMESPACE_NOT_FOUND` | Create KV namespaces and update IDs in `wrangler.toml` |
| Rate limit errors | Increase `RATE_LIMIT` in `[vars]` |
| CDN 404s | Run `npm run build:cdn` before deploying |
| SRI mismatch | Re-run `npm run sri` after each build |

## License

MIT
