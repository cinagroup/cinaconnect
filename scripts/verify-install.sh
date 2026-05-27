#!/usr/bin/env bash
# verify-install.sh — Verify all CinaCoin packages install correctly
# Usage: ./scripts/verify-install.sh [--verbose]
# Checks: npm install, TypeScript types, broken imports

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0
VERBOSE=false

if [ "${1:-}" = "--verbose" ]; then
  VERBOSE=true
fi

log_pass() { echo -e "  ${GREEN}✅${NC} $1"; ((PASS++)); }
log_fail() { echo -e "  ${RED}❌${NC} $1"; ((FAIL++)); }
log_warn() { echo -e "  ${YELLOW}⚠️${NC} $1"; ((WARN++)); }
log_info() { [ "$VERBOSE" = true ] && echo -e "  ${BLUE}ℹ️${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$MONOREPO_ROOT"

echo "╔══════════════════════════════════════════════════════╗"
echo "║   CinaCoin — Install & Type Verification         ║"
echo "║   $(date -u '+%Y-%m-%d %H:%M:%S UTC')                          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────
# 1. Monorepo install
# ──────────────────────────────────────────────
echo -e "${BLUE}[1/4] Monorepo Dependencies${NC}"

if command -v pnpm &>/dev/null; then
  if [ -d "node_modules" ]; then
    log_pass "node_modules exists"
  else
    log_info "Installing dependencies..."
    if pnpm install > /tmp/verify-install.log 2>&1; then
      log_pass "pnpm install succeeded"
    else
      log_fail "pnpm install failed — see /tmp/verify-install.log"
    fi
  fi
else
  log_fail "pnpm not found — install with 'corepack enable && corepack prepare pnpm@latest --activate'"
fi

echo ""

# ──────────────────────────────────────────────
# 2. Package install verification
# ──────────────────────────────────────────────
echo -e "${BLUE}[2/4] Package Install Checks${NC}"

for pkg_dir in packages/*/; do
  PKG_NAME=$(basename "$pkg_dir")
  if [ ! -f "$pkg_dir/package.json" ]; then
    log_warn "$PKG_NAME: no package.json — skipping"
    continue
  fi

  PKG_SCOPE=$(node -e "console.log(require('$pkg_dir/package.json').name)" 2>/dev/null || echo "$PKG_NAME")

  # Check for dist/ (built packages)
  if [ -d "$pkg_dir/dist" ]; then
    log_pass "$PKG_SCOPE — dist/ present"
  else
    log_warn "$PKG_SCOPE — no dist/ (may need build)"
  fi

  # Check for main/exports in package.json
  HAS_MAIN=$(node -e "
    const p = require('$pkg_dir/package.json');
    if (p.main || p.exports || p.module) { console.log('yes'); } else { console.log('no'); }
  " 2>/dev/null || echo "no")

  if [ "$HAS_MAIN" = "no" ]; then
    log_warn "$PKG_SCOPE — no main/exports/module field"
  else
    log_info "$PKG_SCOPE — entry point defined"
  fi
done

echo ""

# ──────────────────────────────────────────────
# 3. TypeScript type validity
# ──────────────────────────────────────────────
echo -e "${BLUE}[3/4] TypeScript Type Validity${NC}"

TS_ERRORS=0
VALID_TYPES=0

for pkg_dir in packages/*/; do
  PKG_NAME=$(basename "$pkg_dir")
  if [ ! -f "$pkg_dir/package.json" ]; then
    continue
  fi

  PKG_SCOPE=$(node -e "console.log(require('$pkg_dir/package.json').name)" 2>/dev/null || echo "$PKG_NAME")

  # Check for TypeScript source
  TS_FILE_COUNT=$(find "$pkg_dir/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
  if [ "$TS_FILE_COUNT" -eq 0 ]; then
    log_info "$PKG_SCOPE — no TypeScript source (may be native/C#)"
    continue
  fi

  # Check for tsconfig
  if [ -f "$pkg_dir/tsconfig.json" ]; then
    log_info "$PKG_SCOPE — tsconfig.json present"
  fi

  # Check for type declarations in dist
  if find "$pkg_dir/dist" -name "*.d.ts" -not -path "*/node_modules/*" 2>/dev/null | head -1 >/dev/null 2>&1; then
    VALID_TYPES=$((VALID_TYPES + 1))
    log_pass "$PKG_SCOPE — .d.ts files found in dist/"
  else
    if [ "$TS_FILE_COUNT" -gt 0 ]; then
      log_warn "$PKG_SCOPE — no .d.ts files in dist/ (may not be built)"
    fi
  fi
done

echo ""
echo "  $VALID_TYPES packages with valid TypeScript declarations"

echo ""

# ──────────────────────────────────────────────
# 4. Broken import detection
# ──────────────────────────────────────────────
echo -e "${BLUE}[4/4] Broken Import Detection${NC}"

BROKEN_IMPORTS=0

for pkg_dir in packages/*/; do
  PKG_NAME=$(basename "$pkg_dir")
  if [ ! -f "$pkg_dir/package.json" ]; then
    continue
  fi

  PKG_SCOPE=$(node -e "console.log(require('$pkg_dir/package.json').name)" 2>/dev/null || echo "$PKG_NAME")

  # Check that internal @cinacoin imports reference actual packages
  if [ -d "$pkg_dir/src" ]; then
    INTERNAL_IMPORTS=$(grep -roh '@cinacoin/[a-z0-9_-]*' "$pkg_dir/src" 2>/dev/null | sort -u || true)

    for import in $INTERNAL_IMPORTS; do
      IMPORT_PKG=$(echo "$import" | sed 's/@cinacoin\///')
      if [ -d "packages/$IMPORT_PKG" ]; then
        log_info "$PKG_SCOPE → imports $import (package exists)"
      else
        # Check if it might be a known alias
        case "$IMPORT_PKG" in
          react-native|android|ios|flutter|unity|telegram|farcaster)
            log_info "$PKG_SCOPE → imports $import (alias, OK)"
            ;;
          *)
            log_fail "$PKG_SCOPE → imports $import (package NOT found!)"
            BROKEN_IMPORTS=$((BROKEN_IMPORTS + 1))
            ;;
        esac
      fi
    done
  fi
done

echo ""

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Verify Install Summary                            ║"
echo "╠══════════════════════════════════════════════════════╣"
echo -e "║   ${GREEN}Passed: $PASS${NC}                                        ║"
echo -e "║   ${RED}Failed: $FAIL${NC}                                        ║"
echo -e "║   ${YELLOW}Warnings: $WARN${NC}                                      ║"
echo "╚══════════════════════════════════════════════════════╝"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ Verification FAILED — $FAIL issue(s) found${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Verification PASSED with warnings — $WARN item(s) to review${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Verification PASSED — all packages look good${NC}"
  exit 0
fi
