#!/usr/bin/env bash
set -euo pipefail

# CinaCoin Documentation Site Build Script
# This script installs dependencies and builds the VitePress docs site.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_SITE_DIR="$PROJECT_DIR/docs-site"

echo "📦 CinaCoin Docs Site Build"
echo "=============================="

# Install dependencies
echo "📦 Installing dependencies..."
cd "$DOCS_SITE_DIR"
pnpm install

# Build
echo "🔨 Building VitePress site..."
pnpm run build

echo "✅ Build complete! Output is in $DOCS_SITE_DIR/docs/.vitepress/dist/"
echo ""
echo "To preview locally:"
echo "  cd $DOCS_SITE_DIR && pnpm run preview"
echo ""
echo "To start dev server:"
echo "  cd $DOCS_SITE_DIR && pnpm run dev"
