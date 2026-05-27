import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { EthereumProvider } from '../wc'

export interface WalletState {
  connected: boolean
  address: string
  chainId: number
  walletId: string | null
  connecting: boolean
  error: string | null
}

interface WalletContextValue extends WalletState {
  connectMetaMask: () => Promise<void>
  connectWalletConnect: () => Promise<void>
  disconnect: () => void
  clearError: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

declare global {
  interface Window {
    ethereum?: any
  }
}

// WalletConnect provider singleton
let wcProvider: any = null

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: '',
    chainId: 0,
    walletId: null,
    connecting: false,
    error: null,
  })

  const wcProviderRef = useRef<any>(null)

  // Check for existing connection on mount
  useEffect(() => {
    const checkExisting = async () => {
      // Check MetaMask
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' })
            setState({
              connected: true,
              address: accounts[0],
              chainId: parseInt(chainId, 16),
              walletId: 'metamask',
              connecting: false,
              error: null,
            })

            window.ethereum.on('accountsChanged', (accounts: string[]) => {
              if (accounts.length === 0) {
                setState(prev => ({ ...prev, connected: false, address: '', walletId: null }))
              } else {
                setState(prev => ({ ...prev, address: accounts[0] }))
              }
            })
            window.ethereum.on('chainChanged', (chainId: string) => {
              setState(prev => ({ ...prev, chainId: parseInt(chainId, 16) }))
            })
            return
          }
        } catch {
          // No existing connection
        }
      }

      // Check WalletConnect
      if (wcProvider && wcProvider.session) {
        try {
          const accounts = wcProvider.accounts
          if (accounts && accounts.length > 0) {
            setState({
              connected: true,
              address: accounts[0],
              chainId: wcProvider.chainId || 1,
              walletId: 'walletconnect',
              connecting: false,
              error: null,
            })
            return
          }
        } catch {
          // No existing connection
        }
      }
    }
    checkExisting()
  }, [])

  const connectMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      setState(prev => ({
        ...prev,
        error: 'No Ethereum wallet detected. Please install MetaMask.',
        connecting: false,
        walletId: 'metamask',
      }))
      return
    }

    setState(prev => ({ ...prev, connecting: true, error: null, walletId: 'metamask' }))

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      const chainId = await window.ethereum.request({ method: 'eth_chainId' })

      setState({
        connected: true,
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        walletId: 'metamask',
        connecting: false,
        error: null,
      })

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setState(prev => ({ ...prev, connected: false, address: '', walletId: null }))
        } else {
          setState(prev => ({ ...prev, address: accounts[0] }))
        }
      })
      window.ethereum.on('chainChanged', (chainId: string) => {
        setState(prev => ({ ...prev, chainId: parseInt(chainId, 16) }))
      })
    } catch (err: any) {
      let message = 'Failed to connect wallet'
      if (err.code === 4001) {
        message = 'User rejected the connection request'
      } else if (err.message) {
        message = err.message
      }
      setState(prev => ({
        ...prev,
        error: message,
        connecting: false,
      }))
    }
  }, [])

  const connectWalletConnect = useCallback(async () => {
    setState(prev => ({ ...prev, connecting: true, error: null, walletId: 'walletconnect' }))

    try {
      if (!wcProvider) {
        wcProvider = await EthereumProvider.init({
          projectId: 'c8e4e0f2c8e4e0f2c8e4e0f2c8e4e0f2',
          chains: [1],
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'dark',
          },
          methods: ['eth_sendTransaction', 'personal_sign'],
          events: ['chainChanged', 'accountsChanged'],
          metadata: {
            name: 'CinaCoin Demo',
            description: 'CinaCoin Demo Application',
            url: 'https://cinacoin-demo.pages.dev',
            icons: ['https://avatars.githubusercontent.com/u/37784886'],
          },
        })
        wcProviderRef.current = wcProvider
      }

      await wcProvider.connect({
        chains: [1],
      })

      const accounts = wcProvider.accounts
      if (accounts && accounts.length > 0) {
        setState({
          connected: true,
          address: accounts[0],
          chainId: wcProvider.chainId || 1,
          walletId: 'walletconnect',
          connecting: false,
          error: null,
        })
      } else {
        setState(prev => ({
          ...prev,
          error: 'No accounts returned from WalletConnect',
          connecting: false,
        }))
      }
    } catch (err: any) {
      let message = 'Failed to connect WalletConnect'
      if (err.message?.includes('rejected') || err.message?.includes('User rejected')) {
        message = 'User rejected the connection request'
      } else if (err.message) {
        message = err.message
      }
      setState(prev => ({
        ...prev,
        error: message,
        connecting: false,
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners?.('accountsChanged')
      window.ethereum.removeAllListeners?.('chainChanged')
    }

    if (wcProvider) {
      wcProvider.disconnect?.()
    }

    setState({
      connected: false,
      address: '',
      chainId: 0,
      walletId: null,
      connecting: false,
      error: null,
    })
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return (
    <WalletContext.Provider value={{
      ...state,
      connectMetaMask,
      connectWalletConnect,
      disconnect,
      clearError,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export { formatAddress }
