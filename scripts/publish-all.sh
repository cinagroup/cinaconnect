#!/usr/bin/env bash
#
# publish-all.sh — Build and publish all @cinacoin packages to npm
#
# Usage:
#   ./scripts/publish-all.sh                  # dry-run (default)
#   ./scripts/publish-all.sh --publish        # actually publish
#   ./scripts/publish-all.sh --dry-run        # explicit dry-run
#   ./scripts/publish-all.sh --build          # build all packages before publishing
#   ./scripts/publish-all.sh --filter=adapter   # only publish packages matching "adapter"
#   ./scripts/publish-all.sh --filter=react,ui # multiple categories (comma-separated)
#   ./scripts/publish-all.sh --help           # show help
#
# Requires: npm, node, pnpm (for monorepo), jq (optional)
#
# Notes:
# - All 71 public packages now have dist/ directories
# - All packages have exports fields (added in Round 9)
# - @cinacoin/i18n and @cinacoin/i18n-react are separate packages
# - The .npm check in publish-all.js is authoritative (bash script defers to it)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
PACKAGES_DIR="$REPO_ROOT/packages"

# ── Flags ──────────────────────────────────────────────────────────
DRY_RUN=true
BUILD_ALL=false
FILTER=""

for arg in "$@"; do
  case "$arg" in
    --publish)      DRY_RUN=false ;;
    --dry-run)      DRY_RUN=true ;;
    --build)        BUILD_ALL=true ;;
    --filter=*)     FILTER="${arg#*=}" ;;
    --help|-h)
      echo "Usage: $0 [--publish|--dry-run] [--build] [--filter=category1,category2]"
      echo ""
      echo "Options:"
      echo "  --publish     Actually publish to npm (default is dry-run)"
      echo "  --dry-run     Simulate publishing (default)"
      echo "  --build       Build all packages first using turbo"
      echo "  --filter=X    Only publish packages whose name contains X (comma-separated)"
      echo "  --help        Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      exit 1
      ;;
  esac
done

# ── Helpers ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_err()   { echo -e "${RED}[ERR]${NC}    $*"; }

# ── Check prerequisites ────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  log_err "npm is required but not found."
  exit 1
fi

if ! command -v node &>/dev/null; then
  log_err "node is required but not found."
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  log_err "pnpm is required but not found."
  exit 1
fi

# ── Build all (if requested) ───────────────────────────────────────
if $BUILD_ALL; then
  echo ""
  log_info "Building all packages with turbo..."
  cd "$REPO_ROOT"
  if pnpm run build; then
    log_ok "Build completed successfully"
  else
    log_err "Build failed. Fix errors before publishing."
    exit 1
  fi
fi

# ── Discover packages ──────────────────────────────────────────────
declare -a ALL_NAMES=()
declare -a ALL_DIRS=()
declare -a ALL_VERSIONS=()

