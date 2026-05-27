# Backend Dashboard

Cinacoin Backend Management Dashboard — built with Next.js 15.

## Deployment to Cloudflare Pages

### Prerequisites

- Cloudflare account with Pages enabled
- GitHub repository connected to Cloudflare Pages
- Required secrets configured in GitHub:
  - `CLOUDFLARE_API_TOKEN` — with Pages write permissions
  - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID

### Local Build

```bash
pnpm dashboard:build
```

Static output is written to `apps/backend-dashboard/out/`.

### CI/CD Deployment

Pushing to `main` triggers automatic deployment via `.github/workflows/deploy-dashboard.yml`.

The workflow:
1. Installs dependencies via pnpm
2. Runs `pnpm dashboard:build`
3. Deploys the `out/` directory to Cloudflare Pages

### Manual Deployment

Trigger via GitHub Actions workflow dispatch:
1. Go to Actions → Deploy Dashboard to Cloudflare Pages
2. Select target environment (staging or production)
3. Run workflow

### Manual Deployment (CLI)

```bash
# Install wrangler globally
npm install -g wrangler

# Deploy from project root
cd apps/backend-dashboard
wrangler pages deploy out --project-name=backend-dashboard
```

### Wrangler Configuration

See `wrangler.toml` for Cloudflare Pages build settings.

### Project Name

The Cloudflare Pages project name is `backend-dashboard`.
