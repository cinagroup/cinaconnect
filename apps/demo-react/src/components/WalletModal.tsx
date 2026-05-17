import React, { useState, useEffect, useCallback } from 'react'

interface WalletOption {
  id: string
  name: string
  emoji: string
  color: string
  popular: boolean
  detected?: boolean
  qr?: boolean
}

const WALLETS: WalletOption[] = [
  { id: 'metamask', name: 'MetaMask', emoji: '🦊', color: '#F6851B', popular: true, detected: true },
  { id: 'walletconnect', name: 'WalletConnect', emoji: '🔗', color: '#3B99FC', popular: true, qr: true },
  { id: 'coinbase', name: 'Coinbase Wallet', emoji: '🔵', color: '#0052FF', popular: true, detected: true },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', color: '#8B5CF6', popular: true },
  { id: 'phantom', name: 'Phantom', emoji: '👻', color: '#AB9FF2', popular: true },
  { id: 'trust', name: 'Trust Wallet', emoji: '🛡️', color: '#3375BB', popular: true },
  { id: 'ledger', name: 'Ledger', emoji: '🔒', color: '#000000', popular: false },
  { id: 'zerion', name: 'Zerion', emoji: '💜', color: '#2C60F5', popular: false },
]

type ModalState = 'closed' | 'open' | 'connecting' | 'success'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect?: (wallet: string) => void
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [modalState, setModalState] = useState<ModalState>(isOpen ? 'open' : 'closed')
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState<'popular' | 'all'>('popular')

  useEffect(() => {
    if (isOpen) {
      setModalState('open')
      setSelectedWallet(null)
      setProgress(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (modalState === 'connecting') {
      setProgress(0)
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setModalState('success')
            return 100
          }
          return prev + Math.random() * 15 + 5
        })
      }, 200)
      return () => clearInterval(interval)
    }
  }, [modalState])

  const handleSelectWallet = useCallback((wallet: WalletOption) => {
    setSelectedWallet(wallet)
    setModalState('connecting')
    if (onConnect) {
      setTimeout(() => onConnect(wallet.id), 2000)
    }
  }, [onConnect])

  const handleClose = useCallback(() => {
    setModalState('closed')
    setSelectedWallet(null)
    setProgress(0)
    onClose()
  }, [onClose])

  const handleBack = useCallback(() => {
    setModalState('open')
    setSelectedWallet(null)
    setProgress(0)
  }, [])

  if (modalState === 'closed') return null

  const popularWallets = WALLETS.filter(w => w.popular)
  const allWallets = WALLETS.filter(w => !w.popular)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={modalState === 'open' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-bounce-in">
        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {modalState !== 'open' && (
                <button
                  onClick={modalState === 'success' ? handleClose : handleBack}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-lg font-semibold">
                {modalState === 'connecting' ? 'Connecting...' :
                 modalState === 'success' ? 'Connected' : 'Connect Wallet'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {modalState === 'open' && (
              <>
                {/* Tabs */}
                <div className="flex px-6 pt-4 gap-2">
                  <button
                    onClick={() => setActiveTab('popular')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'popular'
                        ? 'bg-violet-600/20 text-violet-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Popular
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'all'
                        ? 'bg-violet-600/20 text-violet-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All wallets
                  </button>
                </div>

                <div className="px-6 pb-6 pt-2">
                  {activeTab === 'popular' && (
                    <div className="space-y-2">
                      {popularWallets.map((wallet, i) => (
                        <button
                          key={wallet.id}
                          onClick={() => handleSelectWallet(wallet)}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group"
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ backgroundColor: wallet.color + '20' }}
                          >
                            {wallet.emoji}
                          </div>
                          <span className="flex-1 text-left font-medium">{wallet.name}</span>
                          {wallet.detected && (
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                              Detected
                            </span>
                          )}
                          {wallet.qr && (
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                          )}
                          <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === 'all' && (
                    <div className="space-y-2">
                      {allWallets.map((wallet, i) => (
                        <button
                          key={wallet.id}
                          onClick={() => handleSelectWallet(wallet)}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group"
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ backgroundColor: wallet.color + '20' }}
                          >
                            {wallet.emoji}
                          </div>
                          <span className="flex-1 text-left font-medium">{wallet.name}</span>
                          <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {modalState === 'connecting' && selectedWallet && (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                {/* Spinning loader */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-2 border-white/10" />
                  <div
                    className="absolute inset-0 w-20 h-20 rounded-full border-2 border-transparent border-t-violet-500 animate-spin-slow"
                  />
                  <div
                    className="absolute inset-2 w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: selectedWallet.color + '20' }}
                  >
                    {selectedWallet.emoji}
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Opening {selectedWallet.name}...
                </p>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-200"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-3">
                  Confirm connection in your wallet
                </p>
              </div>
            )}

            {modalState === 'success' && selectedWallet && (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                {/* Checkmark animation */}
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-bounce-in">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Wallet Connected</h3>
                <p className="text-gray-400 text-sm mb-2">
                  Connected via {selectedWallet.name}
                </p>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-300 font-mono">
                  <span>0x7a3...8f2d</span>
                  <svg className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {modalState === 'open' && (
            <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
              <span>New to wallets?</span>
              <a href="#" className="text-violet-400 hover:text-violet-300 hover:underline">
                Learn more →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WalletModal
