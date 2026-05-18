import React, { useState, useEffect, useCallback } from 'react'
import { useWallet, formatAddress } from '../hooks/useWallet'

interface WalletOption {
  id: string
  name: string
  emoji: string
  color: string
  popular: boolean
}

const WALLETS: WalletOption[] = [
  { id: 'metamask', name: 'MetaMask', emoji: '🦊', color: '#F6851B', popular: true },
  { id: 'walletconnect', name: 'WalletConnect', emoji: '🔗', color: '#3B99FC', popular: true },
  { id: 'coinbase', name: 'Coinbase Wallet', emoji: '🔵', color: '#0052FF', popular: true },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', color: '#8B5CF6', popular: true },
  { id: 'phantom', name: 'Phantom', emoji: '👻', color: '#AB9FF2', popular: true },
  { id: 'trust', name: 'Trust Wallet', emoji: '🛡️', color: '#3375BB', popular: true },
  { id: 'ledger', name: 'Ledger', emoji: '🔒', color: '#000000', popular: false },
  { id: 'zerion', name: 'Zerion', emoji: '💜', color: '#2C60F5', popular: false },
]

type ModalState = 'closed' | 'open' | 'connecting' | 'success' | 'error' | 'no-wallet'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

declare global {
  interface Window {
    ethereum?: any
  }
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { isConnected, address, connect, disconnect } = useWallet()

  const [modalState, setModalState] = useState<ModalState>(isOpen ? 'open' : 'closed')
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null)
  const [activeTab, setActiveTab] = useState<'popular' | 'all'>('popular')
  const [error, setError] = useState<string | null>(null)

  // Detect installed wallets
  const isMetaMaskInstalled = typeof window !== 'undefined' && !!window.ethereum?.isMetaMask
  const isCoinbaseInstalled = typeof window !== 'undefined' && !!window.ethereum?.isCoinbaseWallet

  useEffect(() => {
    if (isOpen) {
      setModalState('open')
      setSelectedWallet(null)
      setError(null)
    }
  }, [isOpen])

  // If already connected from outside the modal, close
  useEffect(() => {
    if (isConnected && modalState !== 'success') {
      setModalState('success')
    }
  }, [isConnected, modalState])

  const handleSelectWallet = useCallback(async (wallet: WalletOption) => {
    setSelectedWallet(wallet)
    setError(null)

    if (wallet.id === 'metamask') {
      setModalState('connecting')
      try {
        await connect()
        // connect() already sets isConnected → true, useEffect above handles success
      } catch (err: any) {
        let message = 'Failed to connect wallet'
        if (err.code === 4001 || err.message?.includes('rejected')) {
          message = 'User rejected the connection request'
        } else if (err.message) {
          message = err.message
        }
        setError(message)
        setModalState('error')
      }
    } else if (wallet.id === 'coinbase' && isCoinbaseInstalled) {
      setModalState('connecting')
      try {
        await connect()
      } catch (err: any) {
        let message = 'Failed to connect wallet'
        if (err.code === 4001 || err.message?.includes('rejected')) {
          message = 'User rejected the connection request'
        } else if (err.message) {
          message = err.message
        }
        setError(message)
        setModalState('error')
      }
    } else if (wallet.id === 'walletconnect') {
      // WalletConnect not available via injected provider — show info
      setModalState('no-wallet')
    } else {
      // Wallet not installed — show "no wallet" state
      setModalState('no-wallet')
    }
  }, [connect, isCoinbaseInstalled])

  const handleClose = useCallback(() => {
    setModalState('closed')
    setSelectedWallet(null)
    setError(null)
    // Don't disconnect on close — user may still be connected
    onClose()
  }, [onClose])

  const handleBack = useCallback(() => {
    setModalState('open')
    setSelectedWallet(null)
    setError(null)
  }, [])

  const handleRetry = useCallback(async () => {
    if (!selectedWallet) return
    setError(null)
    setModalState('connecting')
    try {
      await connect()
    } catch (err: any) {
      let message = 'Failed to connect wallet'
      if (err.code === 4001 || err.message?.includes('rejected')) {
        message = 'User rejected the connection request'
      } else if (err.message) {
        message = err.message
      }
      setError(message)
      setModalState('error')
    }
  }, [selectedWallet, connect])

  const handleDisconnect = useCallback(() => {
    disconnect()
    setModalState('closed')
    onClose()
  }, [disconnect, onClose])

  // Show success if connected
  const displayAddress = address ? formatAddress(address) : ''

  if (modalState === 'closed') return null

  const popularWallets = WALLETS.filter(w => w.popular)
  const allWallets = WALLETS.filter(w => !w.popular)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={modalState === 'open' || modalState === 'no-wallet' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-bounce-in">
        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {(modalState === 'connecting' || modalState === 'success' || modalState === 'error' || modalState === 'no-wallet') && (
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
                 modalState === 'success' ? 'Connected' :
                 modalState === 'error' ? 'Connection Failed' :
                 modalState === 'no-wallet' ? 'Wallet Not Found' : 'Connect Wallet'}
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
                      {popularWallets.map((wallet, i) => {
                        const detected = wallet.id === 'metamask' && isMetaMaskInstalled
                          || wallet.id === 'coinbase' && isCoinbaseInstalled
                        return (
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
                            {detected && (
                              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                                Detected
                              </span>
                            )}
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )
                      })}
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
                <p className="text-gray-500 text-xs">
                  Confirm connection in your wallet popup
                </p>
              </div>
            )}

            {modalState === 'success' && (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                {/* Checkmark animation */}
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-bounce-in">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Wallet Connected</h3>
                <p className="text-gray-400 text-sm mb-2">
                  Connected via injected provider
                </p>
                {address && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-300 font-mono">
                    <span>{displayAddress}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(address)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4 text-gray-500 hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                )}
                <button
                  onClick={handleDisconnect}
                  className="mt-4 px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
                >
                  Disconnect
                </button>
              </div>
            )}

            {modalState === 'error' && selectedWallet && (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                {/* Error icon */}
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6 animate-bounce-in">
                  <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Connection Failed</h3>
                <p className="text-gray-400 text-sm mb-6 text-center max-w-xs">
                  {error || 'Something went wrong while connecting your wallet.'}
                </p>
                <button
                  onClick={handleRetry}
                  className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            {modalState === 'no-wallet' && selectedWallet && (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                {/* Wallet not found icon */}
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6 animate-bounce-in">
                  <div className="text-4xl">{selectedWallet.emoji}</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {selectedWallet.id === 'walletconnect'
                    ? 'WalletConnect — QR Code Not Available'
                    : `${selectedWallet.name} Not Installed`}
                </h3>
                <p className="text-gray-400 text-sm mb-6 text-center max-w-xs">
                  {selectedWallet.id === 'walletconnect'
                    ? 'WalletConnect QR scanning requires a real provider setup. For now, try MetaMask or another injected wallet.'
                    : `You don't have ${selectedWallet.name} installed. Install it to connect your wallet.`}
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  {selectedWallet.id === 'metamask' && (
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium text-center"
                    >
                      Install MetaMask →
                    </a>
                  )}
                  {selectedWallet.id === 'coinbase' && (
                    <a
                      href="https://www.coinbase.com/wallet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium text-center"
                    >
                      Install Coinbase Wallet →
                    </a>
                  )}
                  {selectedWallet.id === 'rainbow' && (
                    <a
                      href="https://rainbow.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium text-center"
                    >
                      Install Rainbow →
                    </a>
                  )}
                  {selectedWallet.id === 'phantom' && (
                    <a
                      href="https://phantom.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium text-center"
                    >
                      Install Phantom →
                    </a>
                  )}
                  {selectedWallet.id === 'trust' && (
                    <a
                      href="https://trustwallet.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium text-center"
                    >
                      Install Trust Wallet →
                    </a>
                  )}
                  <button
                    onClick={handleBack}
                    className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    ← Back to wallets
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {modalState === 'open' && (
            <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
              <span>New to wallets?</span>
              <a
                href="https://ethereum.org/en/wallets/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 hover:underline"
              >
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
