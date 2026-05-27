/**
 * connectkit-to-cinacoin codemod
 *
 * Transforms Family.co ConnectKit + wagmi code to Cinacoin equivalents:
 *   - connectkit              → @cinacoin/react
 *   - wagmi                   → @cinacoin/react
 *   - ConnectKitProvider      → CinacoinProvider
 *   - ConnectKitButton         → ConnectButton
 *   - useAccount (wagmi)       → useAccount (from @cinacoin/react)
 *   - useConnect (wagmi)       → useConnect (from @cinacoin/react)
 *   - useDisconnect (wagmi)    → useDisconnect (from @cinacoin/react)
 *   - createConfig             → Inline CinacoinProvider config
 *   - wagmi connectors         → Wallet ID strings
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
  // ConnectKit
  [/connectkit\/server/g, '@cinacoin/next/server'],
  [/connectkit/g, '@cinacoin/react'],

  // wagmi packages → @cinacoin
  [/wagmi\/connectors/g, '@cinacoin/core-sdk'],
  [/wagmi\/actions/g, '@cinacoin/core-sdk'],
  [/wagmi\/chains/g, '@cinacoin/core-sdk'],
  [/wagmi/g, '@cinacoin/react'],

  // viem — keep as-is (optional)
  // [/viem/g, 'viem'],

  // QueryClient no longer needed
  [/@tanstack\/react-query/g, '/* Removed: @tanstack/react-query is not needed with Cinacoin */'],
];

// ── Component / function name rewrites ──────────────────────────────────────

const IDENTIFIER_RENAMES: [RegExp, string][] = [
  // Providers
  [/ConnectKitProvider\b/g, 'CinacoinProvider'],
  [/WagmiProvider\b/g, '/* Removed: */'],

  // Components
  [/ConnectKitButton\b/g, 'ConnectButton'],

  // Hooks — same names, different package
  // useAccount, useConnect, useDisconnect keep their names

  // Connector factories
  [/walletConnect\(\s*\{/g, "'walletconnect' /* connector options removed, use config instead */ {"],
  [/injected\(\)/g, "'metamask'"],
  [/coinbaseWallet\(\s*\{/g, "'coinbase' /* connector options removed */ {"],
  [/safe\(\s*\{/g, "'safe' /* connector options removed */ {"],
  [/metaMask\(\)/g, "'metamask'"],
  [/walletConnectModal\(\s*\{/g, "'walletconnect' /* options removed */ {"],

  // Chain ID references
  [/\bmainnet\.id\b/g, "'eip155:1'"],
  [/\bgoerli\.id\b/g, "'eip155:5'"],
  [/\bsepolia\.id\b/g, "'eip155:11155111'"],
  [/\bpolygon\.id\b/g, "'eip155:137'"],
  [/\bpolygonMumbai\.id\b/g, "'eip155:80001'"],
  [/\barbitrum\.id\b/g, "'eip155:42161'"],
  [/\boptimism\.id\b/g, "'eip155:10'"],
  [/\bbase\.id\b/g, "'eip155:8453'"],
  [/\bbnb\.id\b/g, "'eip155:56'"],
  [/\bavalanche\.id\b/g, "'eip155:43114'"],
  [/\bzora\.id\b/g, "'eip155:7777777'"],
  [/\bbaseSepolia\.id\b/g, "'eip155:84532'"],
  [/\bholesky\.id\b/g, "'eip155:17000'"],
  [/\blinea\.id\b/g, "'eip155:59144'"],
  [/\bscroll\.id\b/g, "'eip155:534352'"],

  // switchChain pattern
  [/switchChain\(\{\s*chainId\s*:\s*/g, 'switchChain('],

  // connect pattern
  [/connect\(\{\s*connector\s*:\s*/g, 'connect('],
];

// ── Config key rewrites ─────────────────────────────────────────────────────

const CONFIG_KEY_RENAMES: [RegExp, string][] = [
  [/theme\s*:\s*['"]dark['"]/g, "themeMode: 'dark'"],
  [/theme\s*:\s*['"]light['"]/g, "themeMode: 'light'"],
  [/theme\s*:\s*['"]auto['"]/g, "themeMode: 'auto'"],
  [/customTheme\s*:/g, '// Use design tokens instead: import "@cinacoin/design-tokens/base.css"'],
  [/initialChainId\s*:/g, '// First chain in chains array is default'],
  [/language\s*:\s*['"][^"']+['"]/g, '// Use @cinacoin/i18n for localization'],
  [/reduceMotion\s*:/g, '// Motion preference handled by OS setting'],
  [/walletConnectOnyModalOptions\s*:/g, '// Use ConnectModal component instead'],
];

// ── Pattern-based rewrites ──────────────────────────────────────────────────

const PATTERN_REWRITES: { pattern: RegExp; description: string; replacement: string }[] = [
  // Remove WagmiProvider wrapper
  {
    pattern: /<WagmiProvider[^>]*>[\s\S]*?<\/WagmiProvider>/g,
    description: 'Removed WagmiProvider wrapper',
    replacement: '/* WagmiProvider removed — CinacoinProvider handles all state */',
  },

  // Remove QueryClientProvider wrapper
  {
    pattern: /<QueryClientProvider[^>]*>[\s\S]*?<\/QueryClientProvider>/g,
    description: 'Removed QueryClientProvider wrapper',
    replacement: '/* QueryClientProvider removed — Cinacoin manages its own state */',
  },

  // Remove QueryClient creation
  {
    pattern: /const\s+queryClient\s*=\s*new\s+QueryClient\s*\(\s*\)\s*;?/g,
    description: 'Removed QueryClient creation',
    replacement: '/* QueryClient removed — not needed with Cinacoin */',
  },

  // Remove createConfig
  {
    pattern: /const\s+config\s*=\s*createConfig\s*\(\s*\{/g,
    description: 'createConfig → inline CinacoinProvider config',
    replacement: '// Use inline config in <CinacoinProvider>',
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
    description: 'Removed http() import',
    replacement: '/* http() import removed — RPC URLs in chain config */',
  },

  // Remove connectors array (connectors are auto-registered)
  {
    pattern: /connectors\s*:\s*\[[\s\S]*?\],?\s*/g,
    description: 'Removed connectors array (wallets auto-registered via EIP-6963)',
    replacement: '/* connectors removed — use walletId strings with connect() */\n',
  },
];

// ── Main transform ──────────────────────────────────────────────────────────

/**
 * Apply the ConnectKit → Cinacoin transformation to source text.
 */
export function transformConnectKitToCinacoin(source: string): CodemodResult {
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

  // 2. Identifiers
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

  // 4. Pattern rewrites
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
