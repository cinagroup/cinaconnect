"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { isWalletAvailable } from "@/lib/auth";

export default function LoginPage() {
  const { doLogin, isLoggedIn, isLoading, error, address } = useAuth();
  const router = useRouter();
  const [walletMissing, setWalletMissing] = useState(false);
  const [signMessage, setSignMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  if (isLoggedIn) {
    router.push("/");
    return null;
  }

  const handleLogin = async () => {
    if (!isWalletAvailable()) {
      setWalletMissing(true);
      return;
    }
    setWalletMissing(false);
    setSignMessage("Connecting wallet...");

    try {
      await doLogin();
      // AuthProvider will set address on success; the redirect is handled below
    } catch {
      setSignMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1117] to-[#1a1d2e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 mb-4">
            <span className="text-3xl">🔢</span>
          </div>
          <h1 className="text-3xl font-bold text-white">CinaCoin</h1>
          <p className="text-gray-400 mt-2">Backend Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-2">Sign in with Wallet</h2>
          <p className="text-sm text-gray-400 mb-6">
            Connect your Ethereum wallet to access the CinaCoin Backend Dashboard.
            A signature will be requested — no gas fees required.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Wallet not installed warning */}
          {walletMissing && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
              ⚠️ No Ethereum wallet detected. Please install{" "}
              <a
                href="https://metamask.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-300"
              >
                MetaMask
              </a>{" "}
              or another Web3 wallet.
            </div>
          )}

          {/* Sign message preview */}
          {signMessage && !error && (
            <div className="mb-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <p className="text-xs text-indigo-300 font-medium mb-1">⏳ {signMessage}</p>
              {signMessage === "Check your wallet to sign the message..." && (
                <p className="text-xs text-gray-500 mt-1">
                  Approve the signature request in your wallet popup.
                </p>
              )}
            </div>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`
              w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200
              ${
                isLoading
                  ? "bg-indigo-500/50 text-white/60 cursor-not-allowed"
                  : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-400/30 active:scale-[0.98]"
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {signMessage || "Connecting..."}
              </span>
            ) : (
              "🦊 Connect Wallet & Login"
            )}
          </button>

          {/* What happens info */}
          <div className="mt-6 space-y-2 text-xs text-gray-500">
            <p>🔒 You will be asked to sign a message to prove wallet ownership.</p>
            <p>⛽ No gas fees — this is an off-chain signature.</p>
            <p>⏱️ Session expires after 24 hours.</p>
          </div>
        </div>

        {/* Back to dashboard link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
