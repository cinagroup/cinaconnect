'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DemoLayout from '@/components/DemoLayout';
import { useWallet, shortenAddress } from '@/lib/useWallet';
import {
  CHAINS,
  getMultiChainBalances,
  getChainStatus,
  formatBalance,
  type ChainConfig,
  type ChainBalance,
  type ChainHealthStatus,
} from '@/lib/multiChain';

// ─── Network Status Indicator ─────────────────────────────────────────────────

function StatusIndicator({ healthy }: { healthy: boolean }) {
  const color = healthy
    ? 'bg-emerald-400 shadow-emerald-400/60'
    : 'bg-red-500 shadow-red-500/60';

  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 shadow-md ${color}`} />
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Chain Card ───────────────────────────────────────────────────────────────

interface ChainCardProps {
  chain: ChainConfig;
  balance: ChainBalance | null;
  health: ChainHealthStatus | null;
  isWalletConnected: boolean;
  isCurrentChain: boolean;
  onSwitchChain: () => void;
}

function ChainCard({ chain, balance, health, isWalletConnected, isCurrentChain, onSwitchChain }: ChainCardProps) {
  const isHealthy = health?.healthy ?? false;
  const latency = health?.latencyMs;

  return (
    <div className={`group bg-gray-800/40 backdrop-blur rounded-2xl border ${
      isCurrentChain ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-gray-700/60'
    } overflow-hidden hover:border-gray-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5`}>
      {/* Top gradient bar */}
      <div className={`h-1 ${
        isHealthy ? 'bg-emerald-400/70' : 'bg-red-500/70'
      } group-hover:opacity-100 transition-opacity`} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
              {chain.symbol}
            </div>
            <div>
              <h3 className="font-semibold text-white">{chain.name}</h3>
              <div className="flex items-center gap-1.5">
                <StatusIndicator healthy={isHealthy} />
                <span className="text-xs text-gray-400">
                  {isHealthy ? 'Operational' : 'Offline'}
                </span>
                {latency != null && (
                  <>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{latency}ms</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">{chain.symbol}</div>
            <div className="text-xs text-gray-600 font-mono">ID: {chain.chainId}</div>
          </div>
        </div>

        {/* Balance */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-700/40">
          <div>
            <div className="text-[11px] text-gray-500">Balance</div>
            {balance ? (
              <div className="text-sm font-mono text-white">
                {balance.status === 'loaded' ? `${balance.balance} ${chain.symbol}` : '—'}
              </div>
            ) : (
              <div className="text-sm text-gray-600">—</div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-gray-500">RPC Health</div>
            <div className="text-sm">
              {health ? (
                health.healthy ? (
                  <span className="text-emerald-400">OK</span>
                ) : (
                  <span className="text-red-400">Down</span>
                )
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Explorer Link */}
        <a
          href={`${chain.explorer}/address/${balance?.chain?.rpcUrl ? '0x0000000000000000000000000000000000000000' : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2 rounded-xl text-center text-xs font-semibold text-gray-400 border border-gray-700/40 hover:text-white hover:border-gray-500 transition-all"
        >
          View on Explorer ↗
        </a>

        {/* Connect / Switch */}
        {isWalletConnected && isCurrentChain ? (
          <div className="w-full py-2.5 rounded-xl text-center font-semibold text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ✓ Active Chain
          </div>
        ) : isWalletConnected ? (
          <button
            onClick={onSwitchChain}
            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all"
          >
            Switch to {chain.name}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Health Summary Bar ───────────────────────────────────────────────────────

function HealthSummary({ statuses, loading }: { statuses: ChainHealthStatus[]; loading: boolean }) {
  const healthy = statuses.filter((s) => s.healthy).length;
  const total = statuses.length;
  const avgLatency = statuses.filter((s) => s.latencyMs).reduce((sum, s) => sum + (s.latencyMs ?? 0), 0) / (healthy || 1);

  return (
    <div className="bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">RPC Health Status</h2>
        {loading && (
          <span className="inline-flex items-center gap-2 text-xs text-gray-400">
            <Spinner /> Checking…
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 rounded-xl bg-gray-900/50 border border-gray-700/40">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-gray-500">Total Chains</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-900/50 border border-gray-700/40">
          <div className="text-2xl font-bold text-emerald-400">{healthy}</div>
          <div className="text-xs text-gray-500">Healthy</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-900/50 border border-gray-700/40">
          <div className="text-2xl font-bold text-red-400">{total - healthy}</div>
          <div className="text-xs text-gray-500">Down</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-900/50 border border-gray-700/40">
          <div className="text-2xl font-bold text-blue-400">{Math.round(avgLatency)}ms</div>
          <div className="text-xs text-gray-500">Avg Latency</div>
        </div>
      </div>

      {/* Chain-by-chain health */}
      <div className="space-y-2">
        {statuses.map((s) => (
          <div key={s.chain.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-900/30 border border-gray-700/30">
            <div className="flex items-center gap-3">
              <StatusIndicator healthy={s.healthy} />
              <span className="text-sm text-white">{s.chain.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-500">{s.chain.rpcUrl.split('/')[2]}</span>
              {s.latencyMs != null && (
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                  s.latencyMs < 500 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {s.latencyMs}ms
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                s.healthy
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {s.healthy ? 'OK' : 'DOWN'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Balance Summary ──────────────────────────────────────────────────────────

function BalanceSummary({ balances }: { balances: ChainBalance[] }) {
  const loaded = balances.filter((b) => b.status === 'loaded');
  const hasBalance = loaded.filter((b) => parseFloat(b.balance) > 0);

  if (loaded.length === 0) return null;

  return (
    <div className="bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Multi-Chain Balances</h2>

      {hasBalance.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-500">
          No balances found on any chain. Connect a wallet with funded addresses.
        </div>
      ) : (
        <div className="space-y-2">
          {hasBalance.map((b) => (
            <div key={b.chain.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-700/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                  {b.chain.symbol}
                </div>
                <div>
                  <div className="text-sm text-white font-semibold">{b.chain.name}</div>
                  <div className="text-xs text-gray-500">Chain ID: {b.chain.chainId}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-emerald-400 font-bold">{b.balance}</div>
                <div className="text-xs text-gray-500">{b.chain.symbol}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-center">
        <span className="text-xs text-gray-500">
          Loaded {loaded.length}/{balances.length} chains
        </span>
      </div>
    </div>
  );
}

// ─── Cross-Chain Flow Diagram ─────────────────────────────────────────────────

function CrossChainFlow() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Initiate', detail: 'User selects chain A', icon: '🔗' },
    { label: 'Lock', detail: 'Assets locked on source', icon: '🔒' },
    { label: 'Relay', detail: 'CinaCoin Relay', icon: '⚡' },
    { label: 'Mint/Release', detail: 'Assets on chain B', icon: '🔓' },
    { label: 'Complete', detail: 'Cross-chain transfer', icon: '✅' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 p-8 overflow-hidden">
      <h2 className="text-xl font-semibold text-white mb-2">Cross-Chain Flow</h2>
      <p className="text-sm text-gray-400 mb-8">Atomic cross-chain transfers powered by CinaCoin Relay protocol</p>

      <div className="relative">
        <div className="absolute top-10 left-10 right-10 h-0.5 bg-gray-700">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="relative flex justify-between">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center gap-3 z-10 w-32">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 ${
                  i <= activeStep
                    ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border-2 border-blue-400/50 shadow-lg shadow-blue-500/10 scale-105'
                    : 'bg-gray-800 border border-gray-700/60 opacity-50'
                }`}
              >
                {step.icon}
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${i <= activeStep ? 'text-white' : 'text-gray-500'}`}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{step.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Unified API Code Example ─────────────────────────────────────────────────

function UnifiedApiExample() {
  const [copied, setCopied] = useState(false);

  const code = `// CinaCoin — Unified Multi-Chain API
// One interface. Every chain. Zero complexity.

import { CinaCoin } from '@cinacoin/sdk';

const client = new CinaCoin();

// 🔗 Connect to ANY chain with the same API
const eth = await client.connect('ethereum', 'MetaMask');
const sol = await client.connect('solana', 'Phantom');
const btc = await client.connect('bitcoin', 'Xverse');
const ton = await client.connect('ton', 'Tonkeeper');

// 💰 Read balances across chains
const balances = await Promise.all([
  client.getBalance('ethereum', eth.address),
  client.getBalance('solana', sol.address),
  client.getBalance('bitcoin', btc.address),
  client.getBalance('ton', ton.address),
]);

// ⚡ Cross-chain transfer
const tx = await client.transfer({
  from: { chain: 'ethereum', address: eth.address },
  to:   { chain: 'solana',   address: sol.address },
  amount: '0.5 ETH',
  slippage: 0.5,
});

// 📡 Listen to events on all chains
client.on('transaction', (event) => {
  console.log(\`[\${event.chain}] \${event.type}: \${event.hash}\`);
});`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/40">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-sm text-gray-400 font-mono">unified-api.ts</span>
        </div>
        <button
          onClick={handleCopy}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gray-700/60 text-gray-400 border border-gray-600/40 hover:text-white hover:border-gray-500'
          }`}
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>

      <pre className="p-6 text-sm leading-relaxed overflow-x-auto">
        <code className="text-gray-300 font-mono whitespace-pre">
          {code.split('\n').map((line, i) => {
            let color = 'text-gray-300';
            if (line.trim().startsWith('//')) color = 'text-gray-500 italic';
            else if (line.includes('import') || line.includes('from')) color = 'text-purple-400';
            else if (line.includes('const') || line.includes('let')) color = 'text-sky-400';
            else if (line.includes('await')) color = 'text-amber-400';
            else if (line.includes('console')) color = 'text-green-400';
            else if (line.includes('new ')) color = 'text-emerald-400';

            return (
              <div key={i} className={`${color} ${i === 0 ? 'mt-0' : ''}`}>
                <span className="select-none text-gray-600 w-8 inline-block text-right mr-4">
                  {i + 1}
                </span>
                {line}
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

/** EVM chain configs with chainId for wallet_switchEthereumChain */
const EVM_CHAINS: Record<string, { chainId: number; isTestnet: boolean }> = {
  ethereum: { chainId: 1, isTestnet: false },
  polygon: { chainId: 137, isTestnet: false },
  arbitrum: { chainId: 42161, isTestnet: false },
  base: { chainId: 8453, isTestnet: false },
  bsc: { chainId: 56, isTestnet: false },
  optimism: { chainId: 10, isTestnet: false },
};

export default function MultiChainPage() {
  const { account, status, error, connectors, connect, disconnect } = useWallet();

  const isConnected = status === 'connected';
  const primaryConnector = connectors.find((c) => c.id === 'io.metamask') ?? connectors[0];

  // Real multi-chain data
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [healthStatuses, setHealthStatuses] = useState<ChainHealthStatus[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Switch wallet to a specific EVM chain via wallet_switchEthereumChain */
  const handleSwitchChain = useCallback(async (chainId: number) => {
    if (typeof window === 'undefined' || !window.ethereum?.request) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch {
      // Chain not added to wallet — try wallet_addEthereumChain
      const chainDetails: Record<number, { chainName: string; nativeCurrency: { name: string; symbol: string; decimals: number }; rpcUrls: string[]; blockExplorerUrls: string[] }> = {
        1: { chainName: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://eth.llamarpc.com'], blockExplorerUrls: ['https://etherscan.io'] },
        137: { chainName: 'Polygon', nativeCurrency: { name: 'Polygon', symbol: 'POL', decimals: 18 }, rpcUrls: ['https://polygon-rpc.com'], blockExplorerUrls: ['https://polygonscan.com'] },
        42161: { chainName: 'Arbitrum One', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://arb1.arbitrum.io/rpc'], blockExplorerUrls: ['https://arbiscan.io'] },
        8453: { chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] },
        56: { chainName: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://bsc-dataseed.binance.org'], blockExplorerUrls: ['https://bscscan.com'] },
        10: { chainName: 'Optimism', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://optimism.llamarpc.com'], blockExplorerUrls: ['https://optimistic.etherscan.io'] },
      };
      const details = chainDetails[chainId];
      if (details) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}`, ...details }],
        });
      }
    }
  }, []);

  /** Fetch real balances from public RPCs */
  const fetchBalances = useCallback(async (addr: string) => {
    setLoadingBalances(true);
    try {
      const result = await getMultiChainBalances(addr);
      setBalances(result);
    } catch {
      // errors captured per-chain in the result
    } finally {
      setLoadingBalances(false);
    }
  }, []);

  /** Fetch RPC health for all chains */
  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const result = await getChainStatus();
      setHealthStatuses(result);
    } catch {
      // keep existing statuses
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  // Initial fetch: health always, balances if connected
  useEffect(() => {
    fetchHealth();
    if (isConnected && account.address) {
      fetchBalances(account.address);
    } else {
      setBalances([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account.address]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      fetchHealth();
      if (isConnected && account.address) {
        fetchBalances(account.address);
      }
      setRefreshTimer((t) => t + 1);
    }, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected, account.address, fetchHealth, fetchBalances]);

  // Refresh timer countdown display
  const [countdown, setCountdown] = useState(30);
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) return 30;
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const manualRefresh = useCallback(() => {
    fetchHealth();
    if (isConnected && account.address) {
      fetchBalances(account.address);
    }
    setCountdown(30);
  }, [isConnected, account.address, fetchHealth, fetchBalances]);

  /** Get balance for a specific chain */
  const getBalanceForChain = useCallback((chainId: number): ChainBalance | null => {
    return balances.find((b) => b.chain.chainId === chainId) ?? null;
  }, [balances]);

  /** Get health for a specific chain */
  const getHealthForChain = useCallback((chainId: number): ChainHealthStatus | null => {
    return healthStatuses.find((h) => h.chain.chainId === chainId) ?? null;
  }, [healthStatuses]);

  return (
    <DemoLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4 py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            {isConnected
              ? `${account.chainName} · ${shortenAddress(account.address ?? '')}`
              : `${CHAINS.length} EVM chains · Real RPC balances`}
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Multi-Chain Connectivity
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Real-time balances and RPC health across {CHAINS.length} EVM chains — powered by public RPC endpoints.
          </p>
        </div>

        {/* Wallet Connection Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {isConnected ? (
            <>
              <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700/60 rounded-2xl px-6 py-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Address</div>
                  <div className="text-sm font-mono text-white">{shortenAddress(account.address ?? '')}</div>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-center">
                  <div className="text-xs text-gray-500">Balance</div>
                  <div className="text-sm font-semibold text-white">{account.balance} {account.chainSymbol}</div>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-center">
                  <div className="text-xs text-gray-500">Network</div>
                  <div className="text-sm text-white">{account.chainName}</div>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="ml-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                >
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => connect(primaryConnector?.id ?? 'io.metamask')}
              className="px-6 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/25"
            >
              Connect Wallet
            </button>
          )}
        </div>
        {error && (
          <div className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="flex items-center justify-between bg-gray-800/30 rounded-xl border border-gray-700/40 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Auto-refresh:</span>
            <span className="text-xs font-mono text-blue-400">{countdown}s</span>
          </div>
          <div className="flex items-center gap-3">
            {loadingBalances && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                <Spinner /> Fetching balances…
              </span>
            )}
            <button
              onClick={manualRefresh}
              disabled={loadingBalances || loadingHealth}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-700/60 text-gray-300 border border-gray-600/40 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50"
            >
              ↻ Refresh Now
            </button>
          </div>
        </div>

        {/* Balance Summary (when connected) */}
        {isConnected && balances.length > 0 && (
          <BalanceSummary balances={balances} />
        )}

        {/* RPC Health Status */}
        {healthStatuses.length > 0 && (
          <HealthSummary statuses={healthStatuses} loading={loadingHealth} />
        )}

        {/* Chain Cards Grid */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Chain Balances</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CHAINS.map((chain) => {
              const isEvm = !!EVM_CHAINS[chain.id];
              const isCurrentChain = isConnected && EVM_CHAINS[chain.id]?.chainId === account.chainId;
              const balance = getBalanceForChain(chain.chainId);
              const health = getHealthForChain(chain.chainId);

              return (
                <ChainCard
                  key={chain.id}
                  chain={chain}
                  balance={balance}
                  health={health}
                  isWalletConnected={isConnected}
                  isCurrentChain={isCurrentChain}
                  onSwitchChain={() => handleSwitchChain(chain.chainId)}
                />
              );
            })}
          </div>
        </div>

        {/* Cross-Chain Flow */}
        <CrossChainFlow />

        {/* Unified API Example */}
        <UnifiedApiExample />

        {/* Footer hint */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">
            Powered by{' '}
            <span className="text-gray-400 font-semibold">CinaCoin SDK</span>
            {' '}— one interface, every chain.
          </p>
        </div>
      </div>
    </DemoLayout>
  );
}
