#!/usr/bin/env bash
# check-health.sh — Health check for CinaCoin Cloudflare Workers
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' CYAN='\033[0;36m' NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }

# ── Usage ───────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Run health checks against deployed Cloudflare Workers services.

Options:
  -e, --environment ENV   Target environment (staging|production) [default: production]
  -t, --timeout SECS      Request timeout in seconds [default: 10]
  -r, --retries N         Number of retry attempts [default: 3]
  -s, --service SVC       Check only a specific service (rpc-proxy|keys-server|relay|notify|push|all)
  -v, --verbose           Show full response bodies
  -h, --help              Show this help message

Environment Variables:
  RPC_PROXY_URL      Override RPC Proxy URL
  KEYS_SERVER_URL    Override Keys Server URL
  RELAY_SERVER_URL   Override Relay Server URL
  NOTIFY_SERVER_URL  Override Notify Server URL
  PUSH_SERVER_URL    Override Push Server URL

Examples:
  $(basename "$0")                          # Check all services in production
  $(basename "$0") -e staging               # Check staging environment
  $(basename "$0") -s rpc-proxy             # Check only RPC Proxy
  $(basename "$0") -s relay                 # Check only Relay Server
  $(basename "$0") -v --retries 5           # Verbose, 5 retries
EOF
  exit 0
}

# ── Parse args ──────────────────────────────────────────────────
ENVIRONMENT="production"
TIMEOUT=10
RETRIES=3
SERVICE_FILTER="all"
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--environment) ENVIRONMENT="$2";     shift 2 ;;
    -t|--timeout)     TIMEOUT="$2";         shift 2 ;;
    -r|--retries)     RETRIES="$2";         shift 2 ;;
    -s|--service)     SERVICE_FILTER="$2";  shift 2 ;;
    -v|--verbose)     VERBOSE=true;         shift   ;;
    -h|--help)        usage                         ;;
    *)                err "Unknown option: $1"; usage ;;
  esac
done

# ── URLs ────────────────────────────────────────────────────────
# Use environment variables if set, otherwise use default domains/worker URLs
RPC_PROXY_URL="${RPC_PROXY_URL:-https://cinacoin-rpc-proxy.workers.dev}"
KEYS_SERVER_URL="${KEYS_SERVER_URL:-https://cinacoin-keys-server.workers.dev}"
RELAY_SERVER_URL="${RELAY_SERVER_URL:-https://relay.cinacoin.com}"
NOTIFY_SERVER_URL="${NOTIFY_SERVER_URL:-https://notify.cinacoin.com}"
PUSH_SERVER_URL="${PUSH_SERVER_URL:-https://push.cinacoin.com}"

if [[ "$ENVIRONMENT" == "staging" ]]; then
  RPC_PROXY_URL="${RPC_PROXY_URL_STAGING:-${RPC_PROXY_URL/staging/}}"
  KEYS_SERVER_URL="${KEYS_SERVER_URL_STAGING:-${KEYS_SERVER_URL/staging/}}"
  RELAY_SERVER_URL="${RELAY_SERVER_URL_STAGING:-${RELAY_SERVER_URL/staging/}}"
  NOTIFY_SERVER_URL="${NOTIFY_SERVER_URL_STAGING:-${NOTIFY_SERVER_URL/staging/}}"
  PUSH_SERVER_URL="${PUSH_SERVER_URL_STAGING:-${PUSH_SERVER_URL/staging/}}"
fi

