import { useState } from 'react';

const CHAINS = [
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', color: '#627EEA', icon: 'Ξ', wallets: ['MetaMask', 'WalletConnect', 'Coinbase'], txs: '1.2M', tvl: '$45B' },
  { id: 'arb', name: 'Arbitrum', symbol: 'ARB', color: '#28A0F0', icon: 'λ', wallets: ['MetaMask', 'Rabby'], txs: '3.8M', tvl: '$12B' },
  { id: 'base', name: 'Base', symbol: 'BASE', color: '#0052FF', icon: 'B', wallets: ['Coinbase', 'MetaMask'], txs: '5.1M', tvl: '$8B' },
  { id: 'polygon', name: 'Polygon', symbol: 'POL', color: '#8247E5', icon: '⬡', wallets: ['MetaMask', 'WalletConnect'], txs: '4.2M', tvl: '$5B' },
  { id: 'op', name: 'Optimism', symbol: 'OP', color: '#FF0420', icon: 'O', wallets: ['MetaMask', 'Coinbase'], txs: '2.1M', tvl: '$3B' },
  { id: 'bsc', name: 'BNB Chain', symbol: 'BNB', color: '#F0B90B', icon: 'B', wallets: ['MetaMask', 'Trust Wallet'], txs: '6.3M', tvl: '$7B' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', color: '#9945FF', icon: '◎', wallets: ['Phantom', 'Solflare', 'Backpack'], txs: '8.5M', tvl: '$15B' },
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', color: '#F7931A', icon: '₿', wallets: ['Xverse', 'Leather', 'Unisat'], txs: '320K', tvl: '$120B' },
  { id: 'ton', name: 'TON', symbol: 'TON', color: '#0098EA', icon: 'T', wallets: ['Tonkeeper', 'OpenMask'], txs: '2.3M', tvl: '$1.5B' },
  { id: 'tron', name: 'TRON', symbol: 'TRX', color: '#FF0013', icon: 'T', wallets: ['TronLink', 'TronPay'], txs: '4.8M', tvl: '$8B' },
  { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', color: '#2E3148', icon: 'C', wallets: ['Keplr', 'Leap'], txs: '1.1M', tvl: '$2.5B' },
  { id: 'sui', name: 'Sui', symbol: 'SUI', color: '#4DA2FF', icon: 'S', wallets: ['Sui Wallet', 'Ethos', 'Suiet'], txs: '3.2M', tvl: '$1.2B' },
  { id: 'starknet', name: 'Starknet', symbol: 'STRK', color: '#EF6D39', icon: 'S', wallets: ['Argent X', 'Braavos'], txs: '890K', tvl: '$450M' },
  { id: 'near', name: 'NEAR', symbol: 'NEAR', color: '#00C08B', icon: 'N', wallets: ['NEAR Wallet', 'Here Wallet'], txs: '1.5M', tvl: '$800M' },
  { id: 'hedera', name: 'Hedera', symbol: 'HBAR', color: '#161E3B', icon: 'H', wallets: ['HashPack', 'Blade'], txs: '920K', tvl: '$300M' },
  { id: 'xrpl', name: 'XRPL', symbol: 'XRP', color: '#23292F', icon: 'X', wallets: ['Xaman', 'Fireblocks'], txs: '650K', tvl: '$200M' },
];

export default function MultiChainPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const chain = CHAINS.find(c => c.id === selected);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">CinaCoin</a>
          <div className="flex items-center gap-1">
            <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Home</a>
            <a href="/swap" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Swap</a>
            <a href="/multichain" className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-gray-800">Multi-Chain</a>
            <a href="/auth" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Auth</a>
          </div>
        </div>
      </nav>

      <section className="max-w-5xl mx-auto pt-12 px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">16 Chains, One SDK</h1>
          <p className="text-gray-400 max-w-lg mx-auto">EVM · Solana · Bitcoin · Layer 2s — unified API, zero fragmentation</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {CHAINS.map(c => (
            <button key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
              className={`p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5 ${selected === c.id ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gray-800/80' : 'border-gray-800 bg-gray-900/50 hover:border-gray-600'}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: c.color }}>{c.icon}</span>
                <span className="font-semibold text-sm">{c.name}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {c.wallets.slice(0, 3).map(w => <span key={w} className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400">{w}</span>)}
              </div>
            </button>
          ))}
        </div>

        {chain && (
          <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-blue-500/20 p-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: chain.color }}>{chain.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{chain.name}</h2>
                <p className="text-sm text-gray-500">{chain.wallets.join(' · ')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-800/50 rounded-xl p-3 text-center"><div className="text-lg font-bold text-blue-400">{chain.txs}</div><div className="text-xs text-gray-500">TXs/day</div></div>
              <div className="bg-gray-800/50 rounded-xl p-3 text-center"><div className="text-lg font-bold text-purple-400">{chain.tvl}</div><div className="text-xs text-gray-500">TVL</div></div>
              <div className="bg-gray-800/50 rounded-xl p-3 text-center"><div className="flex items-center justify-center gap-2"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/><span className="text-green-400 text-sm font-medium">Active</span></div><div className="text-xs text-gray-500">Status</div></div>
            </div>
            <button className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all">Connect {chain.name}</button>
          </div>
        )}

        {/* Cross-Chain Flow */}
        <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Cross-Chain Bridge</h2>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl px-6 py-4 text-center"><span className="text-2xl">Ξ</span><p className="text-sm font-semibold">Ethereum</p></div>
            <span className="text-2xl text-gray-500">→</span>
            <div className="bg-gray-800 rounded-xl px-6 py-4 text-center"><span className="text-2xl">🌉</span><p className="text-sm font-semibold">Relay</p><p className="text-xs text-gray-500">CinaCoin</p></div>
            <span className="text-2xl text-gray-500">→</span>
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl px-6 py-4 text-center"><span className="text-2xl">◎</span><p className="text-sm font-semibold">Solana</p></div>
            <span className="text-2xl text-gray-500">→</span>
            <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl px-6 py-4 text-center"><span className="text-2xl">₿</span><p className="text-sm font-semibold">Bitcoin</p></div>
          </div>
        </div>

        {/* Unified API */}
        <div className="mt-8 bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Unified API</h2>
          <pre className="bg-gray-950 rounded-xl p-4 font-mono text-sm text-gray-300 overflow-x-auto">
{`import { CinaCoin } from '@cinacoin/core-sdk';

const cc = new CinaCoin({ projectId: 'YOUR_ID' });

// Connect to any chain with the same API
const eth = await cc.connect('ethereum', 'metamask');
const sol = await cc.connect('solana', 'phantom');
const btc = await cc.connect('bitcoin', 'xverse');`}</pre>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[{ l: 'Chains', v: '16', c: 'text-blue-400' }, { l: 'Wallets', v: '30+', c: 'text-purple-400' }, { l: 'Adapters', v: '11', c: 'text-pink-400' }, { l: 'Latency', v: '<50ms', c: 'text-green-400' }].map(s => (
            <div key={s.l} className="bg-gray-900/50 backdrop-blur rounded-2xl border border-gray-800 p-6 text-center">
              <div className={`text-3xl font-bold ${s.c}`}>{s.v}</div><div className="text-gray-500 text-sm">{s.l}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
