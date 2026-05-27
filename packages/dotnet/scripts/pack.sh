#!/usr/bin/env bash
# pack.sh — Build and pack the CinaCoin NuGet package
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== CinaCoin .NET SDK — Pack ==="
echo "Project directory: $PROJECT_DIR"

# Clean previous builds
dotnet clean --configuration Release --verbosity quiet 2>/dev/null || true

# Restore dependencies
echo ""
echo "[1/2] Restoring dependencies..."
dotnet restore --verbosity minimal

# Pack
echo "[2/2] Packing NuGet package..."
dotnet pack --configuration Release --no-restore \
  --output "$PROJECT_DIR/nupkg" \
  -p:IncludeSymbols=true \
  -p:SymbolPackageFormat=snupkg

echo ""
echo "=== Package contents ==="
ls -lh "$PROJECT_DIR/nupkg/"
echo ""
echo "Done! Packages are in nupkg/"