# ── Health check function ───────────────────────────────────────
check_endpoint() {
  local name="$1"
  local url="$2"
  local path="${3:-/health}"
  local full_url="${url}${path}"
  local attempt=0
  local success=false

  info "Checking: $name → $full_url"

  while [[ $attempt -lt $RETRIES ]]; do
    attempt=$((attempt + 1))

    if [[ "$VERBOSE" == true ]]; then
      RESPONSE=$(curl -sf -w "\n%{http_code}" --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$full_url" 2>&1) || true
    else
      HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$full_url" 2>&1) || HTTP_CODE="000"
    fi

    if [[ "$HTTP_CODE" =~ ^[23][0-9][0-9]$ ]]; then
      log "$name is healthy (HTTP $HTTP_CODE, attempt $attempt/$RETRIES)"
      success=true
      break
    fi

    warn "$name returned HTTP $HTTP_CODE (attempt $attempt/$RETRIES)"
    
    if [[ $attempt -lt $RETRIES ]]; then
      sleep 2
    fi
  done

  if [[ "$success" != true ]]; then
    err "$name is unhealthy after $RETRIES attempts"
    return 1
  fi
  return 0
}

# ── Run checks ──────────────────────────────────────────────────
info "CinaCoin Cloudflare Workers — Health Check"
info "Environment: $ENVIRONMENT"
info "Timeout: ${TIMEOUT}s | Retries: $RETRIES"
info "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

OVERALL_EXIT=0
CHECK_RESULTS=()

check_service() {
  local service="$1"
  
  case "$service" in
    rpc-proxy)
      if check_endpoint "RPC Proxy" "$RPC_PROXY_URL" "/health"; then
        CHECK_RESULTS+=("rpc-proxy:healthy")
      else
        CHECK_RESULTS+=("rpc-proxy:unhealthy")
        OVERALL_EXIT=1
      fi
      ;;
    keys-server)
      if check_endpoint "Keys Server" "$KEYS_SERVER_URL" "/health"; then
        CHECK_RESULTS+=("keys-server:healthy")
      else
        CHECK_RESULTS+=("keys-server:unhealthy")
        OVERALL_EXIT=1
      fi
      ;;
    relay)
      if check_endpoint "Relay Server" "$RELAY_SERVER_URL" "/health"; then
        CHECK_RESULTS+=("relay:healthy")
      else
        CHECK_RESULTS+=("relay:unhealthy")
        OVERALL_EXIT=1
      fi
      ;;
    notify)
      if check_endpoint "Notify Server" "$NOTIFY_SERVER_URL" "/health"; then
        CHECK_RESULTS+=("notify:healthy")
      else
        CHECK_RESULTS+=("notify:unhealthy")
        OVERALL_EXIT=1
      fi
      ;;
    push)
      if check_endpoint "Push Server" "$PUSH_SERVER_URL" "/health"; then
        CHECK_RESULTS+=("push:healthy")
      else
        CHECK_RESULTS+=("push:unhealthy")
        OVERALL_EXIT=1
      fi
      ;;
  esac
}

if [[ "$SERVICE_FILTER" == "rpc-proxy" || "$SERVICE_FILTER" == "all" ]]; then
  check_service "rpc-proxy"
  echo ""
fi

if [[ "$SERVICE_FILTER" == "keys-server" || "$SERVICE_FILTER" == "all" ]]; then
  check_service "keys-server"
  echo ""
fi

if [[ "$SERVICE_FILTER" == "relay" || "$SERVICE_FILTER" == "all" ]]; then
  check_service "relay"
  echo ""
fi

if [[ "$SERVICE_FILTER" == "notify" || "$SERVICE_FILTER" == "all" ]]; then
  check_service "notify"
  echo ""
fi

if [[ "$SERVICE_FILTER" == "push" || "$SERVICE_FILTER" == "all" ]]; then
  check_service "push"
  echo ""
fi

# ── Summary ─────────────────────────────────────────────────────
info "═══════════════════════════════════════════"
info " Health Check Summary"
info "═══════════════════════════════════════════"

for result in "${CHECK_RESULTS[@]}"; do
  svc="${result%%:*}"
  status="${result##*:}"
  if [[ "$status" == "healthy" ]]; then
    log "$svc → $status"
  else
    err "$svc → $status"
  fi
done

HEALTHY_COUNT=0
UNHEALTHY_COUNT=0
for result in "${CHECK_RESULTS[@]}"; do
  status="${result##*:}"
  [[ "$status" == "healthy" ]] && ((HEALTHY_COUNT++)) || ((UNHEALTHY_COUNT++))
done

echo ""
info "Healthy: $HEALTHY_COUNT | Unhealthy: $UNHEALTHY_COUNT | Total: ${#CHECK_RESULTS[@]}"

if [[ $OVERALL_EXIT -ne 0 ]]; then
  err "One or more services are unhealthy"
  exit $OVERALL_EXIT
fi

log "All health checks passed ✓"
