'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { rpcProxyRequest } from './workers';

/** Common chain configs. */
const CHAIN_CONFIGS: Record<number, { name: string; symbol: string }> = {
  1: { name: 'Ethereum', symbol: 'ETH' },
  5: { name: 'Goerli', symbol: 'ETH' },
  11155111: { name: 'Sepolia', symbol: 'ETH' },
  10: { name: 'Optimism', symbol: 'ETH' },
  137: { name: 'Polygon', symbol: 'POL' },
  42161: { name: 'Arbitrum', symbol: 'ETH' },
  8453: { name: 'Base', symbol: 'ETH' },
  56: { name: 'BNB Chain', symbol: 'BNB' },
  43114: { name: 'Avalanche', symbol: 'AVAX' },
  324: { name: 'zkSync', symbol: 'ETH' },
  84532: { name: 'Base Sepolia', symbol: 'ETH' },
};

/** Wallet provider info. */
export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installed: boolean;
}

/** Account state. */
export interface AccountState {
  address: string | null;
  balance: string;
  chainId: number | null;
  chainName: string;
  chainSymbol: string;
}

/** Hook return value. */
export interface UseWalletReturn {
  account: AccountState;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  connectors: WalletInfo[];
  connect: (connectorId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

/** Hook options. */
export interface UseWalletOptions {
  /** When true, read-only eth_* requests route through the RPC Proxy Worker. */
  useRpcProxy?: boolean;
}

/**
 * Format wei (hex string) to ETH string.
 */
function formatEther(weiHex: string): string {
  try {
    const wei = BigInt(weiHex);
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
  } catch {
    return '0.0000';
  }
}

/**
 * Shorten an address for display.
 */
export function shortenAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Get the current Ethereum provider from window.
 * For MetaMask: window.ethereum
 * For EIP-6963: window.ethereum.providers array
 */
function getEthereumProvider(): Record<string, unknown> | null {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  return window.ethereum;
}

/**
 * Send an EIP-1193 JSON-RPC request.
 * When useRpcProxy is true, read-only requests (eth_*) route through the RPC Proxy Worker.
 */
async function ethereumRequest(
  method: string,
  params?: unknown[],
  useRpcProxy = false,
): Promise<unknown> {
  // Read-only eth_* methods can go through the RPC proxy
  if (useRpcProxy && method.startsWith('eth_')) {
    return rpcProxyRequest(method, params);
  }
  // Direct provider for everything else (e.g. eth_requestAccounts needs user interaction)
  const provider = getEthereumProvider();
  if (!provider || typeof provider.request !== 'function') {
    throw new Error('No Ethereum provider found');
  }
  return (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({ method, params });
}

/**
 * Detect available wallet providers.
 */
function detectWallets(): WalletInfo[] {
  if (typeof window === 'undefined') return [];

  const wallets: WalletInfo[] = [];

  if (window.ethereum) {
    const eth = window.ethereum;

    // EIP-6963: check window.ethereum.providers
    if (Array.isArray(eth.providers)) {
      const seen = new Set<string>();
      for (const p of eth.providers) {
        const obj = p as Record<string, unknown>;
        const rdns = (obj.rdns as string) || '';
        if (rdns && !seen.has(rdns)) {
          seen.add(rdns);
          wallets.push({
            id: rdns,
            name: (obj.name as string) || rdns,
            icon: (obj.icon as string) || '',
            installed: true,
          });
        }
      }
    }

    // Check well-known wallets on window.ethereum itself
    if (eth.isMetaMask && !wallets.find((w) => w.id === 'io.metamask')) {
      wallets.push({ id: 'io.metamask', name: 'MetaMask', icon: '', installed: true });
    }
    if ((eth as Record<string, unknown>).isRabby && !wallets.find((w) => w.id === 'io.rabby')) {
      wallets.push({ id: 'io.rabby', name: 'Rabby', icon: '', installed: true });
    }
    if ((eth as Record<string, unknown>).isCoinbaseWallet && !wallets.find((w) => w.id === 'com.coinbase.wallet')) {
      wallets.push({ id: 'com.coinbase.wallet', name: 'Coinbase Wallet', icon: '', installed: true });
    }

    // Fallback: ethereum exists but no specific wallet identified
    if (wallets.length === 0) {
      wallets.push({ id: 'io.metamask', name: 'Injected Wallet', icon: '', installed: true });
    }
  }

  return wallets;
}

/**
 * useWallet — real wallet connection hook using EIP-1193 injected wallets.
 *
 * Detects MetaMask and other EIP-6963 injected wallets, handles
 * connection, disconnection, account changes, and chain changes.
 */
export function useWallet(options: UseWalletOptions = {}): UseWalletReturn {
  const { useRpcProxy = false } = options;
  const [account, setAccount] = useState<AccountState>({
    address: null,
    balance: '0.0000',
    chainId: null,
    chainName: '',
    chainSymbol: 'ETH',
  });
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<WalletInfo[]>([]);
  const connectedRef = useRef(false);

  /** Detect available wallets on mount. */
  useEffect(() => {
    const wallets = detectWallets();
    setConnectors(wallets);
  }, []);

  /** Fetch balance for the connected account. */
  const fetchBalance = useCallback(async (address: string): Promise<string> => {
    try {
      const raw = (await ethereumRequest('eth_getBalance', [address, 'latest'], useRpcProxy)) as string;
      return raw ? formatEther(raw) : '0.0000';
    } catch {
      return '0.0000';
    }
  }, [useRpcProxy]);

  /** Update account state from address + chainId. */
  const updateAccount = useCallback(async (address: string) => {
    try {
      const chainIdHex = (await ethereumRequest('eth_chainId', undefined, useRpcProxy)) as string;
      const chainId = parseInt(chainIdHex, 16);
      const balance = await fetchBalance(address);
      const chain = CHAIN_CONFIGS[chainId];

      setAccount({
        address,
        balance,
        chainId,
        chainName: chain?.name ?? `Chain ${chainId}`,
        chainSymbol: chain?.symbol ?? 'ETH',
      });
      setStatus('connected');
      connectedRef.current = true;
      localStorage.setItem('cinacoin_wallet', JSON.stringify({ address, balance, chainId }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch account data';
      setError(message);
      setStatus('error');
    }
  }, [fetchBalance, useRpcProxy]);

  /** Restore session from localStorage on mount. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('cinacoin_wallet');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.address) {
          setAccount({
            address: data.address,
            balance: data.balance || '0.0000',
            chainId: data.chainId || 1,
            chainName: CHAIN_CONFIGS[data.chainId]?.name || '',
            chainSymbol: CHAIN_CONFIGS[data.chainId]?.symbol || 'ETH',
          });
          setStatus('connected');
          connectedRef.current = true;
        }
      } catch {
        // ignore
      }
    }
  }, []);

  /** Set up event listeners on the provider. */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const eth = window.ethereum as {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    if (!eth.on || !eth.removeListener) return;

    const handleAccountsChanged = (accounts: unknown[]) => {
      if (!accounts || accounts.length === 0) {
        setAccount({ address: null, balance: '0.0000', chainId: null, chainName: '', chainSymbol: 'ETH' });
        setStatus('disconnected');
        connectedRef.current = false;
        localStorage.removeItem('cinacoin_wallet');
        return;
      }
      const addr = accounts[0] as string;
      updateAccount(addr);
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      let chainId: number;
      if (typeof chainIdHex === 'string') {
        chainId = parseInt(chainIdHex, 16);
      } else {
        chainId = chainIdHex as number;
      }
      const chain = CHAIN_CONFIGS[chainId];
      setAccount((prev) => {
        const updated = {
          ...prev,
          chainId,
          chainName: chain?.name ?? `Chain ${chainId}`,
          chainSymbol: chain?.symbol ?? 'ETH',
        };
        if (connectedRef.current && prev.address) {
          localStorage.setItem('cinacoin_wallet', JSON.stringify({
            address: prev.address,
            chainId,
            balance: prev.balance,
          }));
        }
        return updated;
      });
    };

    const handleDisconnect = () => {
      setAccount({ address: null, balance: '0.0000', chainId: null, chainName: '', chainSymbol: 'ETH' });
      setStatus('disconnected');
      connectedRef.current = false;
      localStorage.removeItem('cinacoin_wallet');
    };

    eth.on('accountsChanged', handleAccountsChanged);
    eth.on('chainChanged', handleChainChanged);
    eth.on('disconnect', handleDisconnect);

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
      eth.removeListener?.('chainChanged', handleChainChanged);
      eth.removeListener?.('disconnect', handleDisconnect);
    };
  }, [updateAccount]);

  /** Connect to a wallet via eth_requestAccounts. */
  const connect = useCallback(async (connectorId: string) => {
    setStatus('connecting');
    setError(null);

    try {
      const accounts = (await ethereumRequest('eth_requestAccounts')) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }
      await updateAccount(accounts[0]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setStatus('error');
    }
  }, [updateAccount]);

  /** Disconnect — clear local state (no provider-level disconnect for injected wallets). */
  const disconnect = useCallback(async () => {
    setAccount({ address: null, balance: '0.0000', chainId: null, chainName: '', chainSymbol: 'ETH' });
    setStatus('disconnected');
    setError(null);
    connectedRef.current = false;
    localStorage.removeItem('cinacoin_wallet');
  }, []);

  return { account, status, error, connectors, connect, disconnect };
}

/** Augment window type for ethereum. */
declare global {
  interface Window {
    ethereum?: Record<string, unknown> & {
      isMetaMask?: boolean;
      isRabby?: boolean;
      isCoinbaseWallet?: boolean;
      providers?: unknown[];
      rdns?: string;
      name?: string;
      icon?: string;
      request?(args: { method: string; params?: unknown[] }): Promise<unknown>;
      on?(event: string, handler: (...args: unknown[]) => void): void;
      removeListener?(event: string, handler: (...args: unknown[]) => void): void;
    };
  }
}
