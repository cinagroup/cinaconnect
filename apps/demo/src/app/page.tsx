'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useWallet, shortenAddress } from '@/lib/useWallet';
import { useToast } from '@/lib/toast';
import { getConnectionHistory, addConnectionRecord, getLastConnection, type ConnectionRecord } from '@/lib/connectionHistory';
import { useWorkerHealth } from '@/lib/WorkerHealthProvider';
import { WORKER_URLS, type WorkerName } from '@/lib/workers';
import { DemoDisclaimer } from '@/components/DemoDisclaimer';
import { useInView } from '@/hooks/useInView';

/* ── chain data ── */
const CHAINS = [
  { name: 'Ethereum', symbol: 'ETH', color: '#627EEA', initial: 'Ξ' },
  { name: 'Polygon', symbol: 'POL', color: '#8247E5', initial: '⬡' },
  { name: 'Arbitrum', symbol: 'ARB', color: '#28A0F0', initial: 'A' },
  { name: 'Base', symbol: 'BASE', color: '#0052FF', initial: 'B' },
  { name: 'Optimism', symbol: 'OP', color: '#FF0420', initial: 'O' },
  { name: 'BNB Chain', symbol: 'BNB', color: '#F0B90B', initial: 'B' },
  { name: 'Avalanche', symbol: 'AVAX', color: '#E84142', initial: 'A' },
  { name: 'Solana', symbol: 'SOL', color: '#9945FF', initial: 'S' },
  { name: 'Bitcoin', symbol: 'BTC', color: '#F7931A', initial: '₿' },
  { name: 'TON', symbol: 'TON', color: '#0098EA', initial: 'T' },
  { name: 'TRON', symbol: 'TRX', color: '#FF0013', initial: 'T' },
  { name: 'Cosmos', symbol: 'ATOM', color: '#2E3148', initial: 'C' },
  { name: 'Sui', symbol: 'SUI', color: '#4DA2FF', initial: 'S' },
  { name: 'Starknet', symbol: 'STRK', color: '#EF6D39', initial: 'S' },
  { name: 'NEAR', symbol: 'NEAR', color: '#000000', initial: 'N' },
  { name: 'Hedera', symbol: 'HBAR', color: '#161E3B', initial: 'H' },
];

const CHAINS_FOR_SELECT = CHAINS.filter((c) => c.symbol !== 'BTC' && c.symbol !== 'SOL');

const FEATURES = [
  { icon: '🔗', title: 'Multi-Chain', desc: '16 chains — EVM, Solana, Bitcoin. One SDK, zero fragmentation.' },
  { icon: '🔐', title: 'SIWE Auth', desc: 'Sign-In With Ethereum for secure, wallet-native authentication.' },
  { icon: '🔄', title: 'Swap (DEX Aggregation)', desc: 'Best-rate token swaps across every chain via aggregated liquidity.' },
  { icon: '🌉', title: 'Bridge (Cross-Chain)', desc: 'Seamless cross-chain asset transfers with unified routing.' },
  { icon: '🧠', title: 'Smart Accounts (AA v5)', desc: 'ERC-4337 account abstraction, paymasters, and transaction bundles.' },
  { icon: '⛽', title: 'Gas Sponsorship', desc: 'Let your app cover gas — invisible blockchain UX for end users.' },
  { icon: '🔑', title: 'Passkey Auth', desc: 'Passwordless, biometric wallet login via WebAuthn passkeys.' },
  { icon: '📱', title: 'Multi-Platform', desc: 'Web, React Native, Unity, server — one consistent toolkit.' },
  { icon: '🏠', title: 'Self-Hosted', desc: 'Your infra, your rules. No vendor lock-in. Fully open source.' },
];

const STATS = [
  { value: '64', label: 'Packages' },
  { value: '16', label: 'Chains' },
  { value: '30+', label: 'Wallets' },
  { value: '$0', label: 'Cost' },
  { value: '100%', label: 'Open Source' },
];

/* ── particles ── */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size: 2 + (i * 7) % 5,
  left: (i * 37 + 13) % 100,
  top: (i * 53 + 7) % 100,
  duration: 6 + (i * 3) % 10,
  delay: (i * 2) % 5,
  color: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#8b5cf6' : '#6366f1',
}));

