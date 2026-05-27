#!/usr/bin/env bash
# health-check.sh — Full monorepo health check for CinaCoin
# Usage: ./scripts/health-check.sh
# Exit codes: 0 = all checks passed, 1 = one or more checks failed

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$MONOREPO_ROOT"

log_pass() { echo -e "  ${GREEN}✅ PASS${NC}  $1"; ((PASS++)); }
log_fail() { echo -e "  ${RED}❌ FAIL${NC}  $1"; ((FAIL++)); }
log_warn() { echo -e "  ${YELLOW}⚠️  WARN${NC}  $1"; ((WARN++)); }
log_info() { echo -e "  ${BLUE}ℹ️  INFO${NC}  $1"; }

echo "╔══════════════════════════════════════════════════════╗"
echo "║   CinaCoin — Monorepo Health Check               ║"
echo "║   $(date -u '+%Y-%m-%d %H:%M:%S UTC')                          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────
# 1. Dependency & Environment Checks
# ──────────────────────────────────────────────
echo -e "${BLUE}[1/6] Dependencies & Environment${NC}"

if command -v node &>/dev/null; then
  NODE_VER=$(node -v)
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1 | tr -d 'v')
  if [ "$NODE_MAJOR" -ge 18 ]; then
    log_pass "Node.js $NODE_VER (≥ 18 required)"
  else
    log_fail "Node.js $NODE_VER (≥ 18 required)"
  fi
else
  log_fail "Node.js not found"
fi

if command -v pnpm &>/dev/null; then
  PNPM_VER=$(pnpm -v)
  log_pass "pnpm $PNPM_VER installed"
else
  log_fail "pnpm not found (required ≥ 9.15)"
fi

if command -v turbo &>/dev/null; then
  TURBO_VER=$(turbo --version 2>/dev/null || echo "unknown")
  log_pass "Turbo $TURBO_VER installed"
else
  log_warn "turbo CLI not found globally (may be in node_modules)"
fi

if [ -d "node_modules" ]; then
  log_pass "node_modules present"
else
  log_fail "node_modules missing — run 'pnpm install'"
fi

echo ""

# ──────────────────────────────────────────────
# 2. Package Build Check
# ──────────────────────────────────────────────
echo -e "${BLUE}[2/6] Package Builds${NC}"

if command -v pnpm &>/dev/null && [ -d "node_modules" ]; then
  log_info "Running full monorepo build (this may take a while)..."
  if pnpm run build --force > /tmp/health-build.log 2>&1; then
    log_pass "All packages built successfully"
  else
    log_fail "Some packages failed to build — see /tmp/health-build.log"
  fi
else
  log_warn "Skipping build check (pnpm/node_modules not available)"
  log_info "Checking for existing dist/ directories..."
  DIST_COUNT=$(find packages -maxdepth 2 -name "dist" -type d | wc -l)
  if [ "$DIST_COUNT" -ge 60 ]; then
    log_pass "$DIST_COUNT packages have dist/ directories"
  elif [ "$DIST_COUNT" -ge 1 ]; then
    log_warn "Only $DIST_COUNT packages have dist/ — run 'pnpm run build'"
  else
    log_fail "No dist/ directories found"
  fi
fi

echo ""

# ──────────────────────────────────────────────
# 3. Test Suite
# ──────────────────────────────────────────────
echo -e "${BLUE}[3/6] Test Suite${NC}"

if command -v pnpm &>/dev/null && [ -d "node_modules" ]; then
  log_info "Running test suite..."
  if pnpm run test > /tmp/health-test.log 2>&1; then
    log_pass "All tests passed"
  else
    log_fail "Some tests failed — see /tmp/health-test.log"
  fi
else
  log_warn "Skipping test run (pnpm/node_modules not available)"
fi

TEST_FILES=$(find packages apps -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | wc -l)
log_info "Found $TEST_FILES test files across packages and apps"

echo ""

# ──────────────────────────────────────────────
# 4. Demo App Build
# ──────────────────────────────────────────────
echo -e "${BLUE}[4/6] Demo App${NC}"

for app_dir in apps/demo apps/demo-react; do
  if [ -d "$app_dir" ]; then
    APP_NAME=$(basename "$app_dir")
    if [ -f "$app_dir/package.json" ]; then
      log_info "Checking $APP_NAME..."
      if [ -d "$app_dir/.next" ] || [ -d "$app_dir/dist" ] || [ -d "$app_dir/build" ]; then
        log_pass "$APP_NAME has build output"
      else
        log_warn "$APP_NAME not yet built"
      fi
    else
      log_warn "$APP_DIR missing package.json"
    fi
  fi
done

echo ""

# ──────────────────────────────────────────────
# 5. ESLint & Prettier
# ──────────────────────────────────────────────
echo -e "${BLUE}[5/6] Code Quality (ESLint + Prettier)${NC}"

if command -v pnpm &>/dev/null && [ -d "node_modules" ]; then
  log_info "Running Prettier check..."
  if pnpm run format:check > /tmp/health-prettier.log 2>&1; then
    log_pass "Prettier formatting OK"
  else
    FAIL_COUNT=$(grep -c "!" /tmp/health-prettier.log 2>/dev/null || echo "0")
    log_warn "Prettier issues found ($FAIL_COUNT files) — run 'pnpm run format'"
  fi

  log_info "Running ESLint..."
  if pnpm run lint > /tmp/health-lint.log 2>&1; then
    log_pass "ESLint passed"
  else
    log_warn "ESLint found issues — run 'pnpm run lint:fix' to auto-fix"
  fi
else
  log_warn "Skipping lint checks (pnpm/node_modules not available)"
fi

echo ""

# ──────────────────────────────────────────────
# 6. Coverage Threshold Check
# ──────────────────────────────────────────────
echo -e "${BLUE}[6/6] Coverage Threshold${NC}"

MIN_COVERAGE=25  # percent

if command -v pnpm &>/dev/null && [ -d "node_modules" ]; then
  log_info "Running coverage analysis (threshold: ${MIN_COVERAGE}%)..."
  if pnpm run test -- --coverage > /tmp/health-coverage.log 2>&1; then
    COVERAGE=$(grep -oP 'All files\s*\|\s*\K[0-9.]+' /tmp/health-coverage.log 2>/dev/null || echo "")
    if [ -n "$COVERAGE" ]; then
      COVERAGE_INT=${COVERAGE%.*}
      if [ "$COVERAGE_INT" -ge "$MIN_COVERAGE" ]; then
        log_pass "Coverage: ${COVERAGE}% (≥ ${MIN_COVERAGE}%)"
      else
        log_warn "Coverage: ${COVERAGE}% (below ${MIN_COVERAGE}% threshold)"
      fi
    else
      log_info "Coverage data collected but couldn't parse summary"
    fi
  else
    log_warn "Coverage run had errors — check /tmp/health-coverage.log"
  fi
else
  log_warn "Skipping coverage check (pnpm/node_modules not available)"
fi

echo ""

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Health Check Summary                              ║"
echo "╠══════════════════════════════════════════════════════╣"
echo -e "║   ${GREEN}Passed: $PASS${NC}                                        ║"
echo -e "║   ${RED}Failed: $FAIL${NC}                                        ║"
echo -e "║   ${YELLOW}Warnings: $WARN${NC}                                      ║"
echo "╚══════════════════════════════════════════════════════╝"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ Health check FAILED — $FAIL check(s) need attention${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Health check PASSED with warnings — $WARN item(s) to review${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Health check PASSED — all checks green${NC}"
  exit 0
fi
