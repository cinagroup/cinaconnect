# Cinacoin API Documentation — Deployment Guide

VitePress-based documentation site deployed to Cloudflare Pages.

## Architecture

```
┌─────────────────────────────────────────┐
│         Cloudflare Pages                │
│  (300+ PoPs, automatic HTTPS/CDN)       │
│                                         │
│  • Source: docs-site/                   │
│  • Build: `npm run build` (VitePress)   │
│  • Output: docs/.vitepress/dist         │
│  • URL: docs.cinacoin.com (custom)   │
└─────────────────────────────────────────┘
```

## Quick Start

### Local Development

```bash
cd docs-site
npm install
npm run dev       # Preview at http://localhost:5173
npm run build     # Build static site
npm run preview   # Preview production build
```

### Manual Deployment to Cloudflare Pages

```bash
# 1. Install wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Build and deploy
cd docs-site
npm run build
wrangler pages deploy docs/.vitepress/dist --project-name=cinacoin-docs
```

## GitHub Actions (Automatic Deployment)

The `.github/workflows/deploy-docs.yml` workflow handles automatic deployment:

- **Trigger:** Push to `main` branch when `docs-site/` files change
- **PR:** Builds docs on every pull request (no deploy)
- **Manual:** Can be triggered via `workflow_dispatch` in GitHub Actions UI

### Required GitHub Secrets

Set these in your repository settings (`Settings → Secrets and variables → Actions`):

| Secret | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with `Pages:Write` permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (from dashboard) |

### Creating the API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Pages** template
4. Scope it to your account and the `cinacoin-docs` project
5. Copy the token and add it as `CLOUDFLARE_API_TOKEN` in GitHub secrets

## Custom Domain

### docs.cinacoin.com

1. Deploy once to Cloudflare Pages (manual or via CI)
2. In the [Cloudflare Pages dashboard](https://dash.cloudflare.com/?to=/:account/pages), go to **cinacoin-docs**
3. Navigate to **Custom domains** → **Set up a custom domain**
4. Enter `docs.cinacoin.com`
5. Cloudflare will automatically provision an SSL certificate and DNS record
6. Verify the domain is active (propagation takes ~5 minutes)

## Configuration Files

| File | Purpose |
|---|---|
| `wrangler.toml` | Cloudflare Pages build configuration |
| `.github/workflows/deploy-docs.yml` | GitHub Actions CI/CD pipeline |
| `.gitignore` | Excludes build output (`dist/`) |

## Troubleshooting

### Build fails in CI
- Check Node.js version compatibility (requires Node 20+)
- Run `npm run build` locally to reproduce
- Check for missing dependencies with `npm ci`

### Pages not found after deploy
- Verify `docs/.vitepress/dist` exists after build
- Check Cloudflare Pages deployment logs in the dashboard
- Ensure the project name matches: `cinacoin-docs`

### Custom domain not working
- DNS propagation can take up to 24 hours (usually <5 min on Cloudflare)
- Verify SSL certificate status in Cloudflare dashboard
- Check that the domain is listed under Custom domains for the project
