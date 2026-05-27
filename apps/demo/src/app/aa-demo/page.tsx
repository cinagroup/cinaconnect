'use client';

import { useState, useCallback } from 'react';
import DemoLayout from '@/components/DemoLayout';
import { useWallet, shortenAddress } from '@/lib/useWallet';
import { useToast } from '@/lib/toast';

/* ── types ── */

interface SessionKey {
  id: string;
  name: string;
  address: string;
  permissions: string[];
  expiry: string;
  active: boolean;
}

/* ── mock data ── */

const MOCK_SESSION_KEYS: SessionKey[] = [
  {
    id: 'sk-1',
    name: 'Trading Session',
    address: '0xaB58...f3E2',
    permissions: ['swap', 'approve'],
    expiry: '2026-06-01',
    active: true,
  },
  {
    id: 'sk-2',
    name: 'NFT Minting',
    address: '0xcD91...a7C4',
    permissions: ['mint', 'approve'],
    expiry: '2026-05-28',
    active: false,
  },
];

const MOCK_GAS_SPONSORS = [
  { name: 'App Sponsor', status: 'active', covered: '100%' },
  { name: 'Paymaster Pool', status: 'active', covered: '50%' },
  { name: 'Free Tier', status: 'limited', covered: '10 tx/day' },
];

/* ── Toggle Switch ── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-blue-500' : 'bg-gray-700'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ── main page ── */

