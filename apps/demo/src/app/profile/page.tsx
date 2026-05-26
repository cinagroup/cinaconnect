'use client';

import { useState, useEffect, useCallback } from 'react';
import DemoLayout from '@/components/DemoLayout';
import { useWallet, shortenAddress } from '@/lib/useWallet';
import { getMultiChainBalances, CHAINS, type ChainBalance } from '@/lib/multiChain';

/* ── mock ENS data ── */

const ENS_CACHE: Record<string, string> = {
  // demo: real-looking ens names for common addresses
};

function resolveENS(address: string | null): string | null {
  if (!address) return null;
  return ENS_CACHE[address] ?? null;
}

/* ── mock avatar ── */

function AvatarDisplay({ address, size = 'lg' }: { address: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-20 h-20 text-xl', xl: 'w-32 h-32 text-3xl' };

  if (!address) {
    return (
      <div className={`${sizes[size]} rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-gray-600`}>
        <svg className="w-1/2 h-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    );
  }

  // Generate a deterministic gradient from address
  const hue1 = parseInt(address.slice(2, 6), 16) % 360;
  const hue2 = (hue1 + 120) % 360;
  const initials = address.slice(2, 4).toUpperCase();

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shadow-lg`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 50%))`,
        boxShadow: `0 4px 20px hsla(${hue1}, 70%, 50%, 0.3)`,
      }}
    >
      {size === 'sm' ? initials[0] : initials}
    </div>
  );
}

/* ── portfolio summary ── */

