#!/usr/bin/env bash
# deploy-rpc-proxy.sh — Deploy CinaCoin RPC Proxy to Cloudflare Workers
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PACKAGE_DIR="$PROJECT_ROOT/packages/rpc-proxy"
CF_DIR="$PACKAGE_DIR/cloudflare"
STATE_FILE="$SCRIPT_DIR/.wrangler-state"
SERVICE="cinacoin-rpc-proxy"

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

Deploy CinaCoin RPC Proxy to Cloudflare Workers.

Options:
  -e, --environment ENV   Target environment (staging|production) [default: production]
  -d, --dry-run           Run wrangler deploy --dry-run (no actual deploy)
  -r, --route             Specify a custom route to set after deploy
  -h, --help              Show this help message

Environment:
  production  Deploys with wrangler.toml as-is
  staging     Deploys with --env staging (requires [env.staging] in wrangler.toml)

Examples:
  $(basename "$0")                    # Deploy to production
  $(basename "$0") -e staging         # Deploy to staging
  $(basename "$0") --dry-run          # Validate without deploying
EOF
  exit 0
}

# ── Parse args ──────────────────────────────────────────────────
ENVIRONMENT="production"
DRY_RUN=false
ROUTE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--environment) ENVIRONMENT="$2"; shift 2 ;;
    -d|--dry-run)     DRY_RUN=true;     shift   ;;
    -r|--route)       ROUTE="$2";       shift 2 ;;
    -h|--help)        usage                       ;;
    *)                err "Unknown option: $1"; usage ;;
  esac
done

# ── Pre-flight checks ───────────────────────────────────────────
info "Pre-flight checks for $SERVICE..."

if ! command -v wrangler &>/dev/null; then
  err "wrangler CLI not found. Install with: npm install -g wrangler"
  exit 1
fi

if [[ ! -d "$PACKAGE_DIR" ]]; then
  err "Package directory not found: $PACKAGE_DIR"
  exit 1
fi

if [[ ! -f "$CF_DIR/wrangler.toml" ]]; then
  err "wrangler.toml not found at $CF_DIR/wrangler.toml"
  exit 1
fi

if [[ "$ENVIRONMENT" == "staging" ]] && ! grep -q '\[env\.staging\]' "$CF_DIR/wrangler.toml"; then
  warn "No [env.staging] section found in wrangler.toml — deploying with production config"
fi

info "wrangler version: $(wrangler --version 2>/dev/null | head -1)"

# ── Deploy ──────────────────────────────────────────────────────
cd "$CF_DIR"

info "Working directory: $(pwd)"
info "Environment: $ENVIRONMENT"
info "Dry run: $DRY_RUN"

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

DEPLOY_CMD="wrangler deploy"

if [[ "$DRY_RUN" == true ]]; then
  DEPLOY_CMD="$DEPLOY_CMD --dry-run --outdir=/tmp/wrangler-rpc-proxy-build"
  warn "Running dry-run — no changes will be published"
fi

if [[ "$ENVIRONMENT" == "staging" ]]; then
  DEPLOY_CMD="$DEPLOY_CMD --env staging"
fi

if [[ -n "$ROUTE" ]]; then
  DEPLOY_CMD="$DEPLOY_CMD --routes $ROUTE"
fi

info "Running: $DEPLOY_CMD"

set +e
eval "$DEPLOY_CMD"
DEPLOY_EXIT=$?
set -e

if [[ $DEPLOY_EXIT -ne 0 ]]; then
  err "Deployment failed with exit code $DEPLOY_EXIT"
  # Update state file with failure
  cat > "$STATE_FILE" <<EOF
{"service":"cinacoin-rpc-proxy","environment":"$ENVIRONMENT","timestamp":"$TIMESTAMP","status":"failed","exit_code":$DEPLOY_EXIT,"commit":"$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo 'unknown')"}
EOF
  exit $DEPLOY_EXIT
fi

# ── Post-deploy ─────────────────────────────────────────────────
log "$SERVICE deployed successfully to $ENVIRONMENT"

# Record deployment state
cat > "$STATE_FILE" <<EOF
{"service":"cinacoin-rpc-proxy","environment":"$ENVIRONMENT","timestamp":"$TIMESTAMP","status":"success","commit":"$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo 'unknown')","dry_run":$DRY_RUN}
EOF

# Append to history (keep last 50 entries)
if [[ -f "${STATE_FILE}.history" ]]; then
  tail -n 49 "${STATE_FILE}.history" > "${STATE_FILE}.history.tmp"
  mv "${STATE_FILE}.history.tmp" "${STATE_FILE}.history"
fi
echo "{\"service\":\"cinacoin-rpc-proxy\",\"environment\":\"$ENVIRONMENT\",\"timestamp\":\"$TIMESTAMP\",\"status\":\"success\",\"commit\":\"$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo 'unknown')\"}" >> "${STATE_FILE}.history"

# ── Optional health check ───────────────────────────────────────
if [[ "$DRY_RUN" != true ]]; then
  info "Running post-deploy health check..."
  sleep 3

  # Try to get the worker URL from wrangler output
  WORKER_URL="${RPC_PROXY_URL:-https://cinacoin-rpc-proxy.${CF_ACCOUNT_SUBDOMAIN:-workers.dev}}"
  
  if command -v curl &>/dev/null; then
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$WORKER_URL/health" 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 400 ]]; then
      log "Health check passed (HTTP $HTTP_CODE): $WORKER_URL/health"
    else
      warn "Health check returned HTTP $HTTP_CODE — verify manually: $WORKER_URL"
    fi
  fi
fi

log "Deployment complete 🚀"
