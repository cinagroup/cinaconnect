"use client";

import { useState, useEffect } from "react";
import { generateDemoMetrics, ServiceMetrics } from "@/lib/services";
import { formatNumber, formatLatency } from "@/lib/utils";
import MetricBox from "@/components/MetricBox";
import BarChart from "@/components/BarChart";
import ProgressRing from "@/components/ProgressRing";

const HISTORY = [142, 168, 155, 189, 201, 178, 195, 210, 188, 223, 198, 245];
const HISTORY_LABELS = [
  "00:00", "02:00", "04:00", "06:00", "08:00", "10:00",
  "12:00", "14:00", "16:00", "18:00", "20:00", "22:00",
];

const CHAIN_DATA = [45000, 38000, 52000, 28000, 15000];
const CHAIN_LABELS = ["Ethereum", "Polygon", "BSC", "Arbitrum", "Optimism"];

export default function RPCProxyPage() {
  const [metrics, setMetrics] = useState<ServiceMetrics>(generateDemoMetrics("rpc-proxy"));

  useEffect(() => {
    // In production, fetch from actual endpoint
    const interval = setInterval(() => {
      setMetrics(generateDemoMetrics("rpc-proxy"));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🔄 RPC Proxy</h1>
        <p className="text-dashboard-muted mt-1">RPC request proxy with KV caching</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Total Requests" value={formatNumber(metrics.totalRequests || 0)} />
        <MetricBox label="Error Rate" value={`${metrics.errorRate?.toFixed(2) || 0}%`} color={metrics.errorRate! > 1 ? "text-dashboard-danger" : "text-dashboard-success"} />
        <MetricBox label="Avg Latency" value={formatLatency(metrics.avgLatency || 0)} />
        <MetricBox label="P99 Latency" value={formatLatency(metrics.p99Latency || 0)} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <BarChart data={HISTORY} labels={HISTORY_LABELS} color="#6366f1" height={140} />
        <BarChart data={CHAIN_DATA} labels={CHAIN_LABELS} color="#8b5cf6" height={140} />
      </div>

      {/* KV Cache info */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">KV Cache Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-dashboard-muted">Cache Hit Rate</p>
            <p className="text-2xl font-bold text-dashboard-success">78.3%</p>
          </div>
          <div>
            <p className="text-sm text-dashboard-muted">Cached Keys</p>
            <p className="text-2xl font-bold text-white">24,891</p>
          </div>
          <div>
            <p className="text-sm text-dashboard-muted">KV Storage Used</p>
            <p className="text-2xl font-bold text-white">1.2 GB</p>
          </div>
        </div>
      </div>

      {/* Chain usage */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Chain Distribution (24h)</h3>
        <div className="space-y-3">
          {CHAIN_DATA.map((val, i) => {
            const total = CHAIN_DATA.reduce((a, b) => a + b, 0);
            const pct = ((val / total) * 100).toFixed(1);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-dashboard-muted w-24">{CHAIN_LABELS[i]}</span>
                <div className="flex-1 bg-dashboard-border rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-dashboard-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-white w-16 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
