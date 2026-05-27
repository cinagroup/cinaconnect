# Cinacoin — Cloudflare Deployment Guide

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                Cloudflare Edge (300+ PoPs)               │
├──────────────┬────────────────┬────────────────────────┤
│  Pages       │  Workers       │  D1 + KV + R2          │
│  (Demo/Docs) │  (API/Relay)   │  (Storage/DB)          │
│              │                │                        │
│ • Next.js    │ • RPC Proxy    │ • D1 → SQLite          │
│ • SDK Docs   │ • Keys Server  │ • KV → Sessions/Cache  │
│ • SDK CDN    │ • Relay        │ • R2 → SDK Bundles     │
└──────────────┴────────────────┴────────────────────────┘
```

## Compatibility

| Component | Target | Compatibility | Notes |
|-----------|--------|---------------|-------|
| @cinacoin/core-sdk | N/A (browser lib) | ✅ 100% | No Node.js APIs, pure Web + @noble |
| React/Vue/Svelte/etc | N/A (browser) | ✅ 100% | Pure browser code |
| RPC Proxy | Workers | ✅ Ready | HTTP proxy + KV caching |
| Keys Server | Workers + D1 | ✅ Ready | D1 (SQLite) replaces PostgreSQL |
| Relay Server | Workers + DO | ✅ Ready | Durable Objects for WebSocket |
| Demo App | Pages | ✅ Ready | Next.js static/SSR |

## Quick Deploy

```bash
# 1. Install Wrangler
npm install -g wrangler
wrangler login

# 2. Create infrastructure
./scripts/cf-setup.sh

# 3. Deploy all components
./scripts/cf-deploy.sh
```

## Components

### RPC Proxy Worker
```
packages/rpc-proxy/cloudflare/
├── wrangler.toml
└── worker.ts
```

### Keys Server Worker
```
packages/keys-server/cloudflare/
├── wrangler.toml
└── worker.ts
```

### Relay Server Worker
```
packages/relay-server/cloudflare/
├── wrangler.toml
└── worker.ts
```

### Cost Estimate (Free Tier)
| Service | Limit | Usage | Cost |
|---------|-------|-------|------|
| Workers | 100K req/day | ~50K | $0 |
| Pages | 500 builds/mo | ~20 | $0 |
| D1 | 5M reads/day | ~100K | $0 |
| KV | 100K reads/day | ~10K | $0 |
| R2 | 10GB | ~200MB | $0 |
