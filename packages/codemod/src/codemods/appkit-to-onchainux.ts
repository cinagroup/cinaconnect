/**
 * appkit-to-onchainux codemod
 *
 * Transforms:
 *   - @reown/appkit*     → @onchainux/*
 *   - @web3modal/*       → @onchainux/*
 *   - Web3Modal           → OnChainUX
 *   - createWeb3Modal     → createOnChainUX
 *   - AppKit              → OnChainUX
 *   - useWeb3Modal        → useOnChainUX
 *   - W3mButton           → OnChainUXButton
 *   - W3mNetworkSelect    → OnChainUXNetworkSelect
 *   - Config object keys  → OnChainUXConfig keys
 */

export interface CodemodResult {
  transformed: boolean;
  original: string;
  output: string;
  changes: string[];
}

// ── Import / require path rewrites ──────────────────────────────────────────

const PACKAGE_RENAMES: [RegExp, string][] = [
  [/@reown\/appkit-([a-z0-9-]+)/g, "@onchainux/$1"],
  [/@reown\/appkit/g, "@onchainux/core-sdk"],
  [/@web3modal\/([a-z0-9-]+)/g, "@onchainux/$1"],
  [/@web3modal\/ethereum/g, "@onchainux/ethereum"],
  [/@web3modal\/wagmi/g, "@onchainux/wagmi"],
  [/@web3modal\/react/g, "@onchainux/react"],
  [/@web3modal\/ui/g, "@onchainux/ui"],
  [/@web3modal\/core/g, "@onchainux/core-sdk"],
  [/@web3modal\/html/g, "@onchainux/html"],
];

// ── Component / function name rewrites ──────────────────────────────────────

const IDENTIFIER_RENAMES: [RegExp, string][] = [
  // Core classes / factories
  [/Web3Modal\b/g, "OnChainUX"],
  [/createWeb3Modal\b/g, "createOnChainUX"],
  [/createAppKit\b/g, "createOnChainUX"],
  [/AppKit\b/g, "OnChainUX"],

  // Hooks
  [/useWeb3Modal\b/g, "useOnChainUX"],
  [/useWeb3ModalState\b/g, "useOnChainUXState"],
  [/useWeb3ModalTheme\b/g, "useOnChainUXTheme"],
  [/useAppKit\b/g, "useOnChainUX"],
  [/useAppKitState\b/g, "useOnChainUXState"],
  [/useAppKitTheme\b/g, "useOnChainUXTheme"],
  [/useAppKitAccount\b/g, "useOnChainUXAccount"],
  [/useAppKitNetwork\b/g, "useOnChainUXNetwork"],

  // Components
  [/w3m-button\b/gi, "onchainux-button"],
  [/W3mButton\b/g, "OnChainUXButton"],
  [/w3m-network-select\b/gi, "onchainux-network-select"],
  [/W3mNetworkSelect\b/g, "OnChainUXNetworkSelect"],
  [/w3m-modal\b/gi, "onchainux-modal"],
  [/W3mModal\b/g, "OnChainUXModal"],
  [/app-kit-button\b/gi, "onchainux-button"],
  [/AppKitButton\b/g, "OnChainUXButton"],

  // Type names
  [/Web3ModalConfig\b/g, "OnChainUXConfig"],
  [/AppKitConfig\b/g, "OnChainUXConfig"],
  [/Web3ModalTheme\b/g, "OnChainUXTheme"],
  [/AppKitTheme\b/g, "OnChainUXTheme"],
];

// ── Config key rewrites ────────────────────────────────────────────────────

const CONFIG_KEY_RENAMES: [RegExp, string][] = [
  [/projectId\b/g, "projectId"], // stays the same — already correct
  [/walletConnectProjectId\b/g, "projectId"],
  [/enableAnalytics\b/g, "analytics"],
  [/themeMode\b/g, "themeMode"],
  [/themeVariables\b/g, "themeVariables"],
  [/featuredWalletIds\b/g, "featuredWalletIds"],
  [/excludeWalletIds\b/g, "excludeWalletIds"],
  [/defaultChain\b/g, "defaultChain"],
  [/chains\b/g, "chains"],
  [/tokens\b/g, "tokens"],
  [/allowUnsupportedChain\b/g, "allowUnsupportedChain"],
];

// ── Main transform ──────────────────────────────────────────────────────────

/**
 * Apply the AppKit/Web3Modal → OnChainUX transformation to source text.
 */
export function transformAppKitToOnChainUX(source: string): CodemodResult {
  let output = source;
  const changes: string[] = [];

  // 1. Package imports/requires
  for (const [pattern, replacement] of PACKAGE_RENAMES) {
    const before = output;
    output = output.replace(pattern, replacement);
    if (output !== before) {
      const match = before.match(pattern);
      if (match) changes.push(`Renamed package: ${match[0]} → ${replacement}`);
    }
  }

  // 2. Identifiers (components, hooks, classes)
  for (const [pattern, replacement] of IDENTIFIER_RENAMES) {
    const before = output;
    output = output.replace(pattern, replacement);
    if (output !== before) {
      const match = before.match(pattern);
      if (match) changes.push(`Renamed identifier: ${match[0]} → ${replacement}`);
    }
  }

  // 3. Config keys (only in config-like contexts, applied globally for safety)
  for (const [pattern, replacement] of CONFIG_KEY_RENAMES) {
    const before = output;
    output = output.replace(pattern, replacement);
    if (output !== before) {
      changes.push(`Renamed config key: ${pattern.source} → ${replacement}`);
    }
  }

  return {
    transformed: output !== source,
    original: source,
    output,
    changes,
  };
}
