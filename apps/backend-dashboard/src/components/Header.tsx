"use client";

import { useAuth } from "@/lib/AuthProvider";

export default function Header() {
  const { address, isLoggedIn, doLogout } = useAuth();

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  return (
    <header className="bg-dashboard-surface/80 backdrop-blur border-b border-dashboard-border px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">CinaCoin Backend</h2>
        <p className="text-sm text-dashboard-muted">Cloudflare Workers Management</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dashboard-success/10 border border-dashboard-success/30">
          <span className="w-2 h-2 rounded-full bg-dashboard-success animate-pulse" />
          <span className="text-xs text-dashboard-success font-medium">All Systems Operational</span>
        </div>

        {isLoggedIn && (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-xs text-indigo-300 font-mono">{shortAddress}</span>
            </div>
            <button
              onClick={doLogout}
              className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-full hover:bg-red-500/10 transition-colors"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
