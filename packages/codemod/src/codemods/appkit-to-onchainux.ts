/**
 * appkit-to-cinacoin codemod
 *
 * Transforms:
 *   - @reown/appkit*     → @cinacoin/*
 *   - @web3modal/*       → @cinacoin/*
 *   - Web3Modal           → Cinacoin
 *   - createWeb3Modal     → createCinacoin
 *   - AppKit              → Cinacoin
 *   - useWeb3Modal        → useCinacoin
 *   - W3mButton           → CinacoinButton
 *   - W3mNetworkSelect    → CinacoinNetworkSelect
 *   - Config object keys  → CinacoinConfig keys
 */

export interface CodemodResult {
  transformed: boolean;
  original: string;
  output: string;
  changes: string[];
}

// ── Import / require path rewrites ──────────────────────────────────────────

const PACKAGE_RENAMES: [RegExp, string][] = [
  [/@reown\/appkit-([a-z0-9-]+)/g, "@cinacoin/$1"],
  [/@reown\/appkit/g, "@cinacoin/core-sdk"],
  [/@web3modal\/([a-z0-9-]+)/g, "@cinacoin/$1"],
  [/@web3modal\/ethereum/g, "@cinacoin/ethereum"],
  [/@web3modal\/wagmi/g, "@cinacoin/wagmi"],
  [/@web3modal\/react/g, "@cinacoin/react"],
  [/@web3modal\/ui/g, "@cinacoin/ui"],
  [/@web3modal\/core/g, "@cinacoin/core-sdk"],
  [/@web3modal\/html/g, "@cinacoin/html"],
];

// ── Component / function name rewrites ──────────────────────────────────────

const IDENTIFIER_RENAMES: [RegExp, string][] = [
  // Core classes / factories
  [/Web3Modal\b/g, "Cinacoin"],
  [/createWeb3Modal\b/g, "createCinacoin"],
  [/createAppKit\b/g, "createCinacoin"],
  [/AppKit\b/g, "Cinacoin"],

  // Hooks
  [/useWeb3Modal\b/g, "useCinacoin"],
  [/useWeb3ModalState\b/g, "useCinacoinState"],
  [/useWeb3ModalTheme\b/g, "useCinacoinTheme"],
  [/useAppKit\b/g, "useCinacoin"],
  [/useAppKitState\b/g, "useCinacoinState"],
  [/useAppKitTheme\b/g, "useCinacoinTheme"],
  [/useAppKitAccount\b/g, "useCinacoinAccount"],
  [/useAppKitNetwork\b/g, "useCinacoinNetwork"],

  // Components
  [/w3m-button\b/gi, "cinacoin-button"],
  [/W3mButton\b/g, "CinacoinButton"],
  [/w3m-network-select\b/gi, "cinacoin-network-select"],
  [/W3mNetworkSelect\b/g, "CinacoinNetworkSelect"],
  [/w3m-modal\b/gi, "cinacoin-modal"],
  [/W3mModal\b/g, "CinacoinModal"],
  [/app-kit-button\b/gi, "cinacoin-button"],
  [/AppKitButton\b/g, "CinacoinButton"],

  // Type names
  [/Web3ModalConfig\b/g, "CinacoinConfig"],
  [/AppKitConfig\b/g, "CinacoinConfig"],
  [/Web3ModalTheme\b/g, "CinacoinTheme"],
  [/AppKitTheme\b/g, "CinacoinTheme"],
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
 * Apply the AppKit/Web3Modal → Cinacoin transformation to source text.
 */
export function transformAppKitToCinacoin(source: string): CodemodResult {
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
