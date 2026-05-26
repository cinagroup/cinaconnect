#!/usr/bin/env bash
set -euo pipefail

# Copy existing docs from docs/ to docs-site/docs/
# This merges the existing documentation into the VitePress site.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_DIR/docs"
DOCS_SITE_DIR="$PROJECT_DIR/docs-site/docs"

echo "📋 Copying existing docs..."

# Copy directories that don't conflict with our new structure
for dir in blog deployment enterprise examples guide security social release-plans; do
  if [ -d "$DOCS_DIR/$dir" ]; then
    echo "  Copying $dir/"
    cp -r "$DOCS_DIR/$dir" "$DOCS_SITE_DIR/"
  fi
done

# Copy individual markdown files
for file in faq.md git-commands.md git-workflow.md test-coverage.md; do
  if [ -f "$DOCS_DIR/$file" ]; then
    echo "  Copying $file"
    cp "$DOCS_DIR/$file" "$DOCS_SITE_DIR/"
  fi
done

# Copy public assets
if [ -d "$DOCS_DIR/public" ]; then
  echo "  Copying public assets"
  cp -r "$DOCS_DIR/public/"* "$DOCS_SITE_DIR/public/" 2>/dev/null || true
fi

echo "✅ Docs copy complete!"
