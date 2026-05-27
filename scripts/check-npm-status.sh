#!/bin/bash
echo "Checking @cinacoin NPM packages..."
echo ""

# Get all published packages
PACKAGES=$(npm search @cinacoin --json 2>/dev/null | jq -r '.[].name')

echo "Published packages on NPM:"
echo "$PACKAGES" | while read pkg; do
    if [ -n "$pkg" ]; then
        version=$(npm view "$pkg" version 2>/dev/null)
        if [ -n "$version" ]; then
            echo "✓ $pkg - v$version"
        else
            echo "✗ $pkg - version check failed"
        fi
    fi
done

echo ""
echo "Total: $(echo "$PACKAGES" | wc -l) packages published"
echo ""
echo "Checking local packages not published..."
echo ""

cd /home/cina/.openclaw/workspace/onux/packages
for dir in */; do
    name=${dir%/}
    if [ -f "$name/package.json" ]; then
        pkg_name="@cinacoin/$name"
        published=$(echo "$PACKAGES" | grep -c "^$pkg_name$" || echo 0)
        if [ "$published" -eq 0 ]; then
            echo "⊗ $name (not published)"
        fi
    fi
done