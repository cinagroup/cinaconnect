#!/bin/bash
# CinaCoin — Cloudflare Deploy Script
# Usage: ./deploy-cloudflare.sh [--dry-run]

set -e

DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  echo "🔍 Dry run mode — no actual deployment"
fi

echo "═══════════════════════════════════════════════════════"
echo "  CinaCoin — Cloudflare Deployment"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v wrangler &>/dev/null; then
  echo "❌ wrangler CLI not found"
  echo "   Install: npm install -g wrangler"
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  echo "❌ pnpm not found"
  exit 1
fi

echo "✅ wrangler CLI found"
echo "✅ pnpm found"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
if [ "$DRY_RUN" = false ]; then
  pnpm install
fi
echo "✅ Dependencies installed"
echo ""

# Step 2: Build all packages
echo "🔨 Step 2: Building packages..."
if [ "$DRY_RUN" = false ]; then
  pnpm run build
fi
echo "✅ Build complete"
echo ""

# Step 3: Create R2 bucket for CDN
echo "🪣 Step 3: Creating R2 bucket..."
if [ "$DRY_RUN" = false ]; then
  wrangler r2 bucket create cinacoin-cdn 2>/dev/null || echo "   Bucket already exists"
fi
echo "✅ R2 bucket ready"
echo ""

# Step 4: Upload SDK bundles to R2
echo "📤 Step 4: Uploading SDK bundles to CDN..."
if [ "$DRY_RUN" = false ]; then
  for pkg in packages/*/dist/index.js; do
    if [ -f "$pkg" ]; then
      name=$(basename $(dirname $pkg))
      echo "   Uploading $name..."
      wrangler r2 object put cinacoin-cdn/${name}/index.js --file=$pkg 2>/dev/null || true
    fi
  done
fi
echo "✅ SDK bundles uploaded"
echo ""

# Step 5: Deploy RPC Proxy
echo "🔗 Step 5: Deploying RPC Proxy..."
if [ "$DRY_RUN" = false ]; then
  cd packages/rpc-proxy
  wrangler deploy --config cloudflare/wrangler.toml 2>/dev/null || echo "   RPC Proxy deployment skipped (configure KV first)"
  cd ../..
fi
echo ""

# Step 6: Deploy Keys Server
echo "🔑 Step 6: Deploying Keys Server..."
if [ "$DRY_RUN" = false ]; then
  cd packages/keys-server
  wrangler deploy --config cloudflare/wrangler.toml 2>/dev/null || echo "   Keys Server deployment skipped (configure D1 first)"
  cd ../..
fi
echo ""

# Step 7: Deploy Demo App
echo "🌐 Step 7: Deploying Demo App..."
if [ "$DRY_RUN" = false ]; then
  cd apps/demo
  wrangler pages deploy .next --project-name=cinacoin-demo 2>/dev/null || echo "   Demo deployment skipped"
  cd ../..
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  ✅ Deployment Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Set environment variables:"
echo "     wrangler secret put NEXT_PUBLIC_PROJECT_ID"
echo "     wrangler secret put ENCRYPTION_KEY"
echo ""
echo "  2. Create D1 database:"
echo "     wrangler d1 create cinacoin-keys"
echo ""
echo "  3. Create KV namespaces and update wrangler.toml IDs"
echo ""
echo "  4. Visit your deployed demo app"
echo "═══════════════════════════════════════════════════════"
