#!/usr/bin/env bash
# run-tests.sh — Run all CinaCoin package tests from workspace root.
# Usage: bash run-tests.sh   (from onux/ directory)
#
# Auto-detects all packages with a tests/ directory.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_FILES=0

echo "========================================"
echo "  CinaCoin Package Test Runner"
echo "========================================"
echo ""

# Auto-detect packages with tests/ directories
for dir in packages/*/; do
  pkg=$(basename "$dir")
  TESTS_DIR="${dir}tests"

  if [ ! -d "$TESTS_DIR" ]; then
    continue
  fi

  echo -e "\n${YELLOW}── ${pkg} ──${NC}"

  # Count test files
  FILE_COUNT=$(find "$TESTS_DIR" -name '*.test.ts' -type f | wc -l | tr -d ' ')
  TOTAL_FILES=$((TOTAL_FILES + FILE_COUNT))

  if [ "$FILE_COUNT" -eq 0 ]; then
    echo -e "  ${YELLOW}(no .test.ts files)${NC}"
    continue
  fi

  for test_file in "${TESTS_DIR}"/*.test.ts; do
    [ -f "$test_file" ] || continue
    TEST_NAME=$(basename "$test_file" .test.ts)
    echo -n "  ${TEST_NAME}: "

    # Run with tsx, suppress output so we only see our pass/fail
    if npx tsx "$test_file" > /dev/null 2>&1; then
      echo -e "${GREEN}✓${NC}"
      TOTAL_PASS=$((TOTAL_PASS + 1))
    else
      echo -e "${RED}✗${NC}"
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
    fi
  done
done

echo ""
echo "========================================"
echo -e "  ${GREEN}Passed: ${TOTAL_PASS}${NC}  ${RED}Failed: ${TOTAL_FAIL}${NC}  Files: ${TOTAL_FILES}"
echo "========================================"

if [ "$TOTAL_FAIL" -gt 0 ]; then
  exit 1
fi
