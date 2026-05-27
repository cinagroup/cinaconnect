#!/usr/bin/env bash
#
# verify-delivery.sh — Verify CinaCoin delivery package completeness
#
# Usage:
#   ./scripts/verify-delivery.sh              # Full verification
#   ./scripts/verify-delivery.sh --quick      # Core checks only
#   ./scripts/verify-delivery.sh --json       # JSON output
#
# This script verifies that the DELIVERY/ directory contains all required
# files, symlinks are valid, and key artifacts are present.

set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Counters ──
PASS=0
FAIL=0
WARN=0
TOTAL=0

# ── Mode ──
QUICK=false
JSON_OUTPUT=false

for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=true ;;
    --json) JSON_OUTPUT=true ;;
    -h|--help)
      echo "Usage: $0 [--quick] [--json]"
      echo "  --quick   Run only core checks"
      echo "  --json    Output results as JSON"
      exit 0
      ;;
  esac
done

# ── Find repo root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DELIVERY_DIR="$REPO_ROOT/DELIVERY"

# ── Helpers ──
info()    { echo -e "${BLUE}ℹ  $1${NC}"; }
pass()    { echo -e "${GREEN}✓  $1${NC}"; PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); }
fail()    { echo -e "${RED}✗  $1${NC}"; FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); }
warn_fn() { echo -e "${YELLOW}⚠  $1${NC}"; WARN=$((WARN + 1)); TOTAL=$((TOTAL + 1)); }

check_file() {
  local path="$1"
  local label="$2"
  if [[ -e "$path" ]]; then
    pass "$label"
  else
    fail "$label — missing: $path"
  fi
}

check_symlink() {
  local path="$1"
  local label="$2"
  if [[ -L "$path" ]] && [[ -e "$path" ]]; then
    pass "$label (symlink OK)"
  elif [[ -L "$path" ]]; then
    fail "$label (broken symlink)"
  else
    fail "$label (not a symlink or missing)"
  fi
}

check_dir() {
  local path="$1"
  local label="$2"
  if [[ -d "$path" ]]; then
    pass "$label"
  else
    fail "$label — missing directory: $path"
  fi
}

