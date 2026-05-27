#!/usr/bin/env bash
# deploy-all.sh — Deploy all CinaCoin Cloudflare Workers services
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STATE_FILE="$SCRIPT_DIR/.wrangler-state"

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

Deploy all CinaCoin Cloudflare Workers services in sequence.

Services deployed:
  1. cinacoin-rpc-proxy     — RPC Proxy (chain routing, caching, rate limiting)
  2. cinacoin-keys-server   — Keys Server (key management, encryption, sessions)
  3. cinacoin-relay-server  — Relay Server (WebSocket relay, real-time messaging)
  4. cinacoin-notify-server — Notify Server (notification dispatch)
  5. cinacoin-push-server   — Push Server (push notification delivery)

Options:
  -e, --environment ENV   Target environment (staging|production) [default: production]
  -d, --dry-run           Validate all services without deploying
  -m, --migrate           Run D1 migrations for keys-server
  -s, --service SVC       Deploy only a specific service (rpc-proxy|keys-server|relay|notify|push|all)
  -h, --help              Show this help message

Examples:
  $(basename "$0")                       # Deploy all to production
  $(basename "$0") -e staging            # Deploy all to staging
  $(basename "$0") -s rpc-proxy          # Deploy only RPC Proxy
  $(basename "$0") -s relay              # Deploy only Relay Server
  $(basename "$0") --dry-run             # Validate all without deploying
EOF
  exit 0
}

# ── Parse args ──────────────────────────────────────────────────
ENVIRONMENT="production"
DRY_RUN=false
RUN_MIGRATIONS=false
SERVICE_FILTER="all"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--environment) ENVIRONMENT="$2";     shift 2 ;;
    -d|--dry-run)     DRY_RUN=true;         shift   ;;
    -m|--migrate)     RUN_MIGRATIONS=true;  shift   ;;
    -s|--service)     SERVICE_FILTER="$2";  shift 2 ;;
    -h|--help)        usage                         ;;
    *)                err "Unknown option: $1"; usage ;;
  esac
done

# ── Validate service filter ─────────────────────────────────────
case "$SERVICE_FILTER" in
  rpc-proxy|keys-server|relay|notify|push|all) ;;
  *) err "Invalid service: $SERVICE_FILTER (valid: rpc-proxy, keys-server, relay, notify, push, all)"; exit 1 ;;
esac

# ── Deploy functions ────────────────────────────────────────────
deploy_rpc_proxy() {
  info "═══════════════════════════════════════════"
  info " Deploying: cinacoin-rpc-proxy"
  info "═══════════════════════════════════════════"
  local args=("-e" "$ENVIRONMENT")
  [[ "$DRY_RUN" == true ]] && args+=("--dry-run")
  "$SCRIPT_DIR/deploy-rpc-proxy.sh" "${args[@]}"
}

deploy_keys_server() {
  info "═══════════════════════════════════════════"
  info " Deploying: cinacoin-keys-server"
  info "═══════════════════════════════════════════"
  local args=("-e" "$ENVIRONMENT")
  [[ "$DRY_RUN" == true ]] && args+=("--dry-run")
  [[ "$RUN_MIGRATIONS" == true ]] && args+=("--migrate")
  "$SCRIPT_DIR/deploy-keys-server.sh" "${args[@]}"
}

deploy_relay_server() {
  info "═══════════════════════════════════════════"
  info " Deploying: cinacoin-relay-server"
  info "═══════════════════════════════════════════"
  local args=("-e" "$ENVIRONMENT")
  [[ "$DRY_RUN" == true ]] && args+=("--dry-run")
  "$SCRIPT_DIR/deploy-relay-server.sh" "${args[@]}"
}

deploy_notify_server() {
  info "═══════════════════════════════════════════"
  info " Deploying: cinacoin-notify-server"
  info "═══════════════════════════════════════════"
  local args=("-e" "$ENVIRONMENT")
  [[ "$DRY_RUN" == true ]] && args+=("--dry-run")
  "$SCRIPT_DIR/deploy-notify-server.sh" "${args[@]}"
}

