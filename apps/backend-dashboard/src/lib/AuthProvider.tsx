"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { isWalletAvailable, createSiweMessage, generateNonce } from "@/lib/auth";

interface AuthContextValue {
  address: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  doLogin: () => Promise<void>;
  doLogout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  address: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,
  doLogin: async () => {},
  doLogout: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * httpOnly cookie-based auth provider.
 *
 * Replaces localStorage storage with server-managed httpOnly cookies.
 * The login flow is:
 * 1. Connect wallet
 * 2. Request nonce from server (server stores nonce in httpOnly cookie)
 * 3. Sign SIWE message with wallet
 * 4. Send signature to server for verification
 * 5. Server verifies, sets session in httpOnly cookie
 * 6. Client stores only display metadata in memory
 *
 * SECURITY: The session token is never exposed to JavaScript.
 * XSS attacks cannot steal the token because httpOnly cookies are
 * not accessible via document.cookie or localStorage.
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount by checking server-side cookie
  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.authenticated) {
          setAddress(data.address);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    const handler = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Wallet disconnected externally
        handleLogoutRequest();
        setAddress(null);
      } else {
        const current = accounts[0].toLowerCase();
        if (address && current !== address) {
          handleLogoutRequest();
          setAddress(current);
        }
      }
    };

    eth.on("accountsChanged", handler);
    return () => eth.removeListener("accountsChanged", handler);
  }, [address]);

  const doLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("No Ethereum wallet detected");

      // Step 1: Connect wallet
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts || accounts.length === 0) throw new Error("No accounts returned");
      const walletAddress = accounts[0];

      // Step 2: Request nonce from server (stored in httpOnly cookie)
      const nonceRes = await fetch('/api/auth/nonce', { method: 'POST', credentials: 'include' });
      if (!nonceRes.ok) throw new Error('Failed to get nonce');
      const { nonce } = await nonceRes.json();

      // Step 3: Build SIWE message and sign
      const message = createSiweMessage(walletAddress, nonce);
      const hexMessage = "0x" + Array.from(new TextEncoder().encode(message))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const signature = (await eth.request({
        method: "personal_sign",
        params: [hexMessage, walletAddress],
      })) as string;

      // Step 4: Send to server for verification
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, nonce }),
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json();
        throw new Error(errData.error || 'Login failed');
      }

      const loginData = await loginRes.json();
      setAddress(loginData.address);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogoutRequest = useCallback(() => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const doLogout = useCallback(() => {
    handleLogoutRequest();
    setAddress(null);
  }, [handleLogoutRequest]);

  const value: AuthContextValue = {
    address,
    isLoggedIn: address !== null,
    isLoading,
    error,
    doLogin,
    doLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
