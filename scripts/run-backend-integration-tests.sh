#!/usr/bin/env bash
# run-backend-integration-tests.sh — Build and run CinaCoin backend integration tests
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' CYAN='\033[0;36m' BOLD='\033[1m' NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }
hdr()  { echo -e "${BOLD}${CYAN}═══════════════════════════════════════════${NC}"; }

# ── Parse args ─────────────────────────────────────────────────
RUN_COVERAGE=false
REPORT_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --coverage)  RUN_COVERAGE=true; shift ;;
    --report)    REPORT_ONLY=true; shift ;;
    -h|--help)
      echo "Usage: $(basename "$0") [--coverage] [--report]"
      echo ""
      echo "Options:"
      echo "  --coverage   Include code coverage report"
      echo "  --report     Only show existing report (do not run tests)"
      echo "  -h, --help   Show this help"
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Pre-flight checks ─────────────────────────────────────────
check_dep() {
  if ! command -v "$1" &>/dev/null; then
    err "Required command not found: $1"
    err "Install it and try again."
    exit 1
  fi
}

check_dep node
check_dep pnpm

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  err "Node.js >= 18 required (found $NODE_VERSION)"
  exit 1
fi

# ── Report only mode ──────────────────────────────────────────
if [[ "$REPORT_ONLY" == true ]]; then
  REPORT_FILE="$SCRIPT_DIR/test-report-$(date +%Y%m%d-%H%M%S).md"
  if [[ -f "$PROJECT_ROOT/coverage/backend-integration/summary.json" ]]; then
    info "Existing coverage found at $PROJECT_ROOT/coverage/backend-integration/"
    cp -r "$PROJECT_ROOT/coverage/backend-integration" "$SCRIPT_DIR/coverage-latest" 2>/dev/null || true
  fi
  if [[ -f "$SCRIPT_DIR/results.json" ]]; then
    info "Last test results:"
    cat "$SCRIPT_DIR/results.json"
  else
    warn "No previous test results found. Run without --report first."
  fi
  exit 0
fi

# ── Step 1: Install dependencies ─────────────────────────────
hdr
info "Step 1/5: Installing dependencies"
cd "$PROJECT_ROOT"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
log "Dependencies installed"

# ── Step 2: Build backend services ────────────────────────────
hdr
info "Step 2/5: Building backend services"

SERVICES=("rpc-proxy" "keys-server" "relay-server" "notify-server" "push-server")
BUILD_RESULTS=()

for svc in "${SERVICES[@]}"; do
  echo ""
  info "  Building @cinacoin/$svc ..."
  if (cd "$PROJECT_ROOT/packages/$svc" && pnpm run build 2>&1 | tail -3); then
    log "  @cinacoin/$svc → built"
    BUILD_RESULTS+=("$svc:success")
  else
    warn "  @cinacoin/$svc → build failed (may not affect integration tests if dist exists)"
    BUILD_RESULTS+=("$svc:skipped")
  fi
done

echo ""
log "Build phase complete"

# ── Step 3: Run integration tests ─────────────────────────────
hdr
info "Step 3/5: Running integration tests"

TEST_CMD="pnpm vitest run --config vitest.config.backend-integration.ts"

if [[ "$RUN_COVERAGE" == true ]]; then
  TEST_CMD="$TEST_CMD --coverage"
fi

TEST_START=$(date +%s)
echo ""
if $TEST_CMD 2>&1; then
  TEST_EXIT=0
  log "All tests passed"
else
  TEST_EXIT=$?
  err "Tests failed with exit code $TEST_EXIT"
fi
TEST_END=$(date +%s)
TEST_DURATION=$((TEST_END - TEST_START))

# ── Step 4: Generate test report ──────────────────────────────
hdr
info "Step 4/5: Generating test report"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_FILE="$SCRIPT_DIR/test-report-$(date +%Y%m%d-%H%M%S).md"

# Collect test counts from vitest output if available
cat > "$REPORT_FILE" <<EOF
# CinaCoin Backend Integration Test Report

**Generated:** $TIMESTAMP
**Duration:** ${TEST_DURATION}s
**Exit Code:** $TEST_EXIT

## Services Tested

| Service | Build | Tests |
|---------|-------|-------|
EOF

for result in "${BUILD_RESULTS[@]}"; do
  svc="${result%%:*}"
  status="${result##*:}"
  icon="❓"
  [[ "$status" == "success" ]] && icon="✅"
  [[ "$status" == "skipped" ]] && icon="⚠️"
  echo "| @cinacoin/$svc | $icon $status | integrated |" >> "$REPORT_FILE"
done

cat >> "$REPORT_FILE" <<EOF

## Test Scenarios

### Health Checks
- All 5 service classes importable
- Public API methods present
- HTTP health endpoints (RelayServer)
- Session creation/validation/expiration

### RPC Proxy
- Chain routing configuration
- Default chain fallback
- Read-only method caching
- Rate limiting (per-IP)
- HTTP method validation (POST only)

### Keys Server
- Key storage and retrieval
- AES-256-GCM encryption round-trip
- Key deletion and listing
- Session creation with permissions
- Session expiration and revocation
- Various key sizes (1–256 bytes)
- IV uniqueness per encryption

### Relay Server
- HTTP /health endpoint
- WebSocket connection lifecycle
- Message publishing and relay
- Topic subscription management
- Stats tracking
- Connection cleanup on close

### Notify Server
- Multi-channel subscription (push/email/webhook)
- Channel merging and deduplication
- Selective unsubscription
- Notification delivery per channel
- Notification ID uniqueness

### Push Server
- APNs notification delivery (simulated)
- FCM notification delivery (simulated)
- Batch notification sending
- Delivery log management
- Device registration flow
- Config validation (missing APNs/FCM)

### Cross-Service Flows
- Wallet Connect → Relay → Notify
- Key Storage → Session → Push
- RPC Proxy → Relay → Notification
- Full Wallet Lifecycle
- Multi-Service Error Recovery
- Independent service instances

## Configuration

- **Test runner:** Vitest (node environment)
- **Config file:** vitest.config.backend-integration.ts
- **Mock utilities:** mocks/mock-*.ts
- **No external dependencies:** All tests run locally

## Exit

\`\`\`
Exit code: $TEST_EXIT
\`\`\`
EOF

log "Report saved: $REPORT_FILE"

# ── Step 5: Summary ───────────────────────────────────────────
hdr
info "Step 5/5: Summary"

echo ""
info "Build results:"
for result in "${BUILD_RESULTS[@]}"; do
  svc="${result%%:*}"
  status="${result##*:}"
  if [[ "$status" == "success" ]]; then
    log "  @cinacoin/$svc"
  else
    warn "  @cinacoin/$svc ($status)"
  fi
done

echo ""
if [[ $TEST_EXIT -eq 0 ]]; then
  log "All integration tests passed in ${TEST_DURATION}s 🎉"
else
  err "Integration tests failed (exit code: $TEST_EXIT)"
fi

echo ""
info "Report: $REPORT_FILE"
if [[ "$RUN_COVERAGE" == true ]] && [[ -d "$PROJECT_ROOT/coverage" ]]; then
  info "Coverage: $PROJECT_ROOT/coverage/"
fi

exit $TEST_EXIT