deploy_push_server() {
  info "═══════════════════════════════════════════"
  info " Deploying: cinacoin-push-server"
  info "═══════════════════════════════════════════"
  local args=("-e" "$ENVIRONMENT")
  [[ "$DRY_RUN" == true ]] && args+=("--dry-run")
  "$SCRIPT_DIR/deploy-push-server.sh" "${args[@]}"
}

# ── Main ────────────────────────────────────────────────────────
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RESULTS=()
OVERALL_EXIT=0

info "CinaCoin Cloudflare Workers — Deploy All"
info "Environment: $ENVIRONMENT"
info "Dry run: $DRY_RUN"
info "Service filter: $SERVICE_FILTER"
info "Timestamp: $TIMESTAMP"
echo ""

if [[ "$SERVICE_FILTER" == "rpc-proxy" || "$SERVICE_FILTER" == "all" ]]; then
  if deploy_rpc_proxy; then
    RESULTS+=("rpc-proxy:success")
  else
    RESULTS+=("rpc-proxy:failed")
    OVERALL_EXIT=1
    warn "RPC Proxy deployment failed — continuing with remaining services"
  fi
  echo ""
fi

if [[ "$SERVICE_FILTER" == "keys-server" || "$SERVICE_FILTER" == "all" ]]; then
  if deploy_keys_server; then
    RESULTS+=("keys-server:success")
  else
    RESULTS+=("keys-server:failed")
    OVERALL_EXIT=1
    warn "Keys Server deployment failed"
  fi
  echo ""
fi

if [[ "$SERVICE_FILTER" == "relay" || "$SERVICE_FILTER" == "all" ]]; then
  if deploy_relay_server; then
    RESULTS+=("relay:success")
  else
    RESULTS+=("relay:failed")
    OVERALL_EXIT=1
    warn "Relay Server deployment failed — continuing with remaining services"
  fi
  echo ""
fi

if [[ "$SERVICE_FILTER" == "notify" || "$SERVICE_FILTER" == "all" ]]; then
  if deploy_notify_server; then
    RESULTS+=("notify:success")
  else
    RESULTS+=("notify:failed")
    OVERALL_EXIT=1
    warn "Notify Server deployment failed — continuing with remaining services"
  fi
  echo ""
fi

if [[ "$SERVICE_FILTER" == "push" || "$SERVICE_FILTER" == "all" ]]; then
  if deploy_push_server; then
    RESULTS+=("push:success")
  else
    RESULTS+=("push:failed")
    OVERALL_EXIT=1
    warn "Push Server deployment failed — continuing with remaining services"
  fi
  echo ""
fi

# ── Summary ─────────────────────────────────────────────────────
info "═══════════════════════════════════════════"
info " Deployment Summary"
info "═══════════════════════════════════════════"
for result in "${RESULTS[@]}"; do
  svc="${result%%:*}"
  status="${result##*:}"
  if [[ "$status" == "success" ]]; then
    log "$svc → $status"
  else
    err "$svc → $status"
  fi
done

# Update state file
SUCCESS_COUNT=0
FAILED_COUNT=0
for result in "${RESULTS[@]}"; do
  status="${result##*:}"
  [[ "$status" == "success" ]] && ((SUCCESS_COUNT++)) || ((FAILED_COUNT++))
done

cat > "$STATE_FILE" <<EOF
{"environment":"$ENVIRONMENT","timestamp":"$TIMESTAMP","total":${#RESULTS[@]},"success":$SUCCESS_COUNT,"failed":$FAILED_COUNT,"services":["${RESULTS[*]}"],"dry_run":$DRY_RUN,"commit":"$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo 'unknown')"}
EOF

if [[ $OVERALL_EXIT -ne 0 ]]; then
  err "One or more deployments failed"
  exit $OVERALL_EXIT
fi

log "All deployments complete 🚀"
