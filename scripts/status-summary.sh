#!/usr/bin/env bash
# status-summary.sh — Quick status summary for CinaCoin monorepo
# Usage: ./scripts/status-summary.sh [--json]

set -euo pipefail

MONOREPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$MONOREPO_ROOT"

JSON_MODE=false
if [ "${1:-}" = "--json" ]; then
  JSON_MODE=true
fi

# ─── Package counts ───
TOTAL_PACKAGES=$(find packages -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
BUILT_PACKAGES=$(find packages -maxdepth 2 -name "dist" -type d -not -path "*/node_modules/*" 2>/dev/null | wc -l)
PUBLISHED_PACKAGES=1  # @cinacoin/core-sdk

# Categories
ADAPTER_COUNT=$(find packages -maxdepth 1 -name "adapter-*" -type d 2>/dev/null | wc -l)
FRAMEWORK_COUNT=$(for f in react next vue svelte angular nuxt testing; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)
MOBILE_COUNT=$(for f in android-kotlin ios-swift flutter-dart unity-csharp dotnet; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)
UI_COUNT=$(for f in core-ui ui-theme design-tokens cinacoin-ui-theme pay-ui wallet-buttons; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)
AUTH_COUNT=$(for f in siwe siwx passkey-auth social-login embedded-wallet session-keys; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)
PAYMENT_COUNT=$(for f in swap-sdk onramp-sdk payment-flow deposit gas-estimator gas-sponsorship batch-transaction; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)
PLATFORM_COUNT=$(for f in telegram-miniapp farcaster-miniapp ens-resolver kyc; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)
ADVANCED_COUNT=$(for f in aa-sdk bundler paymaster cross-chain-sync multiwallet wallet-recovery wallet-recommender safe-decoder; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)
TOOL_COUNT=$(for f in codemod analytics config token-list explorer cdn custom-connectors i18n; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)
SPECIAL_COUNT=$(for f in performance-utils cinacoin-i18n push-server notify-server travel-rule-demo relay-server rpc-proxy keys-server blockchain-api cli; do [ -d "packages/$f" ] && echo 1; done 2>/dev/null | wc -l)

# ─── Test counts ───
TEST_FILES=$(find packages -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | wc -l)
E2E_SPECS=$(find e2e/tests -name "*.spec.ts" 2>/dev/null | wc -l)

# ─── Lines of code ───
TS_LOC=$(find packages apps -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

# ─── Published versions ───
CORE_VERSION=$(node -e "console.log(require('./packages/core-sdk/package.json').version)" 2>/dev/null || echo "unknown")
REACT_VERSION=$(node -e "console.log(require('./packages/react/package.json').version)" 2>/dev/null || echo "unknown")
NPM_VERSION=$(node -e "
  const { execSync } = require('child_process');
  try {
    const v = execSync('npm view @cinacoin/core-sdk version 2>/dev/null', {encoding:'utf8'}).trim();
    console.log(v);
  } catch { console.log('not published'); }
" 2>/dev/null || echo "unknown")

# ─── Cloudflare ───
CF_DEPLOYMENTS=2  # rpc-proxy + keys-server

if [ "$JSON_MODE" = true ]; then
  cat <<EOF
{
  "packages": {
    "total": $TOTAL_PACKAGES,
    "built": $BUILT_PACKAGES,
    "published": $PUBLISHED_PACKAGES,
    "categories": {
      "adapters": $ADAPTER_COUNT,
      "frameworks": $FRAMEWORK_COUNT,
      "mobile_engines": $MOBILE_COUNT,
      "ui_theme": $UI_COUNT,
      "auth_security": $AUTH_COUNT,
      "payments_defi": $PAYMENT_COUNT,
      "platform_integrations": $PLATFORM_COUNT,
      "advanced_features": $ADVANCED_COUNT,
      "dev_tools": $TOOL_COUNT,
      "specialized": $SPECIAL_COUNT
    }
  },
  "tests": {
    "unit_files": $TEST_FILES,
    "e2e_specs": $E2E_SPECS
  },
  "code": {
    "typescript_loc": ${TS_LOC:-0},
    "csharp_files_unity": 21,
    "csharp_files_dotnet": 22
  },
  "deployment": {
    "npm_published": $PUBLISHED_PACKAGES,
    "npm_version": "$NPM_VERSION",
    "cloudflare_workers": $CF_DEPLOYMENTS
  },
  "versions": {
    "core_sdk": "$CORE_VERSION",
    "react": "$REACT_VERSION"
  }
}
EOF
else
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║   CinaCoin — Status Summary                      ║"
  echo "║   $(date -u '+%Y-%m-%d %H:%M:%S UTC')                          ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo ""
  echo "📦 Packages"
  echo "   Total:       $TOTAL_PACKAGES"
  echo "   Built:       $BUILT_PACKAGES / $TOTAL_PACKAGES"
  echo "   Published:   $PUBLISHED_PACKAGES (npm: $NPM_VERSION)"
  echo ""
  echo "   By Category:"
  echo "   • Adapters:              $ADAPTER_COUNT"
  echo "   • Framework SDKs:        $FRAMEWORK_COUNT"
  echo "   • Mobile & Game Engines: $MOBILE_COUNT"
  echo "   • UI & Theme:            $UI_COUNT"
  echo "   • Auth & Security:       $AUTH_COUNT"
  echo "   • Payments & DeFi:       $PAYMENT_COUNT"
  echo "   • Platform Integrations: $PLATFORM_COUNT"
  echo "   • Advanced Features:     $ADVANCED_COUNT"
  echo "   • Dev Tools:             $TOOL_COUNT"
  echo "   • Specialized/Infra:     $SPECIAL_COUNT"
  echo ""
  echo "🧪 Tests"
  echo "   Unit test files: $TEST_FILES"
  echo "   E2E test specs:  $E2E_SPECS"
  echo ""
  echo "📊 Code Metrics"
  echo "   TypeScript LOC:    ${TS_LOC:-unknown}"
  echo "   C# files (Unity):  21"
  echo "   C# files (.NET):   22"
  echo ""
  echo "🚀 Deployment"
  echo "   npm published:     $PUBLISHED_PACKAGES package(s)"
  echo "   Core SDK version:  $CORE_VERSION"
  echo "   Cloudflare Workers: $CF_DEPLOYMENTS deployed"
  echo ""
  echo "💡 Tip: Run with --json for machine-readable output"
fi
