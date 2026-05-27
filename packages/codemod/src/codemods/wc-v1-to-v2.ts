/**
 * wc-v1-to-v2 codemod
 *
 * Transforms WalletConnect v1 patterns → WalletConnect v2 / Cinacoin patterns:
 *   - bridge URL      → projectId
 *   - v1 provider init → v2 Web3Modal / Cinacoin init
 *   - v1 events       → v2 event names
 *   - v1 methods      → v2 methods
 */

export interface CodemodResult {
  transformed: boolean;
  original: string;
  output: string;
  changes: string[];
}

// ── Pattern replacements ───────────────────────────────────────────────────

type PatternRule = {
  pattern: RegExp;
  description: string;
  replacement: string | ((match: string) => string);
};

const PATTERN_REPLACEMENTS: PatternRule[] = [
  // Bridge URL → projectId
  {
    pattern: /bridge\s*:\s*['"`]https?:\/\/[^'"`]+['"`]/g,
    description: "bridge URL",
    replacement: "projectId: 'YOUR_PROJECT_ID'",
  },

  // WalletConnect v1 constructor
  {
    pattern: /new\s+WalletConnect\s*\(\s*\{[\s\S]*?bridge[\s\S]*?\}\s*\)/g,
    description: "WalletConnect v1 constructor",
    replacement: () => "new WalletConnect({ projectId: 'YOUR_PROJECT_ID', metadata: { ... } })",
  },

  // @walletconnect/client v1 imports
  {
    pattern: /@walletconnect\/client\b/g,
    description: "@walletconnect/client → @walletconnect/sign-client",
    replacement: "@walletconnect/sign-client",
  },
  {
    pattern: /@walletconnect\/browser\s*-?\s*client\b/g,
    description: "@walletconnect/browser-client → @walletconnect/sign-client",
    replacement: "@walletconnect/sign-client",
  },

  // Provider init: WalletConnectProvider v1
  {
    pattern: /new\s+WalletConnectProvider\s*\(\s*\{[\s\S]*?rpc[\s\S]*?\}\s*\)/g,
    description: "WalletConnectProvider v1 init",
    replacement: () => "new WalletConnectProvider({ projectId: 'YOUR_PROJECT_ID', chains: [...] })",
  },

  // v1 event names → v2
  {
    pattern: /\.on\s*\(\s*['"]connect['"]\s*,/g,
    description: "connect event → session_proposal",
    replacement: ".on('session_proposal',",
  },
  {
    pattern: /\.on\s*\(\s*['"]disconnect['"]\s*,/g,
    description: "disconnect event → session_delete",
    replacement: ".on('session_delete',",
  },
  {
    pattern: /\.on\s*\(\s*['"]session_update['"]\s*,/g,
    description: "session_update event (v1→v2)",
    replacement: ".on('session_update',",
  },
  {
    pattern: /\.on\s*\(\s*['"]call_request['"]\s*,/g,
    description: "call_request → session_request",
    replacement: ".on('session_request',",
  },

  // v1 methods
  {
    pattern: /\.createSession\s*\(\s*\)/g,
    description: "createSession → connect",
    replacement: ".connect()",
  },
  {
    pattern: /\.killSession\s*\(\s*\)/g,
    description: "killSession → disconnect",
    replacement: ".disconnect()",
  },
  {
    pattern: /\.sendTransaction\s*\(/g,
    description: "sendTransaction → request wrapper",
    replacement: ".request({ method: 'eth_sendTransaction', params: [",
  },
];

// ── Simple line-based v1 → v2 transforms ───────────────────────────────────

const LINE_TRANSFORMS: [RegExp, string][] = [
  // bridge URL pattern in config objects
  [
    /(bridge\s*:\s*)['"`]https?:\/\/[a-z0-9._-]+['"`]/gi,
    "$1'YOUR_PROJECT_ID'",
  ],

  // v1: WalletConnect({ bridge: '...', ... })
  [
    /(WalletConnect\s*\(\s*\{[^}]*?)bridge\s*:\s*['"`][^'"`]*['"`]/gi,
    "$1projectId: 'YOUR_PROJECT_ID'",
  ],

  // v1 RPC map → v2 chains
  [
    /(rpc\s*:\s*\{[^}]*\})/gi,
    "chains: [{ id: 1, rpcUrl: '...' }]",
  ],

  // v1: .on('disconnect', cb)
  [
    /\.on\s*\(\s*['"]disconnect['"]\s*,/g,
    ".on('session_delete',",
  ],

  // v1: .on('call_request', cb)
  [
    /\.on\s*\(\s*['"]call_request['"]\s*,/g,
    ".on('session_request',",
  ],

  // v1: .on('connect', cb) — only if not already session_proposal
  [
    /\.on\s*\(\s*['"]connect['"]\s*,/g,
    ".on('session_proposal',",
  ],

  // v1 method names
  [
    /\.createSession\s*\(\s*\)/g,
    ".connect()",
  ],
  [
    /\.killSession\s*\(\s*\)/g,
    ".disconnect()",
  ],
];

// ── Main transform ──────────────────────────────────────────────────────────

/**
 * Apply WalletConnect v1 → v2 transformation.
 */
export function transformWcV1ToV2(source: string): CodemodResult {
  let output = source;
  const changes: string[] = [];

  for (const rule of PATTERN_REPLACEMENTS) {
    const before = output;
    output = output.replace(rule.pattern, rule.replacement as any);
    if (output !== before) {
      changes.push(`Transformed: ${rule.description}`);
    }
  }

  for (const [pattern, replacement] of LINE_TRANSFORMS) {
    const before = output;
    output = output.replace(pattern, replacement);
    if (output !== before) {
      changes.push(`Pattern rewrite: ${pattern.source}`);
    }
  }

  return {
    transformed: output !== source,
    original: source,
    output,
    changes,
  };
}
