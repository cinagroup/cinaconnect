# Cinacoin Cloudflare Deployment
# Deploy all components to Cloudflare

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Cloudflare Edge (300+ PoPs)             │
├──────────────┬───────────────┬──────────────────────┤
│  Pages       │  Workers      │  D1 + KV + R2        │
│  (Demo/Docs) │  (API/Proxy)  │  (Storage/DB)        │
│              │               │                      │
│ • Next.js    │ • RPC Proxy   │ • D1 → SQLite        │
│ • SDK Docs   │ • Keys API    │ • KV → Sessions      │
│ • CDN        │ • Relay       │ • R2 → Bundles       │
└──────────────┴───────────────┴──────────────────────┘
```

## Quick Deploy

### 1. Login to Cloudflare

```bash
npm install -g wrangler
wrangler login
```

### 2. Deploy Core SDK to CDN (R2)

```bash
# Create R2 bucket for SDK bundles
wrangler r2 bucket create cinacoin-cdn

# Build all packages
pnpm install && pnpm run build

# Upload bundles
wrangler r2 object put cinacoin-cdn/core-sdk/index.js --file=packages/core-sdk/dist/index.js
wrangler r2 object put cinacoin-cdn/core-sdk/index.js.map --file=packages/core-sdk/dist/index.js.map
```

### 3. Deploy RPC Proxy (Workers)

```bash
cd packages/rpc-proxy
wrangler deploy --config cloudflare/wrangler.toml
```

### 4. Deploy Keys Server (Workers + D1)

```bash
# Create D1 database
wrangler d1 create cinacoin-keys
# → Copy the database_id to wrangler.toml

# Run migrations
wrangler d1 execute cinacoin-keys --local --file=cloudflare/schema.sql

# Deploy
cd packages/keys-server
wrangler deploy --config cloudflare/wrangler.toml
```

### 5. Deploy Relay Server (Workers + Durable Objects)

```bash
cd packages/relay-server
wrangler deploy --config cloudflare/wrangler.toml
```

### 6. Deploy Demo App (Pages)

```bash
cd apps/demo
# Build with static export
pnpm run build
wrangler pages deploy .next --project-name=cinacoin-demo
```

## Environment Variables

```bash
# Set secrets
wrangler secret put NEXT_PUBLIC_PROJECT_ID
wrangler secret put ENCRYPTION_KEY
wrangler secret put RELAY_API_KEY
```

## Cost: $0/month (free tier)
