import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import WalletModal from '../components/WalletModal'
import { useWallet, formatAddress } from '../contexts/WalletContext'
import { useChainInfo } from '../hooks/useChainInfo'

interface Chain {
  name: string
  color: string
  emoji: string
}

interface Feature {
  icon: string
  title: string
  desc: string
}

const CHAINS: Chain[] = [
  { name: 'Ethereum', color: '#627EEA', emoji: '⟠' },
  { name: 'Solana', color: '#9945FF', emoji: '◎' },
  { name: 'Polygon', color: '#8247E5', emoji: '⬡' },
  { name: 'Arbitrum', color: '#28A0F0', emoji: '🔵' },
  { name: 'Optimism', color: '#FF0420', emoji: '🔴' },
  { name: 'Base', color: '#0052FF', emoji: '🔷' },
  { name: 'BNB Chain', color: '#F3BA2F', emoji: '🟡' },
  { name: 'Avalanche', color: '#E84142', emoji: '🔺' },
  { name: 'Fantom', color: '#1969FF', emoji: '👻' },
  { name: 'Celo', color: '#FCFF52', emoji: '🌿' },
  { name: 'zkSync', color: '#4E529A', emoji: '🟣' },
  { name: 'Linea', color: '#121212', emoji: '📐' },
  { name: 'Scroll', color: '#FFDE59', emoji: '📜' },
  { name: 'Gnosis', color: '#48A9A6', emoji: '🧠' },
  { name: 'Moonbeam', color: '#FF68B1', emoji: '🌙' },
  { name: 'Aptos', color: '#2DD8A3', emoji: '🅰️' },
]

const FEATURES: Feature[] = [
  { icon: '🔗', title: 'Universal Connector', desc: 'One API for 30+ wallets. MetaMask, WalletConnect, Coinbase, Rainbow, Phantom, and more.' },
  { icon: '🌐', title: 'Multi-Chain', desc: '16 chains supported out of the box. EVM, Solana, Aptos — all unified under one interface.' },
  { icon: '🔐', title: 'SIWE Auth', desc: 'Sign-In with Ethereum for secure, passwordless authentication. One click login, fully on-chain.' },
  { icon: '🔄', title: 'Swap Integration', desc: 'Built-in token swap UI with multi-chain routing. Best rates across all supported DEXes.' },
  { icon: '📱', title: 'Mobile Ready', desc: 'Responsive design that works perfectly on any device. Deep linking for native wallet apps.' },
  { icon: '🧩', title: 'Plug & Play', desc: 'Install, configure, connect. Under 5 minutes to full wallet integration in any React app.' },
]

const HomePage: React.FC = () => {
  const { connected: isConnected, address, chainId, disconnect } = useWallet()
  const chainInfo = useChainInfo(chainId || null, address || null)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [selectedChain, setSelectedChain] = useState('Ethereum')

  return (
    <div className="min-h-screen bg-gray-950">
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🔢</span>
              <span className="font-bold text-lg">Cina<span className="text-violet-400">Connect</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/swap" className="text-gray-400 hover:text-white transition-colors text-sm">Swap</Link>
              <Link to="/multichain" className="text-gray-400 hover:text-white transition-colors text-sm">Multi-Chain</Link>
              <Link to="/auth" className="text-gray-400 hover:text-white transition-colors text-sm">Auth</Link>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  ● Connected
                </span>
                <span className="text-sm font-mono text-gray-300">{formatAddress(address)}</span>
                <button
                  onClick={disconnect}
                  className="text-xs px-2 py-1 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setWalletModalOpen(true)}
                className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
                ✨ Open Source • 64 Packages • Zero Cost
              </span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-black leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Connect any wallet
              <br />
              <span className="gradient-text">on any chain</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              One SDK, infinite possibilities. Unify wallet connections, multi-chain swaps,
              and SIWE authentication in your app — in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <button
                onClick={() => setWalletModalOpen(true)}
                className="btn-primary px-8 py-4 rounded-2xl text-lg font-semibold w-full sm:w-auto animate-pulse-glow"
              >
                {isConnected ? '🔗 Reconnect Wallet' : '🚀 Connect Wallet'}
              </button>
              <Link
                to="/swap"
                className="btn-secondary px-8 py-4 rounded-2xl text-lg font-medium w-full sm:w-auto"
              >
                Try Swap Demo →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Connected State */}
      {isConnected && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <p className="font-mono font-semibold">{formatAddress(address)}</p>
                  <p className="text-sm text-gray-400">
                    {chainInfo.chainName}
                    {chainInfo.loading ? ' ⏳' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {chainInfo.blockNumber && (
                    <div>
                      <p className="text-gray-500 text-xs">Block</p>
                      <p className="font-mono font-medium text-violet-400">#{chainInfo.blockNumber}</p>
                    </div>
                  )}
                  {chainInfo.balanceEth && (
                    <div>
                      <p className="text-gray-500 text-xs">Balance</p>
                      <p className="font-mono font-medium text-emerald-400">{chainInfo.balanceEth} ETH</p>
                    </div>
                  )}
                  {chainInfo.error && (
                    <p className="text-xs text-red-400">{chainInfo.error}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Chain:</label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-violet-500 outline-none"
                >
                  {CHAINS.map(c => (
                    <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>
                  ))}
                </select>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stats Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-center">
            {[
              { label: 'Packages', value: '64' },
              { label: 'Chains', value: '16' },
              { label: 'Wallets', value: '30+' },
              { label: 'Cost', value: '$0' },
              { label: 'Open Source', value: '100%' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            A complete wallet connection toolkit, open source and free.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="glass-card glass-card-hover rounded-2xl p-6 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Chain Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">16 Chains Supported</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            From Ethereum to Solana, EVM to non-EVM — connect to any chain seamlessly.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {CHAINS.map((chain, i) => (
            <div
              key={chain.name}
              className="glass-card glass-card-hover rounded-xl p-4 text-center cursor-pointer animate-fade-in-up group"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: chain.color + '20' }}
              >
                {chain.emoji}
              </div>
              <p className="text-xs font-medium text-gray-300">{chain.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔢</span>
              <span className="font-semibold">CinaCoin</span>
              <span className="text-gray-500 text-sm">v1.0.0</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Docs</a>
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">GitHub</a>
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Discord</a>
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Twitter</a>
            </div>
            <p className="text-gray-600 text-sm">
              © 2026 CinaGroup. Open source under MIT.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage