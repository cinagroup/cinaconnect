#!/bin/bash
BASE="/home/cina/.openclaw/workspace/onux/packages"
SUCCESS=0
FAIL=0
RESULTS=""

for dir in "$BASE"/*/; do
  name=$(basename "$dir")
  if [ -f "$dir/tsconfig.json" ] && [ -d "$dir/src" ]; then
    echo "========== BUILDING: $name =========="
    cd "$dir"
    output=$(npx tsc 2>&1)
    rc=$?
    if [ $rc -eq 0 ]; then
      SUCCESS=$((SUCCESS + 1))
      # Count dist files
      if [ -d "$dir/dist" ]; then
        dist_count=$(find "$dir/dist" -type f | wc -l)
      else
        dist_count=0
      fi
      RESULTS="${RESULTS}✅ $name (dist: ${dist_count} files)\n"
      echo "✅ OK (dist: ${dist_count} files)"
    else
      FAIL=$((FAIL + 1))
      # Grab first 5 lines of error
      err=$(echo "$output" | head -20)
      RESULTS="${RESULTS}❌ $name:\n${err}\n\n"
      echo "❌ FAILED"
      echo "$err"
    fi
  fi
done

echo ""
echo "========================================"
echo "SUMMARY: $SUCCESS succeeded, $FAIL failed"
echo "========================================"
echo "$RESULTS"
