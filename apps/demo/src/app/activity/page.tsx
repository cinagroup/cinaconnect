'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DemoLayout from '@/components/DemoLayout';
import { useWallet, shortenAddress } from '@/lib/useWallet';
import { getConnectionHistory, type ConnectionRecord } from '@/lib/connectionHistory';
import { getSwapHistory, type SwapHistoryEntry } from '@/lib/swap';

/* ── types ── */

type ActivityType = 'connection' | 'swap' | 'chain_switch' | 'auth';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  chain?: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: number;
  hash?: string;
  metadata?: Record<string, string>;
}

const CHAINS = [
  'All', 'Ethereum', 'Polygon', 'Arbitrum', 'Base', 'Optimism',
  'BNB Chain', 'Solana', 'Avalanche', 'TON', 'Cosmos',
];

const TYPE_FILTERS: { value: ActivityType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'connection', label: 'Connections', icon: '🔗' },
  { value: 'swap', label: 'Swaps', icon: '🔄' },
  { value: 'chain_switch', label: 'Chain Switches', icon: '🌐' },
  { value: 'auth', label: 'Auth', icon: '🔐' },
];

const PAGE_SIZE = 10;

/* ── helpers ── */

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

function typeIcon(type: ActivityType): string {
  switch (type) {
    case 'connection': return '🔗';
    case 'swap': return '🔄';
    case 'chain_switch': return '🌐';
    case 'auth': return '🔐';
  }
}

function statusColor(status: ActivityItem['status']): string {
  switch (status) {
    case 'completed': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
    case 'pending': return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
    case 'failed': return 'bg-red-500/15 text-red-400 border-red-500/25';
  }
}

/* ── mock data generator ── */

function generateMockActivities(
  connections: ConnectionRecord[],
  swaps: SwapHistoryEntry[],
  walletAddress: string | null,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Connection history
  connections.forEach((c, i) => {
    items.push({
      id: `conn-${i}`,
      type: 'connection',
      title: 'Wallet Connected',
      description: `${shortenAddress(c.address)} via ${c.connectorName}`,
      chain: c.chainName,
      status: 'completed',
      timestamp: c.connectedAt,
      metadata: { connector: c.connectorName, chainId: String(c.chainId) },
    });
  });

  // Swap history
  swaps.forEach((s, i) => {
    items.push({
      id: `swap-${i}`,
      type: 'swap',
      title: `Swap ${s.from} → ${s.to}`,
      description: `${s.fromAmount} ${s.from} → ${s.toAmount} ${s.to}`,
      chain: s.chainId ? `Chain ${s.chainId}` : undefined,
      status: s.status === 'completed' ? 'completed' : s.status === 'pending' ? 'pending' : 'failed',
      timestamp: new Date(s.timestamp).getTime(),
      hash: s.txHash,
      metadata: { rate: s.rate, route: s.route },
    });
  });

  // Mock auth activities
  if (walletAddress) {
    items.push({
      id: 'auth-1',
      type: 'auth',
      title: 'SIWE Authentication',
      description: `Wallet ownership verified for ${shortenAddress(walletAddress)}`,
      status: 'completed',
      timestamp: Date.now() - 86400000 * 2,
      metadata: { method: 'SIWE', standard: 'EIP-4361' },
    });
    items.push({
      id: 'auth-2',
      type: 'auth',
      title: 'Passkey Registered',
      description: 'New biometric credential added',
      status: 'completed',
      timestamp: Date.now() - 86400000 * 5,
      metadata: { method: 'WebAuthn' },
    });
  }

  // Mock chain switch activities
  const chainSwitches = [
    { chain: 'Ethereum', ts: Date.now() - 3600000 },
    { chain: 'Polygon', ts: Date.now() - 7200000 },
    { chain: 'Arbitrum', ts: Date.now() - 14400000 },
  ];
  chainSwitches.forEach((cs, i) => {
    items.push({
      id: `switch-${i}`,
      type: 'chain_switch',
      title: `Switched to ${cs.chain}`,
      description: `Network changed to ${cs.chain}`,
      chain: cs.chain,
      status: 'completed',
      timestamp: cs.ts,
    });
  });

  // Sort by timestamp descending
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items;
}

/* ── main page ── */