export default function AADemoPage() {
  const { account, status, connectors, connect, disconnect } = useWallet();
  const { success, error: toastError, info } = useToast();
  const isConnected = status === 'connected';

  // Smart account state
  const [smartAccount, setSmartAccount] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  // Session keys
  const [sessionKeys, setSessionKeys] = useState<SessionKey[]>(MOCK_SESSION_KEYS);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  // Gas sponsorship
  const [gasSponsored, setGasSponsored] = useState(true);
  const [txCount, setTxCount] = useState(47);

  // Batch demo
  type BatchTxStatus = 'ready' | 'pending' | 'completed';
  interface BatchTx { to: string; action: string; amount: string; status: BatchTxStatus }
  const [batchTxs, setBatchTxs] = useState<BatchTx[]>([
    { to: '0x1234...5678', action: 'Transfer', amount: '0.1 ETH', status: 'ready' },
    { to: '0xabcd...ef01', action: 'Approve', amount: '1000 USDC', status: 'ready' },
    { to: '0x9876...5432', action: 'Swap', amount: '0.05 ETH → USDC', status: 'ready' },
  ]);
  const [batchExecuting, setBatchExecuting] = useState(false);

  const handleConnect = useCallback(() => {
    connect(connectors.find((c) => c.id === 'io.metamask')?.id ?? 'io.metamask');
  }, [connect, connectors]);

  const handleCreateSmartAccount = useCallback(async () => {
    if (!isConnected || !account.address) return;
    setCreatingAccount(true);

    // Simulate account creation
    await new Promise((r) => setTimeout(r, 2000));

    const newAddr = `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`;
    setSmartAccount(newAddr);
    setAccountCreated(true);
    setCreatingAccount(false);
    success('Smart Account Created', `0x${account.address.slice(2, 6)}...${account.address.slice(-4)} deployed`);
  }, [isConnected, account.address, success]);

  const handleCreateSessionKey = useCallback(() => {
    if (!newKeyName.trim()) {
      toastError('Validation Error', 'Please enter a name for the session key');
      return;
    }

    const newKey: SessionKey = {
      id: `sk-${Date.now()}`,
      name: newKeyName.trim(),
      address: `0x${Math.random().toString(16).slice(2, 6).toUpperCase()}...${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      permissions: ['swap'],
      expiry: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      active: true,
    };

    setSessionKeys((prev) => [newKey, ...prev]);
    setNewKeyName('');
    setShowCreateKey(false);
    success('Session Key Created', newKey.name);
  }, [newKeyName, success, toastError]);

  const handleToggleKey = useCallback((id: string) => {
    setSessionKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, active: !k.active } : k))
    );
  }, []);

  const handleRemoveKey = useCallback((id: string) => {
    setSessionKeys((prev) => prev.filter((k) => k.id !== id));
    info('Session Key Removed', 'Key has been revoked');
  }, [info]);

  const handleExecuteBatch = useCallback(async () => {
    if (!smartAccount) {
      toastError('No Smart Account', 'Create a smart account first');
      return;
    }

    setBatchExecuting(true);
    setBatchTxs((prev: BatchTx[]) => prev.map((t) => ({ ...t, status: 'pending' })));

    // Simulate batch execution
    for (let i = 0; i < batchTxs.length; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      setBatchTxs((prev) =>
        prev.map((t, j) => (j <= i ? { ...t, status: 'completed' as const } : t))
      );
    }

    setBatchExecuting(false);
    setTxCount((c) => c + batchTxs.length);
    success('Batch Executed', `${batchTxs.length} transactions completed`);
  }, [smartAccount, batchTxs, success, toastError]);

  return (
    <DemoLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Account Abstraction Demo
          </h1>
          <p className="text-gray-400 text-sm">ERC-4337 smart accounts, session keys, gas sponsorship, and batch transactions</p>
        </div>

        {/* ── Wallet connect ── */}
        <div className="flex items-center justify-between bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/50 px-5 py-4">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {account.address?.slice(2, 4).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-mono text-gray-200">{shortenAddress(account.address ?? '')}</p>
                <p className="text-xs text-gray-500">{account.chainName}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all"
            >
              Connect Wallet
            </button>
          )}
          {isConnected && (
            <button
              onClick={() => disconnect()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-700/60 text-gray-300 border border-gray-600/40 hover:text-white transition-all"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            Section 1: Smart Account Creation
           ═══════════════════════════════════════════ */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">🏦 Smart Account</h2>
              <p className="text-xs text-gray-500 mt-0.5">ERC-4337 Account Abstraction wallet</p>
            </div>
            {accountCreated && smartAccount && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Deployed
              </span>
            )}
          </div>

          <div className="p-5 space-y-4">
            {!isConnected && (
              <div className="text-center py-6 text-sm text-gray-500">
                Connect your wallet to create a smart account
              </div>
            )}

            {isConnected && !accountCreated && (
              <>
                {/* How it works */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { step: '1', title: 'Deploy', desc: 'Create smart contract wallet' },
                    { step: '2', title: 'Configure', desc: 'Set session keys & permissions' },
                    { step: '3', title: 'Use', desc: 'Gasless, batched transactions' },
                  ].map((s) => (
                    <div key={s.step} className="text-center p-3 rounded-xl bg-gray-900/40 border border-gray-800/40">
                      <div className="size-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm font-bold mx-auto mb-2">
                        {s.step}
                      </div>
                      <p className="text-sm font-semibold text-gray-200">{s.title}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCreateSmartAccount}
                  disabled={creatingAccount}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                    creatingAccount
                      ? 'bg-violet-500/60 text-white cursor-wait'
                      : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25'
                  }`}
                >
                  {creatingAccount ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Deploying Smart Account...
                    </span>
                  ) : (
                    'Create Smart Account'
                  )}
                </button>
              </>
            )}

            {accountCreated && smartAccount && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-700/40">
                  <p className="text-[10px] text-gray-500 mb-1">Smart Account Address</p>
                  <p className="font-mono text-sm text-violet-400">{smartAccount}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/40">
                    <p className="text-[10px] text-gray-500">Owner</p>
                    <p className="text-xs font-mono text-gray-300 mt-1">{shortenAddress(account.address ?? '')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/40">
                    <p className="text-[10px] text-gray-500">ERC-4337</p>
                    <p className="text-xs text-emerald-400 mt-1 font-semibold">Supported ✓</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            Section 2: Session Key Management
           ═══════════════════════════════════════════ */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">🔑 Session Keys</h2>
              <p className="text-xs text-gray-500 mt-0.5">Temporary keys with limited permissions</p>
            </div>
            <button
              onClick={() => setShowCreateKey(!showCreateKey)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 transition-all"
            >
              + New Key
            </button>
          </div>

          <div className="p-5 space-y-3">
            {/* Create key form */}
            {showCreateKey && (
              <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/40 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key name (e.g., Trading Bot)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                  <button
                    onClick={handleCreateSessionKey}
                    disabled={!newKeyName.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Create
                  </button>
                </div>
                <div className="flex gap-2">
                  {['swap', 'approve', 'mint', 'transfer'].map((p) => (
                    <span key={p} className="px-2 py-1 rounded text-[10px] font-medium bg-gray-700/50 text-gray-400 border border-gray-600/40">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key list */}
            {sessionKeys.map((key) => (
              <div
                key={key.id}
                className={`p-4 rounded-xl border transition-all ${
                  key.active
                    ? 'bg-violet-500/5 border-violet-500/30'
                    : 'bg-gray-900/30 border-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      key.active
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'bg-gray-700/50 text-gray-500'
                    }`}>
                      🔑
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-200">{key.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{key.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ToggleSwitch checked={key.active} onChange={() => handleToggleKey(key.id)} />
                    <button
                      onClick={() => handleRemoveKey(key.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {key.permissions.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {p}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-700/50 text-gray-400">
                    Expires: {key.expiry}
                  </span>
                </div>
              </div>
            ))}

            {sessionKeys.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-500">
                No session keys. Create one to enable delegated transactions.
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            Section 3: Gas Sponsorship
           ═══════════════════════════════════════════ */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">⛽ Gas Sponsorship</h2>
              <p className="text-xs text-gray-500 mt-0.5">Paymaster coverage — users don't pay gas</p>
            </div>
            <ToggleSwitch checked={gasSponsored} onChange={setGasSponsored} />
          </div>

          <div className="p-5 space-y-4">
            {gasSponsored && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">Gas Sponsorship Active</p>
                    <p className="text-xs text-gray-400 mt-0.5">All transactions will be sponsored by the paymaster</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sponsor sources */}
            <div className="grid grid-cols-3 gap-3">
              {MOCK_GAS_SPONSORS.map((s) => (
                <div key={s.name} className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/40 text-center">
                  <p className="text-xs font-semibold text-gray-200">{s.name}</p>
                  <p className={`text-[10px] font-semibold mt-1 ${
                    s.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {s.status === 'active' ? '✓ Active' : '⚠ Limited'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Covers: {s.covered}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/50 text-center">
                <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  {txCount}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Gasless TXs</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/50 text-center">
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  ~$2.40
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Gas Saved</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/50 text-center">
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                  0
                </p>
                <p className="text-[10px] text-gray-500 mt-1">User Gas Paid</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            Section 4: Batch Transaction Demo
           ═══════════════════════════════════════════ */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50">
            <h2 className="text-lg font-bold text-white">📦 Batch Transaction Demo</h2>
            <p className="text-xs text-gray-500 mt-0.5">Execute multiple transactions in a single user operation</p>
          </div>

          <div className="p-5 space-y-3">
            {/* Transaction list */}
            {batchTxs.map((tx, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border transition-all ${
                  tx.status === 'completed'
                    ? 'bg-emerald-500/5 border-emerald-500/25'
                    : tx.status === 'pending'
                    ? 'bg-amber-500/5 border-amber-500/25'
                    : 'bg-gray-900/40 border-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      tx.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : tx.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-700/50 text-gray-500'
                    }`}>
                      {tx.status === 'completed' ? '✓' : tx.status === 'pending' ? '⏳' : (i + 1)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{tx.action}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{tx.to}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-300">{tx.amount}</p>
                    <p className={`text-[10px] font-semibold ${
                      tx.status === 'completed' ? 'text-emerald-400' : tx.status === 'pending' ? 'text-amber-400' : 'text-gray-500'
                    }`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Execute button */}
            <button
              onClick={handleExecuteBatch}
              disabled={batchExecuting || !smartAccount}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                batchExecuting
                  ? 'bg-violet-500/60 text-white cursor-wait'
                  : smartAccount
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-gray-700/60 text-gray-500 cursor-not-allowed'
              }`}
            >
              {batchExecuting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Executing Batch...
                </span>
              ) : (
                `Execute ${batchTxs.length} Transactions (Single UserOp)`
              )}
            </button>

            {!smartAccount && (
              <p className="text-xs text-gray-500 text-center">Create a smart account first to execute batch transactions</p>
            )}

            {gasSponsored && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span>⛽</span>
                <span>Gas will be sponsored — you won't pay any gas fees</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Info Section ── */}
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-violet-400">What is Account Abstraction?</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            ERC-4337 enables smart contract wallets that replace EOAs. Users get features like social recovery,
            session keys, batched transactions, and gas sponsorship — all without changing the Ethereum consensus layer.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🔑', title: 'Session Keys', desc: 'Delegate specific permissions temporarily' },
              { icon: '⛽', title: 'Gas Sponsorship', desc: 'Apps pay gas on behalf of users' },
              { icon: '📦', title: 'Batch Transactions', desc: 'Multiple actions in one UserOperation' },
              { icon: '🔄', title: 'Social Recovery', desc: 'Recover accounts via guardians' },
            ].map((f) => (
              <div key={f.title} className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/40">
                <div className="text-lg mb-1">{f.icon}</div>
                <p className="text-xs font-semibold text-gray-200">{f.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Code Example ── */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700/40">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-[10px] text-gray-500 font-mono">userop-example.ts</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">TypeScript</span>
          </div>
          <pre className="p-5 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed">
{`import { createBundlerClient } from '@cinacoin/aa';

// Create smart account
const bundler = createBundlerClient({
  chain: mainnet,
  entryPoint: '0x0000...0001',
});

// Send gasless batch transaction
const userOp = await bundler.sendUserOperation({
  calls: [
    { to: '0x1234', value: parseEther('0.1') },
    { to: '0x5678', data: encodeFunctionData(...) },
  ],
  paymaster: true,  // ⛽ Gas sponsored
  sessionKey: '0xabcd',  // 🔑 Session key
});

console.log('UserOp hash:', userOp.hash);`}
          </pre>
        </div>
      </div>
    </DemoLayout>
  );
}
