"use client";

import { useState } from "react";
import BarChart from "@/components/BarChart";
import MetricBox from "@/components/MetricBox";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAU_DATA = [42000, 48000, 55000, 61000, 73000, 82000, 89000, 95000, 102000, 115000, 128000, 142000];
const CONNECTIONS_DATA = [120000, 138000, 155000, 172000, 198000, 221000, 245000, 268000, 289000, 315000, 342000, 378000];
const AUTH_DATA = [8500, 12000, 15800, 19200, 24500, 28900, 32100, 36800, 41200, 46500, 52000, 58000];

const HOURLY_DATA = [2100, 1800, 1200, 900, 700, 850, 1500, 3200, 5800, 7200, 8100, 7900, 8400, 9200, 8800, 8500, 7800, 6900, 5200, 4100, 3800, 3200, 2800, 2400];
const HOURLY_LABELS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

const CHAIN_DISTRIBUTION = [
  { name: "Ethereum", pct: 35, color: "#627EEA" },
  { name: "Polygon", pct: 22, color: "#8247E5" },
  { name: "BSC", pct: 15, color: "#F0B90B" },
  { name: "Arbitrum", pct: 12, color: "#28A0F0" },
  { name: "Optimism", pct: 8, color: "#FF0420" },
  { name: "Solana", pct: 5, color: "#9945FF" },
  { name: "Bitcoin", pct: 3, color: "#F7931A" },
];

const WALLET_DISTRIBUTION = [
  { name: "MetaMask", pct: 38, icon: "🦊" },
  { name: "WalletConnect", pct: 25, icon: "🔗" },
  { name: "Coinbase Wallet", pct: 12, icon: "🔵" },
  { name: "Rainbow", pct: 8, icon: "🌈" },
  { name: "Trust Wallet", pct: 7, icon: "🛡️" },
  { name: "Others", pct: 10, icon: "📱" },
];

const AUTH_METHODS = [
  { name: "Wallet Signature (SIWE)", pct: 55, color: "#6366f1" },
  { name: "Email & Social Login", pct: 25, color: "#06b6d4" },
  { name: "Smart Accounts", pct: 12, color: "#8b5cf6" },
  { name: "SIWX (Cross-chain)", pct: 8, color: "#22c55e" },
];

const TOP_DAPPS = [
  { name: "CinaCoin Demo", users: 28500, growth: 12.4 },
  { name: "Hainai DeFi Portal", users: 15200, growth: 8.7 },
  { name: "CinaSwap", users: 12800, growth: 15.2 },
  { name: "Telegram Mini App", users: 9400, growth: 22.1 },
  { name: "Farcaster Mini App", users: 4200, growth: 35.8 },
];

