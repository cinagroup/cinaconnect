#!/bin/bash
set -e

# CinaCoin Cloudflare Workers Deployment Script (Workers Only)
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
deploy_worker() {
    local service_name=$1
    local package_dir=$2

    info "Deploying $service_name..."
    cd "$package_dir"

    # Build
    info "Building..."
    pnpm build

    # Deploy using wrangler with token
    info "Deploying to Cloudflare Workers..."
    CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler deploy

    log "$service_name deployed successfully!"
    cd "$PROJECT_ROOT"
}

# Main
info "CinaCoin Cloudflare Workers Deployment"
info "Account: CinaGroup ($CLOUDFLARE_ACCOUNT_ID)"
echo ""

# Deploy all Workers
deploy_worker "RPC Proxy" "$PROJECT_ROOT/packages/rpc-proxy"
deploy_worker "Keys Server" "$PROJECT_ROOT/packages/keys-server"
deploy_worker "Relay Server" "$PROJECT_ROOT/packages/relay-server"
deploy_worker "Notify Server" "$PROJECT_ROOT/packages/notify-server"
deploy_worker "Push Server" "$PROJECT_ROOT/packages/push-server"

echo ""
log "🎉 All Cloudflare Workers deployed successfully!"
echo ""
echo "Deployed Workers (.cinagroup.workers.dev):"
echo "  • cinacoin-rpc-proxy"
echo "  • cinacoin-keys-server"
echo "  • cinacoin-relay-server"
echo "  • cinacoin-notify-server"
echo "  • cinacoin-push-server"
echo ""
echo "Health check endpoints:"
echo "  • https://cinacoin-rpc-proxy.cinagroup.workers.dev/health"
echo "  • https://cinacoin-keys-server.cinagroup.workers.dev/health"
echo "  • https://cinacoin-relay-server.cinagroup.workers.dev/health"
echo "  • https://cinacoin-notify-server.cinagroup.workers.dev/health"
echo "  • https://cinacoin-push-server.cinagroup.workers.dev/health"