check_min_count() {
  local pattern="$1"
  local min="$2"
  local label="$3"
  local count
  count=$(find "$pattern" -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  # subtract 1 because find includes the base dir itself
  count=$((count))
  if [[ "$count" -ge "$min" ]]; then
    pass "$label ($count ≥ $min)"
  else
    fail "$label ($count < $min)"
  fi
}

# ── Main ──
echo ""
info "CinaCoin — Delivery Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Repo: $REPO_ROOT"
echo "  Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "  Mode: $(if $QUICK; then echo 'Quick'; else echo 'Full'; fi)"
echo ""

# ── 1. DELIVERY/ Directory Structure ──
info "1. Delivery Directory Structure"
echo "─────────────────────────────────"

check_dir "$DELIVERY_DIR" "DELIVERY/ directory exists"
check_dir "$DELIVERY_DIR/documentation" "documentation/ subdirectory"
check_dir "$DELIVERY_DIR/build-artifacts" "build-artifacts/ subdirectory"
check_dir "$DELIVERY_DIR/reports" "reports/ subdirectory"

check_file "$DELIVERY_DIR/README.md" "DELIVERY/README.md"
check_file "$DELIVERY_DIR/SETUP.md" "DELIVERY/SETUP.md"
check_file "$DELIVERY_DIR/LICENSE.md" "DELIVERY/LICENSE.md"

if [[ -e "$DELIVERY_DIR/CHANGELOG.md" ]]; then
  pass "CHANGELOG.md (present)"
else
  fail "CHANGELOG.md missing from DELIVERY/"
fi

# ── 2. Documentation Symlinks ──
if [[ "$QUICK" != true ]]; then
  echo ""
  info "2. Documentation Symlinks"
  echo "─────────────────────────────────"

  DOCS_DIR="$DELIVERY_DIR/documentation"

  check_symlink "$DOCS_DIR/README.md" "README.md"
  check_symlink "$DOCS_DIR/CHANGELOG.md" "CHANGELOG.md"
  check_symlink "$DOCS_DIR/ARCHITECTURE.md" "Master-Architecture.md"
  check_symlink "$DOCS_DIR/CONTRIBUTING.md" "CONTRIBUTING.md"
  check_symlink "$DOCS_DIR/DEVELOPMENT.md" "DEVELOPMENT.md"
  check_symlink "$DOCS_DIR/SECURITY.md" "SECURITY.md"
  check_symlink "$DOCS_DIR/CODE_OF_CONDUCT.md" "CODE_OF_CONDUCT.md"
  check_symlink "$DOCS_DIR/DELIVERY_CHECKLIST.md" "DELIVERY_CHECKLIST.md"
  check_symlink "$DOCS_DIR/PROJECT_SUMMARY.md" "PROJECT_SUMMARY.md"
  check_symlink "$DOCS_DIR/ROADMAP.md" "ROADMAP.md"
  check_symlink "$DOCS_DIR/CLOUDFLARE_DEPLOY.md" "CLOUDFLARE_DEPLOY.md"
  check_symlink "$DOCS_DIR/HONEST_AUDIT_V3.md" "HONEST_AUDIT_V3.md"
  check_symlink "$DOCS_DIR/Phase-1-Relay-RPC.md" "Phase 1 docs"
  check_symlink "$DOCS_DIR/Phase-2-UI-Components.md" "Phase 2 docs"
  check_symlink "$DOCS_DIR/Phase-3-Smart-Account.md" "Phase 3 docs"
  check_symlink "$DOCS_DIR/Phase-4-Production.md" "Phase 4 docs"
  check_symlink "$DOCS_DIR/Phase-5-Optimization.md" "Phase 5 docs"
  check_symlink "$DOCS_DIR/ACCEPTANCE_CRITERIA.md" "Acceptance criteria"
fi

# ── 3. Build Artifacts ──
echo ""
info "3. Build Artifacts"
echo "─────────────────────────────────"

BA_DIR="$DELIVERY_DIR/build-artifacts"

check_symlink "$BA_DIR/packages-dist" "packages/ dist directories"
check_symlink "$BA_DIR/deploy" "deploy/ directory"
check_file "$BA_DIR/package.json" "package.json"
check_file "$BA_DIR/turbo.json" "turbo.json"
check_file "$BA_DIR/tsconfig.json" "tsconfig.json"
check_file "$BA_DIR/pnpm-workspace.yaml" "pnpm-workspace.yaml"
check_file "$BA_DIR/.env.example" ".env.example"

# Count packages with dist/
check_min_count "$REPO_ROOT/packages" 50 "Packages with dist/ directories"

# ── 4. Reports ──
if [[ "$QUICK" != true ]]; then
  echo ""
  info "4. Reports"
  echo "─────────────────────────────────"

  RPT_DIR="$DELIVERY_DIR/reports"

  check_file "$RPT_DIR/benchmark-results.json" "Benchmark results"
  check_dir "$RPT_DIR/test-coverage" "Test coverage reports"
  check_dir "$RPT_DIR/analysis" "Analysis docs"
  check_dir "$RPT_DIR/analysis-v2" "Analysis v2 docs"
fi

# ── 5. Core Project Integrity ──
if [[ "$QUICK" != true ]]; then
  echo ""
  info "5. Core Project Integrity"
  echo "─────────────────────────────────"

  check_file "$REPO_ROOT/package.json" "Root package.json"
  check_file "$REPO_ROOT/pnpm-lock.yaml" "pnpm-lock.yaml"
  check_file "$REPO_ROOT/turbo.json" "turbo.json"
  check_file "$REPO_ROOT/vitest.workspace.ts" "vitest.workspace.ts"
  check_file "$REPO_ROOT/docker-compose.yml" "docker-compose.yml"
  check_file "$REPO_ROOT/Dockerfile" "Dockerfile"
  check_file "$REPO_ROOT/.env.example" ".env.example"
  check_file "$REPO_ROOT/LICENSE" "LICENSE file"

  # Check key packages exist
  check_dir "$REPO_ROOT/packages/core-sdk" "@cinacoin/core-sdk"
  check_dir "$REPO_ROOT/packages/core-ui" "@cinacoin/core-ui"
  check_dir "$REPO_ROOT/packages/react" "@cinacoin/react"
  check_dir "$REPO_ROOT/packages/i18n" "@cinacoin/i18n"
  check_dir "$REPO_ROOT/packages/cli" "@cinacoin/cli"
  check_dir "$REPO_ROOT/packages/bundler" "@cinacoin/bundler"
fi

# ── 6. Deployment Readiness ──
if [[ "$QUICK" != true ]]; then
  echo ""
  info "6. Deployment Readiness"
  echo "─────────────────────────────────"

  check_file "$REPO_ROOT/deploy-cloudflare.sh" "Cloudflare deploy script"
  check_dir "$REPO_ROOT/deploy" "deploy/ directory"
  check_file "$REPO_ROOT/deploy/deploy-all.sh" "deploy-all.sh"
  check_file "$REPO_ROOT/deploy/check-health.sh" "check-health.sh"
  check_dir "$REPO_ROOT/deploy/monitoring" "Monitoring configs"
  check_dir "$REPO_ROOT/deploy/runbooks" "Runbooks"
  check_dir "$REPO_ROOT/deploy/helm" "Helm charts"
  check_dir "$REPO_ROOT/deploy/docker" "Docker configs"
fi

# ── Summary ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed: $PASS${NC}"
if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}Failed: $FAIL${NC}"
fi
if [[ "$WARN" -gt 0 ]]; then
  echo -e "${YELLOW}Warnings: $WARN${NC}"
fi
echo "Total checks: $TOTAL"
echo ""

if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}✅ DELIVERY VERIFICATION PASSED${NC}"
  echo "  All $TOTAL checks passed."
  exit 0
else
  echo -e "${RED}❌ DELIVERY VERIFICATION FAILED${NC}"
  echo "  $FAIL of $TOTAL checks failed."
  exit 1
fi
