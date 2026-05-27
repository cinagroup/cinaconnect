# Cinacoin Health Status Page

Public-facing health status page for Cinacoin infrastructure services.

Built with Next.js (static export) and deployed to **Cloudflare Pages**.

## Quick Start

```bash
# Install dependencies (from repo root)
pnpm install

# Run dev server
pnpm --filter health-status dev

# Build static export
pnpm --filter health-status build
```

The static output is generated in `out/`.

## Architecture

- **Framework:** Next.js 15 with `output: "export"` (fully static)
- **Styling:** Tailwind CSS
- **Data Source:** Fetches service status from `service-status.json` at build time + runtime browser polling
- **Images:** Unoptimized (compatible with static export)

## Deployment

### Cloudflare Pages

The app is deployed to Cloudflare Pages as a static site.

| Environment | URL |
|---|---|
| Production | `https://cinacoin-health-status.pages.dev` |
| Custom Domain | `status.cinacoin.com` (configure in Cloudflare dashboard) |

### Wrangler Configuration

See `wrangler.toml` for build and output settings:

- **Project name:** `cinacoin-health-status`
- **Build command:** `pnpm --filter health-status build`
- **Output directory:** `apps/health-status/out/`

### GitHub Actions

Pushes to `main` that touch `apps/health-status/` trigger automatic deployment via `.github/workflows/deploy-health-status.yml`.

**Required secrets** (set in GitHub repo settings):

| Secret | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages write access |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Manual Deploy

```bash
# Using Wrangler CLI
npx wrangler pages deploy apps/health-status/out \
  --project-name=cinacoin-health-status \
  --branch=main

# Or via the cloudflare/pages-action GitHub Action (see workflow)
```

### Custom Domain

To set up `status.cinacoin.com`:

1. Go to **Cloudflare Pages** → `cinacoin-health-status` → **Custom domains**
2. Add `status.cinacoin.com`
3. Cloudflare will automatically provision SSL and configure DNS
4. Wait for DNS propagation (typically < 5 minutes)

## File Structure

```
apps/health-status/
├── src/                  # React components & pages
├── public/               # Static assets
├── out/                  # Static build output (gitignored)
├── next.config.ts        # Next.js config (static export)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── wrangler.toml         # Cloudflare Pages config
```
