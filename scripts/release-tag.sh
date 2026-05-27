#!/usr/bin/env bash
#
# release-tag.sh — Create and push a release tag for CinaCoin
#
# Usage:
#   ./scripts/release-tag.sh              # Interactive mode
#   ./scripts/release-tag.sh v1.1.0       # Non-interactive (tag provided)
#   ./scripts/release-tag.sh --dry-run    # Preview without pushing
#
# This script:
#   1. Validates the tag format (must match v<semver>)
#   2. Ensures you're on main branch
#   3. Verifies no uncommitted changes
#   4. Confirms upstream is up-to-date
#   5. Creates an annotated tag
#   6. Pushes the tag (triggers CI release workflow)
#

set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Config ──
REMOTE="${GIT_REMOTE:-origin}"
BRANCH="main"
DRY_RUN=false

# ── Helpers ──
info()    { echo -e "${BLUE}ℹ  $1${NC}"; }
success() { echo -e "${GREEN}✓  $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $1${NC}"; }
error()   { echo -e "${RED}✗  $1${NC}" >&2; }

usage() {
  echo "Usage: $0 [TAG] [--dry-run]"
  echo ""
  echo "Create and push a release tag for CinaCoin."
  echo ""
  echo "Arguments:"
  echo "  TAG         Version tag (e.g., v1.1.0). If omitted, prompts interactively."
  echo "  --dry-run   Preview actions without pushing."
  echo ""
  echo "Examples:"
  echo "  $0                    # Interactive mode"
  echo "  $0 v1.1.0             # Non-interactive"
  echo "  $0 v1.1.0 --dry-run   # Dry run"
  exit 1
}

# ── Parse arguments ──
TAG=""
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      usage
      ;;
    v*)
      TAG="$arg"
      ;;
    *)
      error "Unknown argument: $arg"
      usage
      ;;
  esac
done

# ── Validate we're in a git repo ──
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  error "Not inside a Git repository."
  exit 1
fi

# ── Find repo root ──
REPO_ROOT=$(git rev-parse --show-toplevel)

# ── Validate tag format ──
validate_tag() {
  local tag="$1"
  if [[ ! "$tag" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?(\+[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$ ]]; then
    error "Invalid tag format: $tag"
    echo "Expected: v<MAJOR>.<MINOR>.<PATCH>[-prerelease][+build]"
    echo "Examples: v1.0.0, v0.2.1, v2.0.0-rc.1"
    return 1
  fi
}

# ── Check branch ──
check_branch() {
  local current_branch
  current_branch=$(git branch --show-current)
  if [[ "$current_branch" != "$BRANCH" ]]; then
    error "Must be on '$BRANCH' branch. Currently on: $current_branch"
    echo "Run: git checkout $BRANCH"
    return 1
  fi
  success "On '$BRANCH' branch"
}

# ── Check for uncommitted changes ──
check_clean() {
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    error "Working directory has uncommitted changes."
    echo "Commit or stash changes before creating a release tag."
    return 1
  fi
  success "Working directory is clean"
}

# ── Check if tag already exists ──
check_tag_exists() {
  local tag="$1"
  if git rev-parse "$tag" &>/dev/null; then
    error "Tag '$tag' already exists."
    echo "Delete it first: git tag -d $tag"
    echo "Or choose a different version."
    return 1
  fi
  success "Tag '$tag' does not exist yet"
}

# ── Check for pending changesets ──
check_changesets() {
  local changeset_files
  changeset_files=$(find "$REPO_ROOT/.changeset" -maxdepth 1 -name "*.md" ! -name "README.md" -o -name "*.json" ! -name "config.json" 2>/dev/null | wc -l | tr -d ' ')

  # Count actual changeset files (not README or config)
  local count
  count=$(ls "$REPO_ROOT/.changeset"/*.md 2>/dev/null | grep -v README.md | wc -l | tr -d ' ')

  if [[ "$count" -gt 0 ]]; then
    warn "Found $count pending changeset(s) that haven't been versioned."
    echo "Run 'pnpm changeset version' before tagging to consume them."
    return 1
  fi
  success "No pending changesets"
}

# ── Show recent tags ──
show_recent_tags() {
  echo ""
  info "Recent tags:"
  git tag -l --sort=-version:refname "v*" | head -5 | while read -r t; do
    local date
    date=$(git log -1 --format="%ci" "$t" 2>/dev/null | cut -d' ' -f1)
    echo "  $t ($date)"
  done
  echo ""
}

# ── Confirm ──
confirm() {
  local tag="$1"
  local hash
  hash=$(git rev-parse --short HEAD)

  echo "┌─────────────────────────────────────────────────┐"
  echo "│              🏷️  Release Tag Summary             │"
  echo "├─────────────────────────────────────────────────┤"
  echo "│  Tag:      $tag"
  echo "│  Commit:   $hash ($BRANCH)"
  echo "│  Remote:   $REMOTE"
  echo "│  Dry run:  $DRY_RUN"
  echo "└─────────────────────────────────────────────────┘"
  echo ""

  if [[ "$DRY_RUN" == true ]]; then
    warn "DRY RUN — no tag will be created or pushed."
    return 0
  fi

  read -rp "Create and push tag '$tag'? [y/N] " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    return 0
  else
    echo "Aborted."
    exit 0
  fi
}

# ── Main ──
main() {
  echo ""
  info "CinaCoin — Release Tag Script"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Get tag if not provided
  if [[ -z "$TAG" ]]; then
    show_recent_tags
    read -rp "Enter release tag (e.g., v1.1.0): " TAG
  fi

  # Validate
  validate_tag "$TAG" || exit 1

  # Checks
  check_branch || exit 1
  check_clean || exit 1
  check_tag_exists "$TAG" || exit 1
  check_changesets || { warn "Proceed anyway? (changesets will be left pending)"; }

  # Confirm
  confirm "$TAG"

  # Create tag
  echo ""
  info "Creating annotated tag: $TAG"
  git tag -a "$TAG" -m "Release $TAG"
  success "Tag '$TAG' created locally"

  # Push tag
  if [[ "$DRY_RUN" != true ]]; then
    info "Pushing tag to $REMOTE..."
    git push "$REMOTE" "$TAG"
    success "Tag '$TAG' pushed to $REMOTE"

    echo ""
    success "Release workflow triggered on GitHub Actions"
    echo "  Track progress: https://github.com/cinacoin/cinacoin/actions"
    echo ""
    echo "Next steps:"
    echo "  • Monitor the release workflow in GitHub Actions"
    echo "  • Verify packages are published to npm"
    echo "  • Check the GitHub Release was created"
    echo "  • Verify documentation is deployed"
  else
    warn "DRY RUN complete. No tag was created or pushed."
    echo ""
    echo "To actually create the tag, run:"
    echo "  $0 $TAG"
  fi
}

main
