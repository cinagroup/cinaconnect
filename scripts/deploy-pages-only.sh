#!/bin/bash
set -e

# CinaCoin Cloudflare Pages Deployment Script (with project creation)
# Uses API token for authentication (no browser required)

CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"  # Set via environment or .env
CLOUDFLARE_ACCOUNT_ID="7ea8e46d8210bad342fa7595f7935fea"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' CYAN='\033[0;36m' NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }

# Deploy function for Pages
deploy_page() {
    local app_name=$1
    local project_name=$2
    local build_dir=$3
    local build_output_dir=$4

    info "Deploying $app_name..."
    cd "$PROJECT_ROOT/$build_dir"

    # Build
    info "Building..."
    pnpm build

    # Deploy using wrangler with token
    info "Deploying to Cloudflare Pages..."
    CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler pages deploy "$build_output_dir" --project-name="$project_name" --commit-dirty=true

    log "$app_name deployed successfully!"
    cd "$PROJECT_ROOT"
}

# Main
info "CinaCoin Cloudflare Pages Deployment"
info "Account: CinaGroup ($CLOUDFLARE_ACCOUNT_ID)"
echo ""

# Deploy Backend Dashboard
deploy_page "Backend Dashboard" "backend-dashboard" "apps/backend-dashboard" "out"

# Deploy Health Status Page
deploy_page "Health Status Page" "cinacoin-health-status" "apps/health-status" "out"

# Deploy API Documentation Site
info "Deploying API Documentation Site..."
cd "$PROJECT_ROOT/docs-site"
npm run build
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler pages deploy docs/.vitepress/dist --project-name="cinacoin-docs" --commit-dirty=true
log "API Documentation Site deployed!"
cd "$PROJECT_ROOT"

echo ""
log "🎉 All Cloudflare Pages deployed successfully!"
echo ""
echo "Deployed Pages (.pages.dev):"
echo "  • backend-dashboard"
echo "  • cinacoin-health-status"
echo "  • cinacoin-docs"
echo ""
echo "Access URLs:"
echo "  • https://backend-dashboard.pages.dev"
echo "  • https://cinacoin-health-status.pages.dev"
echo "  • https://cinacoin-docs.pages.dev"