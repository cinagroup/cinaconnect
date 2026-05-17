import { ExchangeInfo } from "./types";

/** Network identifier mapping for chain IDs (EVM) or null (non-EVM). */
const networkConfig = {
  eth: { id: "eth", name: "Ethereum", chainId: 1 },
  base: { id: "base", name: "Base", chainId: 8453 },
  arb: { id: "arb", name: "Arbitrum", chainId: 42161 },
  polygon: { id: "polygon", name: "Polygon", chainId: 137 },
  solana: { id: "solana", name: "Solana", chainId: null },
} as const;

function makeNetworks(ids: (keyof typeof networkConfig)[]) {
  return ids.map((id) => ({
    ...networkConfig[id],
    available: true,
  }));
}

/**
 * Pre-configured exchange integrations.
 * Each entry defines supported assets, networks, fees, and redirect URLs.
 */
export const EXCHANGES: ExchangeInfo[] = [
  {
    id: "binance",
    name: "Binance",
    logo: "https://public.bnbstatic.com/image/cms/content/body/201911/f792a5e3b286e3a5e3f3b52e1c3b8a5b.png",
    supportedAssets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        networks: makeNetworks(["eth", "base", "arb", "polygon", "solana"]),
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        networks: makeNetworks(["eth", "base", "arb", "polygon", "solana"]),
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        networks: makeNetworks(["eth"]),
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      },
      {
        symbol: "BNB",
        name: "BNB",
        networks: makeNetworks(["eth"]),
        icon: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
      },
      {
        symbol: "SOL",
        name: "Solana",
        networks: makeNetworks(["solana"]),
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
      },
    ],
    supportedNetworks: ["eth", "base", "arb", "polygon", "solana"],
    feeStructure: {
      depositFeePercent: 0,
      networkFeeNote: "Network gas fees apply.",
    },
    minAmount: 10,
    baseUrl: "https://www.binance.com/en/my/wallet/account/deposit",
    supportsDeepLink: true,
  },
  {
    id: "okx",
    name: "OKX",
    logo: "https://static.okx.com/cdn/assets/imgs/241/5B8A13B3F38C4A66.png",
    supportedAssets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        networks: makeNetworks(["eth", "base", "arb", "polygon", "solana"]),
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        networks: makeNetworks(["eth", "base", "arb", "polygon", "solana"]),
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        networks: makeNetworks(["eth"]),
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      },
      {
        symbol: "SOL",
        name: "Solana",
        networks: makeNetworks(["solana"]),
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
      },
    ],
    supportedNetworks: ["eth", "base", "arb", "polygon", "solana"],
    feeStructure: {
      depositFeePercent: 0,
      networkFeeNote: "Network gas fees apply.",
    },
    minAmount: 10,
    baseUrl: "https://www.okx.com/deposit",
    supportsDeepLink: true,
  },
  {
    id: "bybit",
    name: "Bybit",
    logo: "https://d34eo17h1p1gdy.cloudfront.net/_next/static/media/bybit-logo.d62d3b59.svg",
    supportedAssets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        networks: makeNetworks(["eth", "base", "arb", "polygon"]),
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        networks: makeNetworks(["eth", "base", "arb", "polygon"]),
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        networks: makeNetworks(["eth"]),
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      },
      {
        symbol: "SOL",
        name: "Solana",
        networks: makeNetworks(["solana"]),
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
      },
    ],
    supportedNetworks: ["eth", "base", "arb", "polygon", "solana"],
    feeStructure: {
      depositFeePercent: 0,
      networkFeeNote: "Network gas fees apply.",
    },
    minAmount: 10,
    baseUrl: "https://www.bybit.com/en/my-account/assets/deposit",
    supportsDeepLink: true,
  },
  {
    id: "kucoin",
    name: "KuCoin",
    logo: "https://static.kucoin.com/image/v1/kucoin-logo.png",
    supportedAssets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        networks: makeNetworks(["eth", "base", "arb", "polygon"]),
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        networks: makeNetworks(["eth", "base", "arb", "polygon"]),
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        networks: makeNetworks(["eth"]),
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      },
      {
        symbol: "BNB",
        name: "BNB",
        networks: makeNetworks(["eth"]),
        icon: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
      },
      {
        symbol: "SOL",
        name: "Solana",
        networks: makeNetworks(["solana"]),
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
      },
    ],
    supportedNetworks: ["eth", "base", "arb", "polygon", "solana"],
    feeStructure: {
      depositFeePercent: 0,
      networkFeeNote: "Network gas fees apply.",
    },
    minAmount: 10,
    baseUrl: "https://www.kucoin.com/account/deposit",
    supportsDeepLink: true,
  },
  {
    id: "coinbase",
    name: "Coinbase",
    logo: "https://dynamic-assets.coinbase.com/image/upload/coinbase-logo.svg",
    supportedAssets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        networks: makeNetworks(["eth", "base", "arb", "polygon", "solana"]),
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        networks: makeNetworks(["eth", "arb", "polygon"]),
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        networks: makeNetworks(["eth"]),
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      },
      {
        symbol: "SOL",
        name: "Solana",
        networks: makeNetworks(["solana"]),
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
      },
    ],
    supportedNetworks: ["eth", "base", "arb", "polygon", "solana"],
    feeStructure: {
      depositFeePercent: 0,
      withdrawalFee: "varies",
      networkFeeNote: "Network gas fees apply.",
    },
    minAmount: 2,
    baseUrl: "https://www.coinbase.com/assets/send",
    supportsDeepLink: true,
  },
];
