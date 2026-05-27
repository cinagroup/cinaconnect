#!/bin/bash
set -e

# CinaCoin Cloudflare Deployment Script
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

# Deploy function
deploy_service() {
    local service_name=$1
    local package_dir=$2

    info "Deploying $service_name..."
    cd "$package_dir"

    # Build
    info "Building..."
    pnpm build

    # Deploy using wrangler with token
    info "Deploying to Cloudflare..."
    CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler deploy

    log "$service_name deployed successfully!"
    cd "$PROJECT_ROOT"
}

# Main
info "CinaCoin Cloudflare Deployment"
info "Account: CinaGroup ($CLOUDFLARE_ACCOUNT_ID)"
echo ""

# Deploy Workers
deploy_service "RPC Proxy" "$PROJECT_ROOT/packages/rpc-proxy"
deploy_service "Keys Server" "$PROJECT_ROOT/packages/keys-server"
deploy_service "Relay Server" "$PROJECT_ROOT/packages/relay-server"
deploy_service "Notify Server" "$PROJECT_ROOT/packages/notify-server"
deploy_service "Push Server" "$PROJECT_ROOT/packages/push-server"

# Deploy Pages
info ""
info "Deploying Cloudflare Pages..."

# Backend Dashboard
info "Deploying Backend Dashboard to Pages..."
cd "$PROJECT_ROOT/apps/backend-dashboard"
pnpx pnpm build
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler pages project create backend-dashboard --production-branch main 2>/dev/null || true
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler pages deploy . --project-name=backend-dashboard
log "Backend Dashboard deployed to Pages!"

cd "$PROJECT_ROOT"

# Health Status Page
info "Deploying Health Status Page to Pages..."
cd "$PROJECT_ROOT/apps/health-status"
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler pages project create cinacoin-health-status --production-branch main 2>/dev/null || true
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler pages deploy . --project-name=cinacoin-health-status
log "Health Status Page deployed to Pages!"

cd "$PROJECT_ROOT"

# API Documentation Site
info "Deploying API Documentation Site to Pages..."
cd "$PROJECT_ROOT/docs-site"
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler pages project create cinacoin-docs --production-branch main 2>/dev/null || true
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler pages deploy .vitepress/dist --project-name=cinacoin-docs
log "API Documentation Site deployed to Pages!"

echo ""
log "🎉 All Cloudflare deployments completed!"
echo ""
echo "Deployed Workers (.cinagroup.workers.dev):"
echo "  • cinacoin-rpc-proxy"
echo "  • cinacoin-keys-server"
echo "  • cinacoin-relay-server"
echo "  • cinacoin-notify-server"
echo "  • cinacoin-push-server"
echo ""
echo "Deployed Pages (.pages.dev):"
echo "  • backend-dashboard"
echo "  • cinacoin-health-status"
echo "  • cinacoin-docs"