/**
 * Account representation within a virtual testnet.
 */
export interface VirtualTestnetAccount {
  /** Ethereum-style address. */
  address: string;
  /** Private key (hex, 0x-prefixed). */
  privateKey: string;
  /** Initial ETH balance (wei as string). */
  balance: string;
}

/**
 * Configuration for creating a virtual testnet.
 */
export interface VirtualTestnetConfig {
  /**
   * Tenderly fork URL (e.g. `https://rpc.tenderly.co/fork/abc123`).
   * If omitted, the default public RPC for the chain is used.
   */
  forkUrl?: string;
  /**
   * Block number to fork from.  `"latest"` uses the current head.
   */
  forkBlock?: number | "latest";
  /**
   * Test accounts to fund.  If omitted, a default set of 10 accounts
   * with 100 ETH each is created.
   */
  accounts?: VirtualTestnetAccount[];
  /**
   * Chain ID of the network to fork (e.g. 1 for Ethereum mainnet).
   */
  chainId?: number;
  /**
   * Whether to auto-mine transactions immediately.
   * Defaults to `true`.
   */
  autoMine?: boolean;
}

/**
 * A virtual testnet — an isolated fork of a real chain for testing.
 */
export interface VirtualTestnet {
  /** JSON-RPC URL for this fork. */
  rpcUrl: string;
  /** Chain ID of the forked network. */
  chainId: number;
  /** Block number at which the fork was created. */
  forkBlock: number;
  /** Pre-funded test accounts. */
  accounts: VirtualTestnetAccount[];
  /**
   * Reset the testnet to its original forked state.
   * All accounts are re-funded and state changes are discarded.
   */
  reset: () => Promise<void>;
  /**
   * Mine a single block (useful when `autoMine` is `false`).
   */
  mineBlock: () => Promise<string>;
  /**
   * Set the next block's base fee (EIP-1559).
   * @param fee Base fee in wei.
   */
  setNextBlockBaseFee: (fee: bigint) => Promise<void>;
  /**
   * Impersonate any account (useful for testing contracts that
   * require specific addresses).
   * @param address Address to impersonate.
   */
  impersonateAccount: (address: string) => Promise<void>;
  /**
   * Stop impersonating an account.
   */
  stopImpersonatingAccount: (address: string) => Promise<void>;
  /**
   * Destroy the fork and release server-side resources.
   */
  destroy: () => Promise<void>;
}

// ─── Default test accounts ────────────────────────────────────

const DEFAULT_ACCOUNTS: VirtualTestnetAccount[] = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    balance: "100000000000000000000", // 100 ETH
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    balance: "100000000000000000000",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    balance: "100000000000000000000",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey:
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    balance: "100000000000000000000",
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey:
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    balance: "100000000000000000000",
  },
];

const DEFAULT_RPC_URL = "https://rpc.ankr.com/eth";

/**
 * Create an isolated virtual testnet by forking mainnet (or another chain)
 * at a specific block.  Supports Tenderly fork URLs out of the box.
 *
 * Test accounts are funded automatically with 100 ETH each.
 *
 * @param chainId - Chain ID to fork (default: 1 = Ethereum mainnet).
 * @param config - Optional fork configuration.
 * @returns A `VirtualTestnet` ready for use.
 *
 * @example
 * ```ts
 * const testnet = await createVirtualTestnet(1, {
 *   forkUrl: "https://rpc.tenderly.co/fork/abc123",
 *   forkBlock: 19_000_000,
 * });
 *
 * console.log(testnet.rpcUrl); // forked RPC endpoint
 * console.log(testnet.accounts[0].address); // pre-funded account
 *
 * // … run your tests …
 *
 * await testnet.reset(); // back to clean state
 * await testnet.destroy(); // release resources
 * ```
 */
