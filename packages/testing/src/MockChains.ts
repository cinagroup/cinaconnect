/**
 * MockChains — Pre-built mock chain configurations for testing.
 *
 * Provides realistic chain data (mainnet, testnets, L2s) and a utility
 * to generate arbitrary chain configs.
 */

export interface ChainConfig {
  id: number;
  idHex: string;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrl?: string;
}

// ── Pre-defined chains ──────────────────────────────────────────────────────

export const MOCK_CHAINS: Record<string, ChainConfig> = {
  mainnet: {
    id: 1,
    idHex: "0x1",
    name: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth-mainnet.g.alchemy.com/v2/demo"],
    blockExplorerUrls: ["https://etherscan.io"],
    iconUrl: "https://example.com/icons/eth.svg",
  },
  goerli: {
    id: 5,
    idHex: "0x5",
    name: "Goerli Testnet",
    nativeCurrency: { name: "Goerli Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth-goerli.g.alchemy.com/v2/demo"],
    blockExplorerUrls: ["https://goerli.etherscan.io"],
  },
  sepolia: {
    id: 11155111,
    idHex: "0xaa36a7",
    name: "Sepolia Testnet",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/demo"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
  polygon: {
    id: 137,
    idHex: "0x89",
    name: "Polygon",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  optimism: {
    id: 10,
    idHex: "0xa",
    name: "Optimism",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
  },
  arbitrum: {
    id: 42161,
    idHex: "0xa4b1",
    name: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  base: {
    id: 8453,
    idHex: "0x2105",
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
  },
  localhost: {
    id: 1337,
    idHex: "0x539",
    name: "Localhost",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["http://127.0.0.1:8545"],
  },
  hardhat: {
    id: 31337,
    idHex: "0x7a69",
    name: "Hardhat",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["http://127.0.0.1:8545"],
  },
};

// ── Utilities ───────────────────────────────────────────────────────────────

/** Get chain by id (number or hex string) */
export function getChainById(id: number | string): ChainConfig | undefined {
  const numId = typeof id === "string" ? parseInt(id, 16) : id;
  return Object.values(MOCK_CHAINS).find((c) => c.id === numId);
}

/** Get chain by key name */
export function getChainByKey(key: string): ChainConfig | undefined {
  return MOCK_CHAINS[key];
}

/** Generate a custom chain config */
export function createMockChain(overrides: Partial<ChainConfig> & { id: number; name: string }): ChainConfig {
  const hex = "0x" + overrides.id.toString(16);
  return {
    id: overrides.id,
    idHex: overrides.idHex ?? hex,
    name: overrides.name,
    nativeCurrency: overrides.nativeCurrency ?? {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: overrides.rpcUrls ?? ["https://example.com/rpc"],
    blockExplorerUrls: overrides.blockExplorerUrls,
    iconUrl: overrides.iconUrl,
  };
}

/** Return all chain configs as an array */
export function allMockChains(): ChainConfig[] {
  return Object.values(MOCK_CHAINS);
}