type TimeRange = "7d" | "30d" | "90d" | "1y";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("90d");

  const multiplier = timeRange === "7d" ? 0.08 : timeRange === "30d" ? 0.25 : timeRange === "90d" ? 0.5 : 1;
  const currentMAU = Math.round(142000 * multiplier);
  const totalConnections = Math.round(378000 * multiplier);
  const totalAuth = Math.round(58000 * multiplier);
  const activeSessions = Math.round(12847 * multiplier);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Analytics</h1>
          <p className="text-dashboard-muted mt-1">
            AppKit usage metrics and connection analytics
          </p>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d", "1y"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? "bg-dashboard-primary text-white"
                  : "bg-dashboard-surface text-dashboard-muted hover:text-white border border-dashboard-border"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Monthly Active Users" value={formatCompact(currentMAU)} icon="👥" trend="up" color="text-dashboard-primaryLight" />
        <MetricBox label="Total Connections" value={formatCompact(totalConnections)} icon="🔗" trend="up" />
        <MetricBox label="Auth Sessions" value={formatCompact(totalAuth)} icon="🔐" trend="up" color="text-dashboard-success" />
        <MetricBox label="Active Sessions" value={formatCompact(activeSessions)} icon="⚡" trend="up" color="text-dashboard-warning" />
      </div>

      {/* MAU Trend */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Active Users</h3>
        <BarChart data={MAU_DATA.map((v) => Math.round(v * multiplier))} labels={MONTHS} color="#6366f1" height={180} />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Connections Over Time</h3>
          <BarChart data={CONNECTIONS_DATA.map((v) => Math.round(v * multiplier))} labels={MONTHS} color="#06b6d4" height={160} />
        </div>
        <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Authentication Events</h3>
          <BarChart data={AUTH_DATA.map((v) => Math.round(v * multiplier))} labels={MONTHS} color="#8b5cf6" height={160} />
        </div>
      </div>

      {/* Hourly activity */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Hourly Activity Distribution (24h)</h3>
        <BarChart data={HOURLY_DATA} labels={HOURLY_LABELS} color="#22c55e" height={140} />
      </div>

      {/* Chain & Wallet distribution */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Chain Distribution</h3>
          <div className="space-y-3">
            {CHAIN_DISTRIBUTION.map((chain) => (
              <div key={chain.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chain.color }} />
                <span className="text-sm text-dashboard-muted w-24">{chain.name}</span>
                <div className="flex-1 bg-dashboard-border rounded-full h-2.5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${chain.pct}%`, backgroundColor: chain.color }} />
                </div>
                <span className="text-sm text-white w-12 text-right">{chain.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Wallet Connectors</h3>
          <div className="space-y-3">
            {WALLET_DISTRIBUTION.map((wallet) => (
              <div key={wallet.name} className="flex items-center gap-3">
                <span className="text-lg">{wallet.icon}</span>
                <span className="text-sm text-dashboard-muted w-32">{wallet.name}</span>
                <div className="flex-1 bg-dashboard-border rounded-full h-2.5 overflow-hidden">
                  <div className="h-full rounded-full bg-dashboard-primary transition-all" style={{ width: `${wallet.pct}%` }} />
                </div>
                <span className="text-sm text-white w-12 text-right">{wallet.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Authentication methods */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Authentication Methods</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {AUTH_METHODS.map((method) => (
              <div key={method.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                <span className="text-sm text-dashboard-muted flex-1">{method.name}</span>
                <span className="text-sm font-medium text-white">{method.pct}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-8 border-dashboard-border relative">
              {AUTH_METHODS.reduce((acc, method, i) => {
                const startDeg = AUTH_METHODS.slice(0, i).reduce((sum, m) => sum + (m.pct * 360) / 100, 0);
                const arcDeg = (method.pct * 360) / 100;
                acc.push(
                  <div
                    key={method.name}
                    className="absolute inset-0"
                    style={{
                      background: `conic-gradient(${method.color} ${startDeg}deg ${startDeg + arcDeg}deg, transparent ${startDeg + arcDeg}deg)`,
                      clipPath: `conic-gradient(from 0deg, ${method.color} ${startDeg}deg ${startDeg + arcDeg}deg, transparent ${startDeg + arcDeg}deg)`,
                    }}
                  />
                );
                return acc;
              }, [] as React.ReactNode[])}
              <div className="absolute inset-3 bg-dashboard-surface rounded-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-dashboard-muted">Auth Rate</p>
                  <p className="text-lg font-bold text-white">94.2%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top dApps */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Top Projects by MAU</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dashboard-border">
                <th className="text-left px-4 py-3 text-dashboard-muted font-medium">#</th>
                <th className="text-left px-4 py-3 text-dashboard-muted font-medium">Project</th>
                <th className="text-right px-4 py-3 text-dashboard-muted font-medium">MAU</th>
                <th className="text-right px-4 py-3 text-dashboard-muted font-medium">Growth</th>
              </tr>
            </thead>
            <tbody>
              {TOP_DAPPS.map((app, i) => (
                <tr key={app.name} className="border-b border-dashboard-border/50 hover:bg-dashboard-border/20">
                  <td className="px-4 py-3 text-dashboard-muted">{i + 1}</td>
                  <td className="px-4 py-3 text-white font-medium">{app.name}</td>
                  <td className="px-4 py-3 text-right text-white">{formatCompact(app.users)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${app.growth > 0 ? "text-dashboard-success" : "text-dashboard-danger"}`}>
                    +{app.growth}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}
