#!/usr/bin/env bash
# publish.sh — Publish the CinaCoin NuGet package to NuGet.org
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check for API key
if [ -z "${NUGET_API_KEY:-}" ]; then
  echo "Error: NUGET_API_KEY environment variable is not set."
  echo "Get your API key at https://www.nuget.org/account/apikeys"
  echo "Usage: NUGET_API_KEY=your-key ./scripts/publish.sh"
  exit 1
fi

# Ensure packages exist
if [ ! -d "nupkg" ] || [ -z "$(ls nupkg/*.nupkg 2>/dev/null)" ]; then
  echo "No packages found. Running pack first..."
  bash "$SCRIPT_DIR/pack.sh"
fi

echo "=== CinaCoin .NET SDK — Publish ==="
echo ""

# Push main package
for pkg in nupkg/CinaCoin.*.nupkg; do
  [ -f "$pkg" ] || continue
  echo "Pushing $pkg ..."
  dotnet nuget push "$pkg" \
    --api-key "$NUGET_API_KEY" \
    --source https://api.nuget.org/v3/index.json \
    --skip-duplicate
  echo ""
done

echo "Done!"
