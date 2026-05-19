"use client";

import { useState } from "react";

interface ChainConfig {
  id: string;
  name: string;
  chainId: number | string;
  rpcUrl: string;
  nativeCurrency: string;
  explorerUrl: string;
  enabled: boolean;
  network: "evm" | "solana" | "bitcoin" | "ton" | "tron" | "cosmos";
  mainnet: boolean;
}

const INITIAL_CHAINS: ChainConfig[] = [
  { id: "ethereum", name: "Ethereum", chainId: 1, rpcUrl: "https://eth.llamarpc.com", nativeCurrency: "ETH", explorerUrl: "https://etherscan.io", enabled: true, network: "evm", mainnet: true },
  { id: "polygon", name: "Polygon", chainId: 137, rpcUrl: "https://polygon-rpc.com", nativeCurrency: "MATIC", explorerUrl: "https://polygonscan.com", enabled: true, network: "evm", mainnet: true },
  { id: "bsc", name: "BNB Smart Chain", chainId: 56, rpcUrl: "https://bsc-dataseed.binance.org", nativeCurrency: "BNB", explorerUrl: "https://bscscan.com", enabled: true, network: "evm", mainnet: true },
  { id: "arbitrum", name: "Arbitrum One", chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc", nativeCurrency: "ETH", explorerUrl: "https://arbiscan.io", enabled: true, network: "evm", mainnet: true },
  { id: "optimism", name: "Optimism", chainId: 10, rpcUrl: "https://mainnet.optimism.io", nativeCurrency: "ETH", explorerUrl: "https://optimistic.etherscan.io", enabled: true, network: "evm", mainnet: true },
  { id: "base", name: "Base", chainId: 8453, rpcUrl: "https://mainnet.base.org", nativeCurrency: "ETH", explorerUrl: "https://basescan.org", enabled: false, network: "evm", mainnet: true },
  { id: "avalanche", name: "Avalanche C-Chain", chainId: 43114, rpcUrl: "https://api.avax.network/ext/bc/C/rpc", nativeCurrency: "AVAX", explorerUrl: "https://snowtrace.io", enabled: false, network: "evm", mainnet: true },
  { id: "solana", name: "Solana", chainId: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", rpcUrl: "https://api.mainnet-beta.solana.com", nativeCurrency: "SOL", explorerUrl: "https://explorer.solana.com", enabled: true, network: "solana", mainnet: true },
  { id: "bitcoin", name: "Bitcoin", chainId: "btc-mainnet", rpcUrl: "", nativeCurrency: "BTC", explorerUrl: "https://blockstream.info", enabled: true, network: "bitcoin", mainnet: true },
  { id: "ton", name: "TON", chainId: "-239", rpcUrl: "https://toncenter.com/api/v2", nativeCurrency: "TON", explorerUrl: "https://tonscan.org", enabled: false, network: "ton", mainnet: true },
  { id: "tron", name: "TRON", chainId: "0x2b6653dc", rpcUrl: "https://api.trongrid.io", nativeCurrency: "TRX", explorerUrl: "https://tronscan.org", enabled: false, network: "tron", mainnet: true },
  { id: "cosmos", name: "Cosmos Hub", chainId: "cosmoshub-4", rpcUrl: "https://rpc-cosmoshub.blockapsis.com", nativeCurrency: "ATOM", explorerUrl: "https://www.mintscan.io/cosmos", enabled: false, network: "cosmos", mainnet: true },
];

const NETWORK_COLORS: Record<string, string> = {
  evm: "#6366f1",
  solana: "#9945FF",
  bitcoin: "#F7931A",
  ton: "#0098EA",
  tron: "#FF0013",
  cosmos: "#6F7390",
};

const NETWORK_ICONS: Record<string, string> = {
  evm: "🔷",
  solana: "◎",
  bitcoin: "₿",
  ton: "💎",
  tron: "🔴",
  cosmos: "⚛️",
};

export default function ChainsPage() {
  const [chains, setChains] = useState<ChainConfig[]>(INITIAL_CHAINS);
  const [filter, setFilter] = useState<string>("all");
  const [editingChain, setEditingChain] = useState<ChainConfig | null>(null);
  const [saved, setSaved] = useState(false);

  const filteredChains = filter === "all" ? chains : chains.filter((c) => c.network === filter);
  const enabledCount = chains.filter((c) => c.enabled).length;

  const toggleChain = (id: string) => {
    setChains((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🌐 Networks & Chains</h1>
          <p className="text-dashboard-muted mt-1">
            Configure supported blockchain networks — {enabledCount} of {chains.length} enabled
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-dashboard-primary hover:bg-dashboard-primaryLight text-white rounded-lg font-medium transition-colors"
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      {saved && (
        <div className="bg-dashboard-success/10 border border-dashboard-success/30 rounded-xl px-4 py-3 text-sm text-dashboard-success">
          ✓ Chain configuration saved successfully
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-4">
          <p className="text-sm text-dashboard-muted">Total Networks</p>
          <p className="text-2xl font-bold text-white">{chains.length}</p>
        </div>
        <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-4">
          <p className="text-sm text-dashboard-muted">Enabled</p>
          <p className="text-2xl font-bold text-dashboard-success">{enabledCount}</p>
        </div>
        <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-4">
          <p className="text-sm text-dashboard-muted">EVM Chains</p>
          <p className="text-2xl font-bold text-dashboard-primaryLight">{chains.filter((c) => c.network === "evm").length}</p>
        </div>
        <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-4">
          <p className="text-sm text-dashboard-muted">Non-EVM</p>
          <p className="text-2xl font-bold text-dashboard-warning">{chains.filter((c) => c.network !== "evm").length}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "evm", label: "EVM" },
          { key: "solana", label: "Solana" },
          { key: "bitcoin", label: "Bitcoin" },
          { key: "ton", label: "TON" },
          { key: "tron", label: "TRON" },
          { key: "cosmos", label: "Cosmos" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-dashboard-primary text-white"
                : "bg-dashboard-surface text-dashboard-muted hover:text-white border border-dashboard-border"
            }`}
          >
            {NETWORK_ICONS[f.key] || "📋"} {f.label}
          </button>
        ))}
      </div>

      {/* Chain list */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dashboard-border">
              <th className="text-left px-4 py-3 text-dashboard-muted font-medium">Network</th>
              <th className="text-left px-4 py-3 text-dashboard-muted font-medium">Chain ID</th>
              <th className="text-left px-4 py-3 text-dashboard-muted font-medium">RPC URL</th>
              <th className="text-left px-4 py-3 text-dashboard-muted font-medium">Explorer</th>
              <th className="text-center px-4 py-3 text-dashboard-muted font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredChains.map((chain) => (
              <tr key={chain.id} className="border-b border-dashboard-border/50 hover:bg-dashboard-border/10 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{NETWORK_ICONS[chain.network]}</span>
                    <span className="text-white font-medium">{chain.name}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${NETWORK_COLORS[chain.network]}20`, color: NETWORK_COLORS[chain.network] }}
                    >
                      {chain.network}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-dashboard-bg px-2 py-1 rounded text-dashboard-muted">
                    {typeof chain.chainId === "number" ? chain.chainId.toString() : chain.chainId}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className="text-dashboard-muted font-mono text-xs truncate max-w-[200px] block">
                    {chain.rpcUrl || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a href={chain.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-dashboard-primaryLight hover:underline text-xs">
                    {chain.explorerUrl.replace("https://", "")}
                  </a>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleChain(chain.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      chain.enabled ? "bg-dashboard-success" : "bg-dashboard-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        chain.enabled ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom chain add */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Add Custom Network</h3>
        <p className="text-sm text-dashboard-muted mb-4">
          Add a custom EVM-compatible chain or non-EVM network for your AppKit configuration.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Network name (e.g. zkSync Era)"
            className="bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white placeholder-dashboard-muted/50 focus:outline-none focus:border-dashboard-primary"
          />
          <input
            type="text"
            placeholder="Chain ID (e.g. 324)"
            className="bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white placeholder-dashboard-muted/50 focus:outline-none focus:border-dashboard-primary"
          />
          <input
            type="text"
            placeholder="RPC URL"
            className="bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white placeholder-dashboard-muted/50 focus:outline-none focus:border-dashboard-primary"
          />
          <input
            type="text"
            placeholder="Native currency symbol (e.g. ETH)"
            className="bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white placeholder-dashboard-muted/50 focus:outline-none focus:border-dashboard-primary"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 bg-dashboard-primary hover:bg-dashboard-primaryLight text-white rounded-lg text-sm font-medium transition-colors">
            + Add Network
          </button>
        </div>
      </div>
    </div>
  );
}
