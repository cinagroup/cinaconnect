import { useState, useCallback, useEffect, useRef } from 'react'

declare global {
  interface Window {
    ethereum?: any
  }
}

interface UseWalletReturn {
  isConnected: boolean
  address: string
  chainId: number | null
  connect: () => Promise<void>
  disconnect: () => void
}

/**
 * A simple React hook for connecting to an Ethereum wallet via window.ethereum.
 * Handles connection, disconnection, and live account/chain change events.
 */
export function useWallet(): UseWalletReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState<number | null>(null)
  const connectedRef = useRef(isConnected)

  // Keep ref in sync so listeners always read latest state
  useEffect(() => {
    connectedRef.current = isConnected
  }, [isConnected])

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setIsConnected(false)
      setAddress('')
      setChainId(null)
    } else {
      setAddress(accounts[0])
    }
  }, [])

  const handleChainChanged = useCallback((hexChainId: string) => {
    setChainId(parseInt(hexChainId, 16))
  }, [])

  // Register / unregister event listeners when connected
  useEffect(() => {
    const ethereum = typeof window !== 'undefined' ? window.ethereum : undefined
    if (!ethereum || !connectedRef.current) return

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [handleAccountsChanged, handleChainChanged, isConnected])

  const connect = useCallback(async () => {
    const ethereum = typeof window !== 'undefined' ? window.ethereum : undefined
    if (!ethereum) {
      throw new Error('No Ethereum wallet detected. Please install MetaMask or another Web3 wallet.')
    }

    const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
    if (accounts && accounts.length > 0) {
      const hexChainId = await ethereum.request({ method: 'eth_chainId' })
      setAddress(accounts[0])
      setChainId(parseInt(hexChainId, 16))
      setIsConnected(true)
    }
  }, [])

  const disconnect = useCallback(() => {
    const ethereum = typeof window !== 'undefined' ? window.ethereum : undefined
    if (ethereum) {
      ethereum.removeAllListeners?.('accountsChanged')
      ethereum.removeAllListeners?.('chainChanged')
    }
    setIsConnected(false)
    setAddress('')
    setChainId(null)
  }, [])

  return { isConnected, address, chainId, connect, disconnect }
}

/**
 * Format an address to short form: 0x1234...5678
 */
export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
