#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' CYAN='\033[0;36m' NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }

ENVIRONMENT="production"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--environment) ENVIRONMENT="$2"; shift 2 ;;
    -d|--dry-run)     DRY_RUN=true;         shift   ;;
    -h|--help)        echo "Usage: $0 [-e|--environment] [-d|--dry-run] [-h|--help]"; exit 0 ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

info "Deploying cinacoin-notify-server ($ENVIRONMENT)"
if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run mode — no actual deployment"
  exit 0
fi

cd "$PROJECT_ROOT/packages/notify-server"

# Build
info "Building notify-server..."
pnpm build

# Deploy
info "Deploying to Cloudflare..."
if [[ "$ENVIRONMENT" == "staging" ]]; then
  wrangler deploy --env staging
else
  wrangler deploy
fi

log "cinacoin-notify-server deployed successfully!"