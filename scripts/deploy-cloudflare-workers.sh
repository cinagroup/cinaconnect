#!/bin/bash
set -e

# CinaCoin Cloudflare Workers Deployment Script
# Deploys Relay, Notify, and Push servers to Cloudflare

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Deployment function
deploy_service() {
    local service_name=$1
    local package_dir=$2
    local environment=${3:-production}

    echo -e "${GREEN}🚀 Deploying $service_name ($environment)...${NC}"

    cd "$package_dir"

    # Build the package
    echo "Building $service_name..."
    pnpm build

    # Deploy with wrangler
    echo "Deploying to Cloudflare..."
    if [ "$environment" = "staging" ]; then
        wrangler deploy --env staging
    else
        wrangler deploy
    fi

    echo -e "${GREEN}✅ $service_name deployed successfully!${NC}"
    cd "$PROJECT_ROOT"
}

# Parse arguments
ENVIRONMENT="production"
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [-e|--environment production|staging] [-s|--skip-build] [-h|--help]"
            echo ""
            echo "Options:"
            echo "  -e, --environment  Environment to deploy (default: production)"
            echo "  -s, --skip-build   Skip building packages (use existing dist/)"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}📦 CinaCoin Cloudflare Workers Deployment${NC}"
echo "Environment: $ENVIRONMENT"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ wrangler CLI not found. Installing...${NC}"
    pnpm add -g wrangler
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Cloudflare. Please run: wrangler login${NC}"
    exit 1
fi

# Deploy services
deploy_service "Relay Server" "$PROJECT_ROOT/packages/relay-server" "$ENVIRONMENT"
deploy_service "Notify Server" "$PROJECT_ROOT/packages/notify-server" "$ENVIRONMENT"
deploy_service "Push Server" "$PROJECT_ROOT/packages/push-server" "$ENVIRONMENT"

echo ""
echo -e "${GREEN}🎉 All Cloudflare Workers deployed successfully!${NC}"
echo ""
echo "Deployed services:"
echo "  • cinacoin-relay-server"
echo "  • cinacoin-notify-server"
echo "  • cinacoin-push-server"
echo ""
echo "To verify deployment, run:"
echo "  ./scripts/check-cloudflare-workers.sh"