export default function ActivityPage() {
  const { account, status, connectors, connect } = useWallet();
  const isConnected = status === 'connected';

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [chainFilter, setChainFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load activities
  useEffect(() => {
    const conns = getConnectionHistory();
    const swps = getSwapHistory();
    const all = generateMockActivities(conns, swps, account.address);
    setActivities(all);
  }, [account.address]);

  // Filtered + paginated
  const filtered = useMemo(() => {
    let result = activities;
    if (typeFilter !== 'all') {
      result = result.filter((a) => a.type === typeFilter);
    }
    if (chainFilter !== 'All') {
      result = result.filter((a) => a.chain === chainFilter);
    }
    return result;
  }, [activities, typeFilter, chainFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Stats
  const stats = useMemo(() => ({
    total: activities.length,
    completed: activities.filter((a) => a.status === 'completed').length,
    pending: activities.filter((a) => a.status === 'pending').length,
    failed: activities.filter((a) => a.status === 'failed').length,
  }), [activities]);

  const handleConnect = useCallback(() => {
    connect(connectors.find((c) => c.id === 'io.metamask')?.id ?? 'io.metamask');
  }, [connect, connectors]);

  return (
    <DemoLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Activity History
          </h1>
          <p className="text-gray-400 text-sm">Track all your wallet interactions and transactions</p>
        </div>

        {/* ── Wallet connect bar ── */}
        <div className="flex items-center justify-between bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/50 px-5 py-4">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {account.address?.slice(2, 4).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-mono text-gray-200">{shortenAddress(account.address ?? '')}</p>
                <p className="text-xs text-gray-500">{account.chainName} · Balance: {account.balance} {account.chainSymbol}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
            >
              Connect Wallet
            </button>
          )}
          <span className="text-xs text-gray-500">{activities.length} activities</span>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
            { label: 'Failed', value: stats.failed, color: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="text-center p-4 rounded-xl bg-gray-800/40 border border-gray-700/40">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="space-y-3">
          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setTypeFilter(f.value); setPage(0); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  typeFilter === f.value
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:text-white hover:border-gray-600'
                }`}
              >
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Chain filter */}
          <div className="relative">
            <select
              value={chainFilter}
              onChange={(e) => { setChainFilter(e.target.value); setPage(0); }}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
            >
              {CHAINS.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Chains' : c}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
          </div>
        </div>

        {/* ── Activity List ── */}
        {paginated.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/40">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-gray-400 text-sm">No activities found</p>
            <p className="text-gray-500 text-xs mt-1">Connect your wallet and start interacting to see activity here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginated.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="w-full text-left p-4 rounded-xl bg-gray-800/40 border border-gray-700/40 hover:border-gray-600/60 hover:bg-gray-800/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeIcon(item.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.chain && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-400">
                          {item.chain}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="text-[10px] text-gray-600">{timeAgo(item.timestamp)}</span>
                      <svg className={`w-4 h-4 text-gray-600 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedId === item.id && (
                  <div className="mt-1 p-4 rounded-xl bg-gray-900/60 border border-gray-700/30 space-y-2 ml-8">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="text-gray-300 ml-2 capitalize">{item.type.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 font-semibold ${
                          item.status === 'completed' ? 'text-emerald-400' : item.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                        }`}>{item.status}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time:</span>
                        <span className="text-gray-300 ml-2">{formatDate(item.timestamp)}</span>
                      </div>
                      {item.chain && (
                        <div>
                          <span className="text-gray-500">Chain:</span>
                          <span className="text-gray-300 ml-2">{item.chain}</span>
                        </div>
                      )}
                    </div>
                    {item.hash && (
                      <div className="pt-2 border-t border-gray-800/50">
                        <span className="text-[10px] text-gray-500">Transaction Hash:</span>
                        <p className="font-mono text-xs text-blue-400 break-all mt-1">{item.hash}</p>
                      </div>
                    )}
                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                      <div className="pt-2 border-t border-gray-800/50">
                        <span className="text-[10px] text-gray-500">Details:</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(item.metadata).map(([k, v]) => (
                            <div key={k} className="flex text-xs">
                              <span className="text-gray-500 w-24 shrink-0">{k}:</span>
                              <span className="text-gray-300 font-mono">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-gray-800/30 rounded-xl border border-gray-700/40 px-5 py-3">
            <span className="text-xs text-gray-500">
              Page {page + 1} of {totalPages} · {filtered.length} items
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700/50 text-gray-400 border border-gray-600/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700/50 text-gray-400 border border-gray-600/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </DemoLayout>
  );
}
