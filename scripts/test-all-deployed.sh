#!/bin/bash
set -e

# CinaCoin Full Functionality Test Script
# Tests all deployed applications and Workers

CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"  # Set via environment or .env

# Colors
RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' CYAN='\033[0;36m' BLUE='\033[0;34m' NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }
test_label() { echo -e "${BLUE}[TEST]${NC} $*"; }

# Counter for failures
FAILURES=0
SUCCESS_TESTS=0
TOTAL_TESTS=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    local pattern="${4:-}"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    test_label "$name"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$HTTP_CODE" = "$expected_code" ]; then
        if [ -n "$pattern" ]; then
            BODY=$(curl -s "$url")
            if echo "$BODY" | grep -q "$pattern"; then
                log "✓ HTTP $HTTP_CODE (contains pattern)"
                SUCCESS_TESTS=$((SUCCESS_TESTS + 1))
            else
                warn "✗ HTTP $HTTP_CODE but pattern not found"
                FAILURES=$((FAILURES + 1))
            fi
        else
            log "✓ HTTP $HTTP_CODE"
            SUCCESS_TESTS=$((SUCCESS_TESTS + 1))
        fi
    else
        err "✗ Expected HTTP $expected_code, got $HTTP_CODE"
        FAILURES=$((FAILURES + 1))
    fi
    echo ""
}

# Main
echo "=================================================="
echo "  CinaCoin Complete Functionality Test"
echo "=================================================="
echo ""

# ============================================================================
# SECTION 1: Workers Health Checks
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION 1: Workers Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "RPC Proxy - Health" \
    "https://cinacoin-rpc-proxy.cinagroup.workers.dev/health" \
    200 \
    "\"status\":\"ok\""

test_endpoint "Keys Server - Health" \
    "https://cinacoin-keys-server.cinagroup.workers.dev/health" \
    200 \
    "\"status\":\"ok\""

test_endpoint "Relay Server - Health" \
    "https://cinacoin-relay-server.cinagroup.workers.dev/health" \
    200 \
    "\"status\":\"ok\""

test_endpoint "Notify Server - Health" \
    "https://cinacoin-notify-server.cinagroup.workers.dev/health" \
    200 \
    "\"status\":\"ok\""

test_endpoint "Push Server - Health" \
    "https://cinacoin-push-server.cinagroup.workers.dev/health" \
    200 \
    "\"status\":\"ok\""

# ============================================================================
# SECTION 2: Workers Metrics Endpoints
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION 2: Workers Metrics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "RPC Proxy - Metrics" \
    "https://cinacoin-rpc-proxy.cinagroup.workers.dev/metrics" \
    200

test_endpoint "Keys Server - Metrics" \
    "https://cinacoin-keys-server.cinagroup.workers.dev/metrics" \
    200

test_endpoint "Relay Server - Metrics" \
    "https://cinacoin-relay-server.cinagroup.workers.dev/metrics" \
    200

test_endpoint "Notify Server - Metrics" \
    "https://cinacoin-notify-server.cinagroup.workers.dev/metrics" \
    200

test_endpoint "Push Server - Metrics" \
    "https://cinacoin-push-server.cinagroup.workers.dev/metrics" \
    200

# ============================================================================
# SECTION 3: Frontend Pages - Homepages
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION 3: Frontend Pages - Homepages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "Demo App - Homepage" \
    "https://cinacoin-demo.pages.dev/" \
    200 \
    "CinaCoin"

test_endpoint "Backend Dashboard - Homepage" \
    "https://backend-dashboard.pages.dev/" \
    200 \
    "Dashboard"

test_endpoint "Health Status Page - Homepage" \
    "https://cinacoin-health-status.pages.dev/" \
    200 \
    "Service Status"

test_endpoint "API Documentation Site - Homepage" \
    "https://cinacoin-docs.pages.dev/" \
    200 \
    "CinaCoin"

# ============================================================================
# SECTION 4: Backend Dashboard Pages
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION 4: Backend Dashboard Pages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "Backend Dashboard - RPC Proxy Page" \
    "https://backend-dashboard.pages.dev/rpc-proxy" \
    200

test_endpoint "Backend Dashboard - Keys Server Page" \
    "https://backend-dashboard.pages.dev/keys-server" \
    200

test_endpoint "Backend Dashboard - Relay Server Page" \
    "https://backend-dashboard.pages.dev/relay-server" \
    200

test_endpoint "Backend Dashboard - Notify Server Page" \
    "https://backend-dashboard.pages.dev/notify-server" \
    200

test_endpoint "Backend Dashboard - Push Server Page" \
    "https://backend-dashboard.pages.dev/push-server" \
    200

test_endpoint "Backend Dashboard - Settings Page" \
    "https://backend-dashboard.pages.dev/settings" \
    200

# ============================================================================
# SECTION 5: API Documentation Pages
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION 5: API Documentation Pages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "API Docs - Quick Start" \
    "https://cinacoin-docs.pages.dev/guide/quick-start" \
    200

test_endpoint "API Docs - Installation" \
    "https://cinacoin-docs.pages.dev/guide/installation" \
    200

test_endpoint "API Docs - Core SDK" \
    "https://cinacoin-docs.pages.dev/api/core-sdk" \
    200

test_endpoint "API Docs - React SDK" \
    "https://cinacoin-docs.pages.dev/api/react" \
    200

# ============================================================================
# Test Summary
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
else
    echo -e "${RED}⚠️  $FAILURES test(s) failed${NC}"
fi

echo ""
echo "Total: $TOTAL_TESTS"
echo -e "Success: ${GREEN}$SUCCESS_TESTS${NC}"
if [ $FAILURES -gt 0 ]; then
    echo -e "Failed: ${RED}$FAILURES${NC}"
fi
echo ""

if [ $FAILURES -eq 0 ]; then
    exit 0
else
    exit 1
fi