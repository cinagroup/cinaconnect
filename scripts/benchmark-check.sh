#!/usr/bin/env bash
#
# benchmark-check.sh — Quick build timing + bundle size regression check.
#
# Compares current build metrics against a stored baseline and reports
# pass/fail with percentage differences.
#
# Usage:
#   ./scripts/benchmark-check.sh
#   ./scripts/benchmark-check.sh --update   # regenerate baseline
#
# Prerequisites:
#   - pnpm installed
#   - packages must be built (runs `pnpm build` internally)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BASELINE="$SCRIPT_DIR/benchmark-baseline.json"
TIMING_LOG="$SCRIPT_DIR/.benchmark-timing.log"

# ─── helpers ──────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }

# ─── build timing ────────────────────────────────────────────────────

info "Running build timing..."
BUILD_START=$(date +%s%N)
pnpm build --filter '@cinacoin/core-sdk' --filter '@cinacoin/swap-sdk' > "$TIMING_LOG" 2>&1 || true
BUILD_END=$(date +%s%N)
BUILD_MS=$(( (BUILD_END - BUILD_START) / 1000000 ))
info "Build completed in ${BUILD_MS}ms"

# ─── measure bundle sizes ────────────────────────────────────────────

measure_bundle() {
  local pkg_dir="$1"
  local dist="$ROOT/$pkg_dir/dist"
  local total=0

  if [ ! -d "$dist" ]; then
    echo "0"
    return
  fi

  while IFS= read -r -d '' file; do
    local size
    size=$(wc -c < "$file")
    total=$(( total + size ))
  done < <(find "$dist" -type f \( -name '*.js' -o -name '*.mjs' \) -print0)

  echo "$total"
}

CORE_SDK_SIZE=$(measure_bundle "packages/core-sdk")
SWAP_SDK_SIZE=$(measure_bundle "packages/swap-sdk")

info "core-sdk bundle: ${CORE_SDK_SIZE} bytes"
info "swap-sdk bundle: ${SWAP_SDK_SIZE} bytes"

# ─── mode: update baseline ──────────────────────────────────────────

if [[ "${1:-}" == "--update" ]]; then
  info "Updating baseline at $BASELINE"
  cat > "$BASELINE" <<EOF
{
  "generated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "buildMs": ${BUILD_MS},
  "bundles": {
    "@cinacoin/core-sdk": ${CORE_SDK_SIZE},
    "@cinacoin/swap-sdk": ${SWAP_SDK_SIZE}
  }
}
EOF
  info "Baseline written."
  exit 0
fi

# ─── compare against baseline ────────────────────────────────────────

if [ ! -f "$BASELINE" ]; then
  warn "No baseline found at $BASELINE"
  info "Run with --update to create one, or use these values:"
  echo ""
  echo "  Build:     ${BUILD_MS}ms"
  echo "  core-sdk:  ${CORE_SDK_SIZE} bytes"
  echo "  swap-sdk:  ${SWAP_SDK_SIZE} bytes"
  echo ""
  info "Creating baseline for future comparisons..."
  cat > "$BASELINE" <<EOF
{
  "generated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "buildMs": ${BUILD_MS},
  "bundles": {
    "@cinacoin/core-sdk": ${CORE_SDK_SIZE},
    "@cinacoin/swap-sdk": ${SWAP_SDK_SIZE}
  }
}
EOF
  exit 0
fi

# Parse baseline (simple grep/sed — no jq dependency)
BASELINE_BUILD=$(grep '"buildMs"' "$BASELINE" | grep -o '[0-9]\+')
BASELINE_CORE=$(grep '"@cinacoin/core-sdk"' "$BASELINE" | grep -o '[0-9]\+')
BASELINE_SWAP=$(grep '"@cinacoin/swap-sdk"' "$BASELINE" | grep -o '[0-9]\+')

BASELINE_BUILD=${BASELINE_BUILD:-0}
BASELINE_CORE=${BASELINE_CORE:-0}
BASELINE_SWAP=${BASELINE_SWAP:-0}

pct_diff() {
  local old=$1 new=$2
  if [ "$old" -eq 0 ]; then
    echo "N/A (no baseline)"
    return
  fi
  # integer percentage * 100 for one decimal place
  local diff=$(( (new - old) * 100 / old ))
  local whole=$(( diff / 100 ))
  local frac=$(( ${diff#-} % 100 ))
  local sign=""
  if [ "$diff" -ge 0 ]; then sign="+"; fi
  printf "%s%d.%02d%%" "$sign" "$whole" "$frac"
}

CORE_PCT=$(pct_diff "$BASELINE_CORE" "$CORE_SDK_SIZE")
SWAP_PCT=$(pct_diff "$BASELINE_SWAP" "$SWAP_SDK_SIZE")
BUILD_PCT=$(pct_diff "$BASELINE_BUILD" "$BUILD_MS")

echo ""
echo "══════════════════════════════════════════════"
echo "  📊  Benchmark Regression Check"
echo "══════════════════════════════════════════════"
echo ""

ALL_PASS=true

check_metric() {
  local name="$1" old="$2" new="$3" pct="$4" threshold_pct=15

  if [ "$old" -eq 0 ]; then
    echo "  🟡 $name: $new bytes  (no baseline for comparison)"
    return
  fi

  local abs_diff=$(( new - old ))
  if [ "$abs_diff" -lt 0 ]; then abs_diff=$(( -abs_diff )); fi
  local pct_x100=$(( abs_diff * 10000 / old ))

  if [ "$pct_x100" -gt $(( threshold_pct * 100 )) ]; then
    fail "$name: $new bytes (was $old)  change: $pct  ⚠️  EXCEEDS ${threshold_pct}% threshold"
    ALL_PASS=false
  else
    info "$name: $new bytes (was $old)  change: $pct  ✅ OK"
  fi
}

check_metric "Build time"   "$BASELINE_BUILD" "$BUILD_MS"     "$BUILD_PCT"
check_metric "core-sdk"     "$BASELINE_CORE"  "$CORE_SDK_SIZE" "$CORE_PCT"
check_metric "swap-sdk"     "$BASELINE_SWAP"  "$SWAP_SDK_SIZE" "$SWAP_PCT"

echo ""
if $ALL_PASS; then
  echo "  ✅ All metrics within ${15}% of baseline"
  echo ""
  exit 0
else
  echo "  ❌ One or more metrics exceeded the 15% regression threshold"
  echo ""
  exit 1
fi