function PortfolioSummary({ balances }: { balances: ChainBalance[] }) {
  const loaded = balances.filter((b) => b.status === 'loaded');
  const withBalance = loaded.filter((b) => parseFloat(b.balance) > 0);

  // Mock USD values per chain
  const usdRates: Record<string, number> = {
    ETH: 3800, POL: 0.58, ARB: 0.85, OP: 1.80, BNB: 620,
    AVAX: 38, SOL: 175, BTC: 98000, ATOM: 7.5, NEAR: 5.2,
    SUI: 2.8, STRK: 0.45, HBAR: 0.08, TRX: 0.12, TON: 5.5,
  };

  let totalUsd = 0;
  const perChain: { chain: string; symbol: string; balance: string; usd: number }[] = [];

  withBalance.forEach((b) => {
    const rate = usdRates[b.chain.symbol] ?? 0;
    const balanceNum = parseFloat(b.balance);
    const usd = balanceNum * rate;
    totalUsd += usd;
    perChain.push({ chain: b.chain.name, symbol: b.chain.symbol, balance: b.balance, usd });
  });

  perChain.sort((a, b) => b.usd - a.usd);

  return (
    <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">💰 Portfolio Summary</h2>
        <span className="text-xs text-gray-500">{withBalance.length} chains with balance</span>
      </div>

      <div className="p-5">
        {/* Total */}
        <div className="text-center mb-6 p-4 rounded-xl bg-gradient-to-b from-gray-900/60 to-gray-800/40 border border-gray-700/30">
          <p className="text-xs text-gray-500 mb-1">Total Estimated Value</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-600 mt-1">Across {withBalance.length} chains</p>
        </div>

        {/* Per-chain breakdown */}
        {perChain.length > 0 ? (
          <div className="space-y-2">
            {perChain.map((item) => {
              const pct = totalUsd > 0 ? (item.usd / totalUsd) * 100 : 0;
              return (
                <div key={item.chain} className="p-3 rounded-xl bg-gray-900/40 border border-gray-700/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-200">{item.chain}</span>
                    <span className="text-sm font-semibold text-gray-300">
                      ${item.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{item.balance} {item.symbol}</span>
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            No balances detected. Connect your wallet to see portfolio across chains.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── wallet card ── */

function WalletCard({
  address,
  label,
  isPrimary,
  balances,
  onSwitch,
}: {
  address: string;
  label: string;
  isPrimary: boolean;
  balances: ChainBalance[];
  onSwitch: () => void;
}) {
  const totalBalance = balances
    .filter((b) => b.status === 'loaded')
    .reduce((sum, b) => sum + parseFloat(b.balance), 0);

  return (
    <div className={`p-5 rounded-xl border transition-all ${
      isPrimary
        ? 'bg-blue-500/10 border-blue-500/30'
        : 'bg-gray-900/40 border-gray-700/40 hover:border-gray-600'
    }`}>
      <div className="flex items-center gap-4">
        <AvatarDisplay address={address} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono text-sm text-gray-200 truncate">{shortenAddress(address)}</p>
            {isPrimary && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                Primary
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{label} · {balances.length} chains</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-gray-200">{totalBalance.toFixed(4)}</p>
          <button
            onClick={onSwitch}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            Switch →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ── */

export default function ProfilePage() {
  const { account, status, connectors, connect, disconnect } = useWallet();
  const isConnected = status === 'connected';

  const [ensName, setEnsName] = useState<string | null>(null);
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock multi-wallet display
  const [wallets] = useState<Array<{ address: string; label: string }>>(() => {
    const w = [{ address: '0x0000000000000000000000000000000000000000', label: 'MetaMask' }];
    // Add mock wallets for demo purposes
    w.push({ address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'WalletConnect' });
    w.push({ address: '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326', label: 'Coinbase Wallet' });
    return w;
  });

  const handleConnect = useCallback(() => {
    connect(connectors.find((c) => c.id === 'io.metamask')?.id ?? 'io.metamask');
  }, [connect, connectors]);

  // Fetch ENS
  useEffect(() => {
    if (!account.address) { setEnsName(null); return; }
    const ens = resolveENS(account.address);
    if (ens) { setEnsName(ens); return; }

    // Try real ENS resolution via public RPC
    const fetchENS = async () => {
      try {
        const provider = (window as unknown as Record<string, unknown>).ethereum;
        if (!provider || typeof (provider as Record<string, unknown>).request !== 'function') return;
        // ENS reverse resolution would need eth_call with ABI-encoded data
        // For demo, we'll skip real ENS and show the mock cache
        // In production, use an ENS library
      } catch { /* ignore */ }
    };
    fetchENS();
  }, [account.address]);

  // Fetch multi-chain balances
  const fetchBalances = useCallback(async (addr: string) => {
    if (!addr) return;
    setLoading(true);
    try {
      const result = await getMultiChainBalances(addr);
      setBalances(result);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && account.address) {
      fetchBalances(account.address);
    } else {
      setBalances([]);
    }
  }, [isConnected, account.address, fetchBalances]);

  return (
    <DemoLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-gray-400 text-sm">Your identity, wallets, and portfolio</p>
        </div>

        {/* ── Wallet connect ── */}
        {!isConnected && (
          <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-700/40">
            <AvatarDisplay address={null} size="xl" />
            <p className="text-gray-400 mt-4 text-sm">Connect your wallet to view your profile</p>
            <button
              onClick={handleConnect}
              className="mt-4 px-6 py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {isConnected && (
          <>
            {/* ── Profile Card ── */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              {/* Banner */}
              <div className="h-24 bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-red-600/30 relative">
                <div className="absolute -bottom-10 left-6">
                  <AvatarDisplay address={account.address} size="xl" />
                </div>
              </div>

              <div className="pt-14 px-6 pb-6">
                {/* Name / ENS */}
                <div className="flex items-start justify-between">
                  <div>
                    {ensName ? (
                      <h2 className="text-xl font-bold text-white">{ensName}</h2>
                    ) : (
                      <h2 className="text-xl font-bold text-white">
                        {shortenAddress(account.address ?? '')}
                      </h2>
                    )}
                    <p className="text-xs text-gray-500 font-mono mt-1">{account.address}</p>
                    {ensName && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{account.address}</p>
                    )}
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
                    <p className="text-xs text-gray-500">Network</p>
                    <p className="text-sm font-semibold text-gray-200">{account.chainName}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-sm font-semibold text-gray-200">{account.balance} {account.chainSymbol}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
                    <p className="text-xs text-gray-500">Chain ID</p>
                    <p className="text-sm font-semibold text-gray-200">{account.chainId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Multi-Wallet Display ── */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">👛 Connected Wallets</h2>
                <p className="text-xs text-gray-500 mt-1">All wallets linked to this profile</p>
              </div>
              <div className="p-5 space-y-3">
                {wallets.map((w, i) => (
                  <WalletCard
                    key={i}
                    address={w.address}
                    label={w.label}
                    isPrimary={i === 0}
                    balances={w.address === account.address ? balances : []}
                    onSwitch={() => {
                      // In a real app, this would switch the active wallet
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ── Portfolio Summary ── */}
            <PortfolioSummary balances={balances} />

            {/* ── Loading indicator ── */}
            {loading && (
              <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading balances…
              </div>
            )}
          </>
        )}
      </div>
    </DemoLayout>
  );
}