for pkg_dir in "$PACKAGES_DIR"/*/; do
  pkg_json="$pkg_dir/package.json"
  [ -f "$pkg_json" ] || continue

  pkg_name=$(node -e "console.log(require('$pkg_json').name)" 2>/dev/null) || continue
  pkg_version=$(node -e "console.log(require('$pkg_json').version)" 2>/dev/null) || continue
  pkg_private=$(node -e "console.log(require('$pkg_json').private || 'false')" 2>/dev/null) || continue

  [ "$pkg_private" = "true" ] && continue

  ALL_NAMES+=("$pkg_name")
  ALL_DIRS+=("$pkg_dir")
  ALL_VERSIONS+=("$pkg_version")
done

TOTAL=${#ALL_NAMES[@]}
log_info "Found $TOTAL publishable packages in $PACKAGES_DIR"

# ── Apply filter ───────────────────────────────────────────────────
if [ -n "$FILTER" ]; then
  declare -a FILTERED_NAMES=()
  declare -a FILTERED_DIRS=()
  declare -a FILTERED_VERSIONS=()

  IFS=',' read -ra FILTER_PARTS <<< "$FILTER"
  for i in "${!ALL_NAMES[@]}"; do
    match=false
    for part in "${FILTER_PARTS[@]}"; do
      if echo "${ALL_NAMES[$i]}" | grep -qi "$part"; then
        match=true
        break
      fi
    done
    if $match; then
      FILTERED_NAMES+=("${ALL_NAMES[$i]}")
      FILTERED_DIRS+=("${ALL_DIRS[$i]}")
      FILTERED_VERSIONS+=("${ALL_VERSIONS[$i]}")
    fi
  done

  ALL_NAMES=("${FILTERED_NAMES[@]}")
  ALL_DIRS=("${FILTERED_DIRS[@]}")
  ALL_VERSIONS=("${FILTERED_VERSIONS[@]}")
  log_info "After filter '$FILTER': ${#ALL_NAMES[@]} packages"
fi

# ── Check published status ─────────────────────────────────────────
log_info "Checking npm registry for current versions..."

SKIPPED=0
TO_PUBLISH=0
declare -a PUB_NAMES=()
declare -a PUB_DIRS=()
declare -a PUB_VERSIONS=()

for i in "${!ALL_NAMES[@]}"; do
  name="${ALL_NAMES[$i]}"
  version="${ALL_VERSIONS[$i]}"
  dir="${ALL_DIRS[$i]}"

  # Check dist/ exists
  if [ ! -d "${dir}dist" ] && [ ! -d "${dir}build" ]; then
    log_warn "Skipping $name — no dist/ or build/ directory"
    ((SKIPPED++))
    continue
  fi

  # Check if already published at this version
  registry_ver=$(npm view "$name" version 2>/dev/null || echo "NOT_FOUND")

  if [ "$registry_ver" = "$version" ]; then
    log_info "  $name@$version already published ✓"
    ((SKIPPED++))
    continue
  fi

  PUB_NAMES+=("$name")
  PUB_DIRS+=("$dir")
  PUB_VERSIONS+=("$version")
  ((TO_PUBLISH++))
done

echo ""
log_info "Summary: $TOTAL total, $SKIPPED already published/no-dist, $TO_PUBLISH to publish"
echo ""

if [ "$TO_PUBLISH" -eq 0 ]; then
  log_ok "Nothing to publish. All packages are up to date."
  exit 0
fi

if $DRY_RUN; then
  log_info "DRY RUN — no packages will be published. Remove --dry-run or use --publish to actually publish."
  echo ""
  for i in "${!PUB_NAMES[@]}"; do
    echo "  Would publish: ${PUB_NAMES[$i]}@${PUB_VERSIONS[$i]}  (${PUB_DIRS[$i]})"
  done
  exit 0
fi

# ── Publish ────────────────────────────────────────────────────────
SUCCESS=0
FAILED=0
declare -a FAILED_NAMES=()

for i in "${!PUB_NAMES[@]}"; do
  name="${PUB_NAMES[$i]}"
  dir="${PUB_DIRS[$i]}"
  version="${PUB_VERSIONS[$i]}"

  echo "─────────────────────────────────────────"
  log_info "Publishing $name@$version ..."

  if output=$(npm publish --access public "$dir" 2>&1); then
    log_ok "Published $name@$version"
    ((SUCCESS++))
  else
    log_err "Failed to publish $name@$version"
    echo "  Output: $output"
    ((FAILED++))
    FAILED_NAMES+=("$name")
  fi
done

echo ""
echo "═══════════════════════════════════════════"
log_info "Publish complete!"
log_ok "  Success: $SUCCESS"
if [ "$FAILED" -gt 0 ]; then
  log_err "  Failed:  $FAILED"
  for f in "${FAILED_NAMES[@]}"; do
    log_err "    - $f"
  done
fi
log_info "  Skipped: $SKIPPED (already published or no dist)"

exit $FAILED