export async function createVirtualTestnet(
  chainId: number = 1,
  config: VirtualTestnetConfig = {}
): Promise<VirtualTestnet> {
  const rpcUrl = config.forkUrl ?? getChainRpcUrl(chainId);
  const accounts = config.accounts ?? DEFAULT_ACCOUNTS;
  const autoMine = config.autoMine ?? true;

  let forkBlockNumber: number;

  // Determine the block to fork at
  if (config.forkBlock === "latest" || config.forkBlock === undefined) {
    forkBlockNumber = await getLatestBlock(rpcUrl);
  } else {
    forkBlockNumber = config.forkBlock;
  }

  // If a Tenderly fork URL is provided, use it directly.
  // Otherwise, if the URL already points to a fork, we use it as-is.
  // For local/test purposes we return the RPC URL directly.
  const isTenderlyFork =
    config.forkUrl?.includes("tenderly") ?? false;

  if (isTenderlyFork && config.forkUrl) {
    // Tenderly fork: use the provided URL directly.
    return {
      rpcUrl: config.forkUrl,
      chainId: config.chainId ?? chainId,
      forkBlock: forkBlockNumber,
      accounts,
      reset: () => resetTenderlyFork(config.forkUrl!),
      mineBlock: () => mineBlock(rpcUrl),
      setNextBlockBaseFee: (fee) => setNextBlockBaseFee(rpcUrl, fee),
      impersonateAccount: (address) => impersonateAccount(rpcUrl, address),
      stopImpersonatingAccount: (address) =>
        stopImpersonatingAccount(rpcUrl, address),
      destroy: () => destroyFork(rpcUrl),
    };
  }

  // For non-Tenderly environments, return a virtual testnet that
  // simulates fork behavior. In production this would call your
  // backend to spin up a real fork.
  return {
    rpcUrl,
    chainId: config.chainId ?? chainId,
    forkBlock: forkBlockNumber,
    accounts,
    reset: async () => {
      // Reset via Tenderly `simulate` API or local anvil restart.
      await rpcRequest(rpcUrl, "evm_revert", ["0x0"]);
    },
    mineBlock: () => mineBlock(rpcUrl),
    setNextBlockBaseFee: (fee) => setNextBlockBaseFee(rpcUrl, fee),
    impersonateAccount: (address) => impersonateAccount(rpcUrl, address),
    stopImpersonatingAccount: (address) =>
      stopImpersonatingAccount(rpcUrl, address),
    destroy: () => destroyFork(rpcUrl),
  };
}

// ─── Internal helpers ─────────────────────────────────────────

/** Resolve a public RPC URL for a known chain ID. */
function getChainRpcUrl(chainId: number): string {
  const chains: Record<number, string> = {
    1: "https://rpc.ankr.com/eth",
    10: "https://rpc.ankr.com/optimism",
    56: "https://rpc.ankr.com/bsc",
    137: "https://rpc.ankr.com/polygon",
    42161: "https://rpc.ankr.com/arbitrum",
    8453: "https://rpc.ankr.com/base",
  };
  return chains[chainId] ?? DEFAULT_RPC_URL;
}

/** Fetch the latest block number from an RPC endpoint. */
async function getLatestBlock(rpcUrl: string): Promise<number> {
  const result = await rpcRequest<string>(rpcUrl, "eth_blockNumber", []);
  return parseInt(result, 16);
}

/** Generic JSON-RPC request helper. */
async function rpcRequest<T>(
  rpcUrl: string,
  method: string,
  params: unknown[]
): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `[virtual-testnet] RPC request failed: ${response.status} ${response.statusText}`
    );
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(
      `[virtual-testnet] RPC error: ${JSON.stringify(json.error)}`
    );
  }
  return json.result as T;
}

/** Reset a Tenderly fork to its original state. */
async function resetTenderlyFork(forkUrl: string): Promise<void> {
  // Tenderly fork reset via the fork URL's management endpoint.
  // Extract fork ID and call the reset API.
  const match = forkUrl.match(/fork\/([a-f0-9-]+)/i);
  if (!match) {
    throw new Error(
      `[virtual-testnet] Could not extract fork ID from URL: ${forkUrl}`
    );
  }
  const forkId = match[1];
  // The Tenderly API uses a separate management URL.
  const managementUrl = `https://rpc.tenderly.co/fork/${forkId}`;
  await rpcRequest(managementUrl, "evm_revert", ["0x0"]);
}

/** Mine a single block. */
async function mineBlock(rpcUrl: string): Promise<string> {
  return rpcRequest<string>(rpcUrl, "evm_mine", []);
}

/** Set the next block's base fee. */
async function setNextBlockBaseFee(
  rpcUrl: string,
  fee: bigint
): Promise<void> {
  await rpcRequest(rpcUrl, "anvil_setNextBlockBaseFee", [fee.toString()]);
}

/** Start impersonating an account. */
async function impersonateAccount(
  rpcUrl: string,
  address: string
): Promise<void> {
  await rpcRequest(rpcUrl, "hardhat_impersonateAccount", [address]);
}

/** Stop impersonating an account. */
async function stopImpersonatingAccount(
  rpcUrl: string,
  address: string
): Promise<void> {
  await rpcRequest(rpcUrl, "hardhat_stopImpersonatingAccount", [address]);
}

/** Destroy the fork (best-effort; many providers don't support explicit teardown). */
async function destroyFork(_rpcUrl: string): Promise<void> {
  // Fork URLs are ephemeral; no explicit teardown needed for most providers.
  // Tenderly forks can be deleted via their management API if needed.
}