/* ── chain badge with hover glow ── */
function ChainBadge({ chain }: { chain: (typeof CHAINS)[number] }) {
  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-gray-500 transition-all duration-300 cursor-default shrink-0 hover:-translate-y-0.5"
      style={{
        transition: 'all 0.3s ease',
      }}
    >
      <span
        className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white transition-all duration-300 group-hover:shadow-lg"
        style={{
          backgroundColor: chain.color,
          boxShadow: 'none',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px 4px ${chain.color}60`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        {chain.initial}
      </span>
      <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors whitespace-nowrap">
        {chain.name}
      </span>
    </div>
  );
}

/* ── feature card with fade-in ── */
function FeatureCard({ feature, delay }: { feature: (typeof FEATURES)[number]; delay: number }) {
  const { ref, isInView } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`group relative p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-gray-600 hover:bg-gray-800/60 transition-all duration-300 hover:-translate-y-1 ${
        isInView ? 'animate-fade-in-up' : 'opacity-0'
      }`}
      style={isInView ? { animationDelay: `${delay}ms`, animationFillMode: 'both' } : undefined}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative">
        <div className="text-3xl mb-4">{feature.icon}</div>
        <h3 className="text-base font-semibold text-gray-100 group-hover:text-white transition-colors mb-2">
          {feature.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
          {feature.desc}
        </p>
      </div>
    </div>
  );
}

/* ── backend status component (terminal style) ── */
const WORKER_LABELS: Record<WorkerName, string> = {
  rpcProxy: 'RPC Proxy',
  keysServer: 'Keys Server',
  relayServer: 'Relay Server',
  notifyServer: 'Notify Server',
  pushServer: 'Push Server',
};

function BackendStatus() {
  const { health, loading, lastChecked, refresh } = useWorkerHealth();
  const healthyCount = health.filter((h) => h.healthy).length;
  const total = Object.keys(WORKER_URLS).length;

  return (
    <section className="w-full max-w-2xl px-4 py-8">
      <div className="relative bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl border border-emerald-900/40 overflow-hidden shadow-2xl shadow-emerald-900/10">
        {/* Scan line effect */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent animate-[scan-line_3s_linear_infinite]" />
        </div>

        {/* Card header */}
        <div className="relative flex items-center justify-between px-5 py-3 border-b border-emerald-900/30">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-yellow-500/80" />
              <span className="size-2.5 rounded-full bg-green-500/80" />
            </div>
            <span className="text-[11px] text-emerald-600/70 font-mono tracking-wider ml-1 uppercase">
              ⚡ Infrastructure Monitor
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastChecked && (
              <span className="text-[10px] text-gray-700 font-mono">
                {Math.round((Date.now() - lastChecked) / 1000)}s ago
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                '↻'
              )}
            </button>
          </div>
        </div>

        {/* Overall status bar */}
        <div className="relative px-5 py-2.5 border-b border-gray-800/40 flex items-center justify-between bg-gray-950/50">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                healthyCount === total
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : healthyCount > 0
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  healthyCount === total
                    ? 'bg-emerald-400'
                    : healthyCount > 0
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                }`}
                style={{
                  color: healthyCount === total ? '#34d399' : healthyCount > 0 ? '#facc15' : '#f87171',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }}
              />
              {healthyCount}/{total} Workers Online
            </span>
          </div>
          <span className="text-[10px] text-gray-700 font-mono">Cloudflare Workers Edge</span>
        </div>

        {/* Worker rows */}
        <div className="relative divide-y divide-gray-800/30">
          {(loading ? Array.from({ length: total }) : health).map((h, i) => {
            if (loading) {
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                  <div className="size-2 rounded-full bg-gray-800" />
                  <div className="flex-1 h-3 bg-gray-800 rounded" />
                  <div className="w-16 h-3 bg-gray-800 rounded" />
                </div>
              );
            }
            const result = h as NonNullable<typeof health>[number];
            return (
              <div key={result.name} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/20 transition-colors">
                <span
                  className={`size-2 rounded-full ${
                    result.healthy ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                  style={result.healthy ? {
                    color: '#34d399',
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  } : undefined}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-gray-300">
                    {WORKER_LABELS[result.name]}
                  </p>
                  <p className="text-[10px] text-gray-700 font-mono truncate">
                    {result.url}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-gray-500">
                    {result.latencyMs}ms
                  </p>
                  <p className={`text-[10px] font-mono ${result.healthy ? 'text-emerald-500' : 'text-red-400'}`}>
                    {result.healthy ? 'OK' : result.status ? `HTTP ${result.status}` : 'OFFLINE'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── scroll-to-top ── */
function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      className={`scroll-to-top ${visible ? 'visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

/* ── main page ── */
export default function HomePage() {
  const { account, status, error, connectors, connect, disconnect } = useWallet();
  const { success, error: toastError, info } = useToast();
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // For the chain selector in the demo card, use a local state
  const [selectedChain, setSelectedChain] = useState('Ethereum');
  const [connectionHistory, setConnectionHistory] = useState<ConnectionRecord[]>([]);

  // Section refs for scroll animations
  const statsSection = useInView(0.1);
  const chainsSection = useInView(0.1);
  const ctaSection = useInView(0.1);

  useEffect(() => {
    setConnectionHistory(getConnectionHistory());
  }, []);

  // Record connection in history
  const handleConnect = useCallback(async (connectorId: string) => {
    try {
      await connect(connectorId);
    } catch (e) {
      toastError('Connection Failed', e instanceof Error ? e.message : 'Unknown error');
    }
  }, [connect, toastError]);

  // Watch for connection success
  useEffect(() => {
    if (isConnected && account.address) {
      const connector = connectors.find((c) => c.id === 'io.metamask') ?? connectors[0];
      addConnectionRecord({
        address: account.address,
        chainId: account.chainId ?? 1,
        chainName: account.chainName,
        connectorId: connector?.id ?? 'unknown',
        connectorName: connector?.name ?? 'Unknown',
        connectedAt: Date.now(),
      });
      setConnectionHistory(getConnectionHistory());
      success('Wallet Connected', `${shortenAddress(account.address)} on ${account.chainName}`);
    }
  }, [isConnected, account.address]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    info('Disconnected', 'Wallet disconnected');
  }, [disconnect, info]);

  const handleQuickReconnect = useCallback(async () => {
    const last = getLastConnection();
    if (last) {
      await handleConnect(last.connectorId);
    }
  }, [handleConnect]);

  return (
    <div className="flex flex-col items-center min-h-screen relative">
      {/* ── background particles ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              top: `${p.top}%`,
              backgroundColor: p.color,
              opacity: 0.3,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          DEMO DISCLAIMER
         ═══════════════════════════════════════════ */}
      <DemoDisclaimer />

      {/* ═══════════════════════════════════════════
          HERO SECTION
         ═══════════════════════════════════════════ */}
      <section className="relative w-full max-w-4xl text-center space-y-8 pt-8 sm:pt-20 pb-12 px-4 z-10">
        {/* Ambient glow behind hero */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-purple-500/10 blur-3xl animate-hero-glow pointer-events-none"
          aria-hidden="true"
        />

        {/* Version badge + GitHub stars */}
        <div className="relative flex items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <span className="size-2 rounded-full bg-green-400 animate-pulse" />
            v0.1.0 — Open Source
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/60 border border-gray-700/50 text-gray-400 text-xs font-medium">
            ⭐ 200+ stars
          </div>
        </div>

        {/* Title with animated gradient */}
        <h1 className="relative text-6xl sm:text-7xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent animate-gradient-shift">
            CinaCoin
          </span>
        </h1>

        {/* Subtitle */}
        <p className="relative text-xl sm:text-2xl font-medium text-gray-300 max-w-2xl mx-auto">
          The open-source wallet connection toolkit
        </p>

        {/* Description */}
        <p className="relative text-base sm:text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
          Connect wallets, swap tokens, bridge chains across 16 networks.
          Fully self-hosted. Zero vendor lock-in.
        </p>

        {/* CTA Buttons */}
        <div className="relative flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => handleConnect('io.metamask')}
            disabled={isConnecting}
            className="px-8 py-4 rounded-2xl font-semibold text-base bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </span>
            ) : 'Connect Wallet'}
          </button>
          <Link
            href="/swap"
            className="px-6 py-4 rounded-2xl font-semibold text-base bg-gray-800/60 border border-gray-700/60 text-gray-300 hover:text-white hover:border-gray-500 transition-all duration-200"
          >
            Try Swap Demo →
          </Link>
          <Link
            href="/multi-chain"
            className="px-6 py-4 rounded-2xl font-semibold text-base bg-gray-800/60 border border-gray-700/60 text-gray-300 hover:text-white hover:border-gray-500 transition-all duration-200"
          >
            Multi-Chain →
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          LIVE DEMO CARD
         ═══════════════════════════════════════════ */}
      <section className="relative w-full max-w-2xl px-4 py-8 z-10">
        <div className="relative bg-gradient-to-b from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl shadow-black/40 overflow-hidden">
          {/* Gradient border glow */}
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Card header */}
          <div className="relative flex items-center justify-between px-6 py-4 border-b border-gray-700/40">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="size-3 rounded-full bg-red-500/60" />
                <span className="size-3 rounded-full bg-yellow-500/60" />
                <span className="size-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-gray-500 font-mono ml-2">CinaCoin Demo</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isConnected
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : status === 'connecting'
                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                    : 'bg-gray-700/50 text-gray-500 border border-gray-600/40'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isConnected ? 'bg-green-400 animate-pulse' : status === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
                  }`}
                />
                {isConnected ? 'Live' : isConnecting ? 'Connecting...' : 'Idle'}
              </span>
            </div>
          </div>

          {/* Card body */}
          <div className="relative p-6 sm:p-8 space-y-6">
            {/* Wallet connection options when not connected */}
            {!isConnected && !isConnecting && connectors.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Available Wallets</p>
                <div className="grid gap-2">
                  {connectors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleConnect(c.id)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 hover:border-gray-500 hover:bg-gray-700/60 transition-all text-left"
                    >
                      <span className="size-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-gray-300">
                        {c.name[0]}
                      </span>
                      <span className="text-sm font-medium text-gray-200">{c.name}</span>
                      {c.id.includes('metamask') && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Recommended
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No wallet detected */}
            {!isConnected && !isConnecting && connectors.length === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No wallet extension detected.</p>
                <p className="text-gray-500 text-xs mt-1">Install MetaMask or another EIP-1193 wallet to continue.</p>
                <button
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  className="mt-4 px-6 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-sm font-medium transition-colors"
                >
                  Get MetaMask →
                </button>
              </div>
            )}

            {/* Connected state */}
            {isConnected && account.address && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/60 border border-gray-700/40 animate-in">
                <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-500/20">
                  {account.address.slice(2, 4).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-gray-200 truncate">
                    {shortenAddress(account.address)}
                  </p>
                  <p className="text-xs text-gray-500">{account.chainName} (Chain ID: {account.chainId})</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-200">{account.balance} {account.chainSymbol}</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!isConnected ? (
                connectionHistory.length > 0 ? (
                  <div className="flex-1 flex gap-3">
                    <button
                      onClick={handleQuickReconnect}
                      disabled={isConnecting}
                      className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnecting ? (
                        <span className="inline-flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Reconnecting...
                        </span>
                      ) : '⚡ Quick Reconnect'}
                    </button>
                    <button
                      onClick={() => handleConnect('io.metamask')}
                      disabled={isConnecting || connectors.length === 0}
                      className="px-6 py-3.5 rounded-xl font-semibold text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      New
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect('io.metamask')}
                    disabled={isConnecting || connectors.length === 0}
                    className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? 'Connecting...' : '⚡ Connect Wallet'}
                  </button>
                )
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 transition-all duration-200"
                >
                  Disconnect
                </button>
              )}

              <div className="relative flex-1">
                <select
                  value={isConnected && account.chainName ? account.chainName : selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-800/80 border border-gray-700/50 rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 appearance-none cursor-pointer transition-all"
                >
                  {CHAINS_FOR_SELECT.map((c) => (
                    <option key={c.symbol} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                  ▾
                </span>
              </div>
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/50">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Status</p>
                <p className={`text-sm font-semibold ${
                  isConnected ? 'text-green-400' : isConnecting ? 'text-yellow-400' : 'text-gray-500'
                }`}>
                  {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Not Connected'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/50">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Network</p>
                <p className="text-sm font-semibold text-gray-300">
                  {isConnected ? account.chainName : selectedChain}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/50">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Balance</p>
                <p className="text-sm font-semibold text-gray-300">
                  {isConnected ? `${account.balance} ${account.chainSymbol}` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BACKEND STATUS (Cloudflare Workers)
         ═══════════════════════════════════════════ */}
      <BackendStatus />

      {/* ═══════════════════════════════════════════
          STATS BAR
         ═══════════════════════════════════════════ */}
      <section
        ref={statsSection.ref}
        className={`w-full max-w-4xl px-4 py-16 z-10 ${statsSection.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FEATURE GRID (3x3)
         ═══════════════════════════════════════════ */}
      <section className="w-full max-w-4xl px-4 py-12 z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient-shift"
              style={{ backgroundSize: '200% 200%' }}>
              connect wallets
            </span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            A complete toolkit for wallet connections, cross-chain operations, and account abstraction — all open source.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CHAIN SHOWCASE
         ═══════════════════════════════════════════ */}
      <section
        ref={chainsSection.ref}
        className={`w-full max-w-4xl px-4 py-16 z-10 ${chainsSection.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            16 Chains Supported
          </h2>
          <p className="text-sm text-gray-500">
            EVM · Solana · Bitcoin · Layer 2s — one SDK, every network
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {CHAINS.map((c) => (
            <ChainBadge key={c.symbol} chain={c} />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CONNECTION HISTORY
         ═══════════════════════════════════════════ */}
      {connectionHistory.length > 0 && (
        <section className="w-full max-w-2xl px-4 py-8 z-10">
          <div className="bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Recent Connections</h2>
              <span className="text-xs text-gray-500">{connectionHistory.length} records</span>
            </div>
            <div className="divide-y divide-gray-800/50">
              {connectionHistory.slice(0, 5).map((record, i) => {
                const ago = Date.now() - record.connectedAt;
                const timeLabel = ago < 60000 ? 'Just now' : ago < 3600000 ? `${Math.floor(ago / 60000)}m ago` : ago < 86400000 ? `${Math.floor(ago / 3600000)}h ago` : `${Math.floor(ago / 86400000)}d ago`;
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-700/20 transition-colors">
                    <div className="size-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                      {record.address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-200 truncate">{shortenAddress(record.address)}</p>
                      <p className="text-xs text-gray-500">{record.chainName} · {record.connectorName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{timeLabel}</p>
                      {!isConnected && (
                        <button
                          onClick={() => handleConnect(record.connectorId)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-0.5"
                        >
                          Reconnect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          CTA SECTION
         ═══════════════════════════════════════════ */}
      <section
        ref={ctaSection.ref}
        className={`w-full max-w-2xl px-4 py-20 text-center z-10 ${ctaSection.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}
      >
        <div className="relative p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-gray-800/60 to-gray-900/60 border border-gray-700/40 overflow-hidden">
          {/* Subtle shimmer effect */}
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Ready to get started?
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Start building with CinaCoin. Open source, self-hosted, and free forever.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/swap"
                className="px-8 py-4 rounded-2xl font-semibold text-base bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
              <button className="px-8 py-4 rounded-2xl font-semibold text-base bg-transparent border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-all duration-200">
                View Docs
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative w-full max-w-4xl px-4 py-8 border-t border-gray-800/50 z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © 2026 CinaCoin. Open source under MIT License.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/swap" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Swap
            </Link>
            <Link href="/multi-chain" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Multi-Chain
            </Link>
            <span className="text-xs text-gray-700">|</span>
            <a
              href="https://github.com/cinaseek/cinacoin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* Scroll-to-top button */}
      <ScrollToTop />
    </div>
  );
}
