#!/bin/bash
set -e

# Cloudflare Workers Health Check Script
# Checks the status of all deployed CinaCoin Cloudflare Workers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Worker endpoints (replace with actual URLs after deployment)
WORKERS=(
    "wss://relay.cinacoin.com/health"
    "https://notify.cinacoin.com/health"
    "https://push.cinacoin.com/health"
)

echo -e "${BLUE}🔍 CinaCoin Cloudflare Workers Health Check${NC}"
echo ""

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl not found. Please install curl.${NC}"
    exit 1
fi

# Check each worker
for worker_url in "${WORKERS[@]}"; do
    echo -e "${YELLOW}Checking:${NC} $worker_url"

    # Extract worker name from URL
    worker_name=$(echo "$worker_url" | sed -n 's|.*\.\([^/]*\)\.com.*|\1|p' | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')

    # Make request with timeout
    if curl --max-time 5 --silent --show-error --fail "$worker_url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $worker_name is healthy${NC}"
    else
        echo -e "${RED}❌ $worker_name is unhealthy or unreachable${NC}"
    fi
    echo ""
done

# Alternative: check using wrangler
echo -e "${BLUE}📊 Worker Status via wrangler:${NC}"
echo ""

if command -v wrangler &> /dev/null; then
    echo "Checking wrangler status..."
    wrangler status --json 2>/dev/null || echo -e "${YELLOW}Unable to fetch wrangler status${NC}"
else
    echo -e "${YELLOW}wrangler CLI not found. Install with: pnpm add -g wrangler${NC}"
fi

echo ""
echo -e "${GREEN}✅ Health check completed!${NC}"