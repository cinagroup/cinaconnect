# @cinacoin/cdn — CDN Deployment Guide

Deploy Cinacoin CDN bundles to Cloudflare Pages and/or R2 for globally-distributed, versioned hosting.

## Architecture

```
Build (Rollup) → Versioned URLs → Cloudflare Pages / R2 → Global CDN
```

## Versioning Strategy

| Path | Description | Cache |
|------|-------------|-------|
| `/v1/cinacoin.js` | Latest (auto-updates) | 1 hour + stale-while-revalidate |
| `/v0.2.0/cinacoin.js` | Pinned version | 1 year, immutable |
| `/v1/cinacoin.mjs` | Latest ESM module | 1 hour |
| `/v0.2.0/cinacoin.mjs` | Pinned ESM module | 1 year |

## Quick Deploy

### Option A: Cloudflare Pages (Recommended)

```bash
cd packages/cdn
npm run build:cdn          # Build + generate versioned URLs
npm run deploy:pages       # Deploy to Pages
```

### Option B: Cloudflare R2

```bash
cd packages/cdn
# Set environment variables
export R2_BUCKET="cinacoin-cdn"
export CDN_VERSION="0.2.0"

npm run build:cdn          # Build + generate versioned URLs
npm run deploy:r2          # Upload to R2
```

## Usage in HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My dApp</title>
</head>
<body>
  <!-- Step 1: Configure (before loading CDN) -->
  <script>
    window.Cinacoin = {
      projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
      theme: 'dark',
      primaryColor: '#6366F1',
      chains: [1, 10, 137],
    };
  </script>

  <!-- Step 2: Load CDN with SRI -->
  <script
    src="https://cdn.cinacoin.dev/v0.2.0/cinacoin.js"
    integrity="sha384-REPLACE_WITH_GENERATED_HASH"
    crossorigin="anonymous"
  ></script>

  <!-- Step 3: Render -->
  <div id="connect-button"></div>
  <script>
    Cinacoin.renderConnectButton('#connect-button', {
      size: 'lg',
      onConnect: (addr) => console.log('Connected:', addr),
    });
  </script>
</body>
</html>
```

## SRI Hash Generation

```bash
# Generate SHA-384 hash for the CDN bundle
npm run sri                  # sha384 for cdn.js
npm run sri:all              # sha384 for both cdn.js and cdn.mjs

# Or manually:
node scripts/sri-hash.js dist/cdn.js sha384
```

## Versioned URL Manifest

After building, a `manifest.json` is generated in `cdn-dist/` with all URLs and SRI hashes:

```bash
cat cdn-dist/manifest.json
```

## Caching Headers

The `_headers` file in the CDN output configures Cloudflare caching:

- **Versioned paths** (`/v0.2.0/*`): `max-age=31536000, immutable` — cache forever
- **Latest paths** (`/v1/*`): `max-age=3600, stale-while-revalidate=86400` — short cache
- **Source maps**: `max-age=31536000, immutable` — cache forever

## Custom Domain

1. Add your domain (e.g., `cdn.cinacoin.dev`) in Cloudflare Pages dashboard
2. Point DNS CNAME to `<project>.pages.dev`
3. SSL/TLS is automatically provisioned

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CDN_VERSION` | `0.2.0` | Current version for pinned URLs |
| `R2_BUCKET` | `cinacoin-cdn` | R2 bucket name for uploads |

## CI/CD Pipeline Example

```yaml
# .github/workflows/deploy-cdn.yml
name: Deploy CDN
on:
  push:
    tags:
      - 'cdn-v*'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: cd packages/cdn && pnpm build:cdn
      - run: cd packages/cdn && pnpm deploy:pages
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

## Rollup Build Configuration

The Rollup config (`rollup.config.js`) produces:

- **IIFE bundle** (`dist/cdn.js`) — script tag usage with `window.Cinacoin`
- **ESM module** (`dist/cdn.mjs`) — import from CDN

```js
// rollup.config.js — key config
output: [
  { file: "dist/cdn.js", format: "iife", name: "Cinacoin" },
  { file: "dist/cdn.mjs", format: "esm" },
]
```

## License

MIT
