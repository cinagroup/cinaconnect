/**
 * rainbowkit-to-cinacoin codemod
 *
 * Transforms RainbowKit + wagmi code to Cinacoin equivalents:
 *   - @rainbow-me/rainbowkit  → @cinacoin/react
 *   - wagmi                   → @cinacoin/react
 *   - ConnectButton            → ConnectButton (from @cinacoin/react)
 *   - useConnectModal          → ConnectModal component
 *   - useChainModal            → ChainSwitcher component
 *   - useAccountModal          → ConnectButton (connected state)
 *   - useAccount (wagmi)       → useAccount (from @cinacoin/react)
 *   - useConnect (wagmi)       → useConnect (from @cinacoin/react)
 *   - useDisconnect (wagmi)    → useDisconnect (from @cinacoin/react)
 *   - RainbowKitProvider       → CinacoinProvider
 *   - wagmi chains             → Cinacoin ChainConfig
 */

export interface CodemodResult {
  transformed: boolean;
  original: string;
  output: string;
  changes: string[];
}

// ── Import / require path rewrites ──────────────────────────────────────────

const PACKAGE_RENAMES: [RegExp, string][] = [
  // RainbowKit packages
  [/@rainbow-me\/rainbowkit\/styles\.css/g, '@cinacoin/design-tokens/base.css'],
  [/@rainbow-me\/rainbowkit/g, '@cinacoin/react'],

  // wagmi packages → @cinacoin/react (hooks are re-exported)
  [/wagmi\/connectors/g, '@cinacoin/core-sdk'],
  [/wagmi\/actions/g, '@cinacoin/core-sdk'],
  [/wagmi\/chains/g, '@cinacoin/core-sdk'],
  [/wagmi/g, '@cinacoin/react'],

  // viem — keep as-is, but note it's optional
  // [/viem/g, 'viem'], // no change

  // QueryClient is no longer needed — will be noted in changes
  [/@tanstack\/react-query/g, '/* Removed: @tanstack/react-query is not needed with Cinacoin */'],
];

// ── Component / function name rewrites ──────────────────────────────────────

