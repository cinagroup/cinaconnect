"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { login, logout, getSession, isWalletAvailable } from "@/lib/auth";

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

export default function AuthProvider({ children }: AuthProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setAddress(session.address);
    }
    setIsLoading(false);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    const handler = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Wallet disconnected externally
        logout();
        setAddress(null);
      } else {
        const current = accounts[0].toLowerCase();
        // If the switched account doesn't match our session, log out
        if (address && current !== address) {
          logout();
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
      const session = await login();
      setAddress(session.address);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const doLogout = useCallback(() => {
    logout();
    setAddress(null);
  }, []);

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
