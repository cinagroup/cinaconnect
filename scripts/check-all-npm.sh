#!/bin/bash
echo "Checking @cinacoin NPM packages accurately..."
echo ""

# List all 72 local packages
LOCAL_PACKAGES=(
    aa-sdk
    adapter-bitcoin
    adapter-cosmos
    adapter-hedera
    adapter-near
    adapter-starknet
    adapter-sui
    adapter-xrpl
    analytics
    android-kotlin
    angular
    batch-transaction
    blockchain-api
    bundler
    cdn
    cinacoin-i18n
    cinacoin-ui-theme
    cli
    codemod
    config
    core-sdk
    core-ui
    cross-chain-sync
    custom-connectors
    deposit
    design-tokens
    dotnet
    embedded-wallet
    ens-resolver
    erc6492
    explorer
    farcaster-miniapp
    flutter-dart
    gas-estimator
    gas-sponsorship
    i18n
    ios-swift
    keys-server
    kyc
    multiwallet
    next
    notify-server
    nuxt
    onramp-sdk
    passkey-auth
    paymaster
    payment-flow
    pay-ui
    performance-utils
    push-server
    react
    react-native
    relay-server
    rpc-proxy
    safe-decoder
    session-keys
    siwe
    siwx
    social-login
    svelte
    swap-sdk
    telegram-miniapp
    testing
    token-list
    travel-rule-demo
    ui-theme
    unity-csharp
    vue
    wallet-buttons
    walletconnect-v2
    wallet-recommender
    wallet-recovery
)

echo "Checking ${#LOCAL_PACKAGES[@]} local packages..."
echo ""

PUBLISHED=0
UNPUBLISHED=0

for pkg in "${LOCAL_PACKAGES[@]}"; do
    FULL_PKG="@cinacoin/$pkg"
    version=$(npm view "$FULL_PKG" version 2>/dev/null)
    if [ -n "$version" ]; then
        echo "✓ $FULL_PKG - v$version"
        ((PUBLISHED++))
    else
        echo "⊗ $FULL_PKG - NOT PUBLISHED"
        ((UNPUBLISHED++))
    fi
done

echo ""
echo "=========================================="
echo "NPM 发布状态汇总"
echo "=========================================="
echo "总包数: ${#LOCAL_PACKAGES[@]}"
echo "已发布: $PUBLISHED"
echo "未发布: $UNPUBLISHED"
echo "发布率: $(awk "BEGIN {printf \"%.1f%%\", $PUBLISHED * 100 / ${#LOCAL_PACKAGES[@]} }")"
echo "=========================================="