const IDENTIFIER_RENAMES: [RegExp, string][] = [
  // Providers
  [/RainbowKitProvider\b/g, 'CinacoinProvider'],
  [/WagmiProvider\b/g, '/* Removed: */'],
  [/getDefaultConfig\b/g, 'createCinacoinConfig'],

  // Hooks — RainbowKit
  [/useConnectModal\b/g, 'useCinacoinModal'],
  [/useChainModal\b/g, 'useCinacoinChain'],
  [/useAccountModal\b/g, 'useCinacoinAccount'],

  // Hooks — wagmi (same names, different package)
  // useAccount, useConnect, useDisconnect keep their names

  // Components
  [/<ConnectKitProvider\b/g, '<CinacoinProvider'],
  [/<ConnectKitButton\b/g, '<ConnectButton'],

  // Connector functions
  [/injected\(\)/g, "'metamask'"],
  [/walletConnect\(/g, "'walletconnect', { /* connector options removed */ "],
  [/coinbaseWallet\(/g, "'coinbase', { /* connector options removed */ "],
  [/safe\(/g, "'safe', { /* connector options removed */ "],
  [/metaMask\(/g, "'metamask'"],
  [/walletConnectModal\(/g, "'walletconnect'"],

  // Chain references
  [/\bmainnet\.id\b/g, "'eip155:1'"],
  [/\bgoerli\.id\b/g, "'eip155:5'"],
  [/\bsepolia\.id\b/g, "'eip155:11155111'"],
  [/\bpolygon\.id\b/g, "'eip155:137'"],
  [/\bpolygonMumbai\.id\b/g, "'eip155:80001'"],
  [/\barbitrum\.id\b/g, "'eip155:42161'"],
  [/\barbitrumGoerli\.id\b/g, "'eip155:421613'"],
  [/\boptimism\.id\b/g, "'eip155:10'"],
  [/\boptimismGoerli\.id\b/g, "'eip155:420'"],
  [/\bbase\.id\b/g, "'eip155:8453'"],
  [/\bbaseGoerli\.id\b/g, "'eip155:84531'"],
  [/\bbnb\.id\b/g, "'eip155:56'"],
  [/\bbnbTestnet\.id\b/g, "'eip155:97'"],
  [/\bavalanche\.id\b/g, "'eip155:43114'"],
  [/\bavalancheFuji\.id\b/g, "'eip155:43113'"],
  [/\bzora\.id\b/g, "'eip155:7777777'"],
  [/\bzoraSepolia\.id\b/g, "'eip155:999999999'"],
  [/\bbaseSepolia\.id\b/g, "'eip155:84532'"],
  [/\boptimismSepolia\.id\b/g, "'eip155:11155420'"],
  [/\bsepolia\.id\b/g, "'eip155:11155111'"],
  [/\bholesky\.id\b/g, "'eip155:17000'"],

  // switchChain pattern
  [/switchChain\(\{\s*chainId\s*:\s*/g, "switchChain("],

  // connect pattern: connect({ connector: ... }) → connect('walletId')
  [/connect\(\{\s*connector\s*:\s*/g, 'connect('],
];

// ── Config key rewrites ─────────────────────────────────────────────────────

const CONFIG_KEY_RENAMES: [RegExp, string][] = [
  [/appName\s*:/g, 'metadata: { name:'],
  [/projectId\s*:\s*['"`]YOUR_WALLETCONNECT_PROJECT_ID['"`]/g, "projectId: 'YOUR_CINACOIN_PROJECT_ID'"],
  [/theme\s*:\s*['"]dark['"]/g, "themeMode: 'dark'"],
  [/theme\s*:\s*['"]light['"]/g, "themeMode: 'light'"],
  [/customTheme\s*:/g, '// Use design tokens instead: import "@cinacoin/design-tokens/base.css"'],
  [/initialChainId\s*:/g, '// First chain in chains array is default'],
  [/modalSize\s*:/g, '// Modal size is responsive by default'],
  [/showRecentConnections\s*:/g, '// Recent connections shown by default'],
  [/coolMode\s*:/g, '// Not available — use custom theming'],
];

// ── Pattern-based rewrites ──────────────────────────────────────────────────

const PATTERN_REWRITES: { pattern: RegExp; description: string; replacement: string }[] = [
  // Remove WagmiProvider wrapper
  {
    pattern: /<WagmiProvider[^>]*>[\s\S]*?<\/WagmiProvider>/g,
    description: 'Removed WagmiProvider wrapper (no longer needed)',
    replacement: '/* WagmiProvider removed — CinacoinProvider handles all state */',
  },

  // Remove QueryClientProvider wrapper
  {
    pattern: /<QueryClientProvider[^>]*>[\s\S]*?<\/QueryClientProvider>/g,
    description: 'Removed QueryClientProvider wrapper (no longer needed)',
    replacement: '/* QueryClientProvider removed — Cinacoin manages its own state */',
  },

  // Remove QueryClient creation
  {
    pattern: /const\s+queryClient\s*=\s*new\s+QueryClient\s*\(\s*\)\s*;?/g,
    description: 'Removed QueryClient creation (no longer needed)',
    replacement: '/* QueryClient removed — not needed with Cinacoin */',
  },

  // Remove @rainbow-me/rainbowkit/styles.css import
  {
    pattern: /import\s+['"]@rainbow-me\/rainbowkit\/styles\.css['"]\s*;?/g,
    description: 'Replaced RainbowKit styles with Cinacoin design tokens',
    replacement: 'import "@cinacoin/design-tokens/base.css"',
  },

  // Transform createConfig to inline config
  {
    pattern: /const\s+config\s*=\s*createConfig\s*\(\s*\{/g,
    description: 'createConfig → inline CinacoinProvider config',
    replacement: '// Use inline config in <CinacoinProvider> config={{',
  },

  // Transform chains array
  {
    pattern: /chains\s*:\s*\[[\s\S]*?\]/g,
    description: 'wagmi chains → Cinacoin ChainConfig array',
    replacement: "chains: [{ id: 'eip155:1', name: 'Ethereum', rpcUrl: 'https://rpc.yourdomain.com/eth' }]",
  },

  // Transform transports
  {
    pattern: /transports\s*:\s*\{[\s\S]*?\}/g,
    description: 'wagmi transports → RPC URLs in chain config',
    replacement: '/* transports no longer needed — RPC URLs are in chain config */',
  },

  // Remove http() import
  {
    pattern: /import\s*\{\s*http\s*\}\s*from\s*['"]wagmi['"]\s*;?/g,
    description: 'Removed http() import (no longer needed)',
    replacement: '/* http() import removed — RPC URLs in chain config */',
  },
];

// ── Main transform ──────────────────────────────────────────────────────────

/**
 * Apply the RainbowKit → Cinacoin transformation to source text.
 */
export function transformRainbowKitToCinacoin(source: string): CodemodResult {
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

  // 3. Config keys
  for (const [pattern, replacement] of CONFIG_KEY_RENAMES) {
    const before = output;
    output = output.replace(pattern, replacement);
    if (output !== before) {
      changes.push(`Renamed config key: ${pattern.source}`);
    }
  }

  // 4. Pattern-based rewrites
  for (const rule of PATTERN_REWRITES) {
    const before = output;
    output = output.replace(rule.pattern, rule.replacement);
    if (output !== before) {
      changes.push(`Pattern: ${rule.description}`);
    }
  }

  return {
    transformed: output !== source,
    original: source,
    output,
    changes,
  };
}
