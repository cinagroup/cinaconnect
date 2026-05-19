"use client";

import { useState, useEffect } from "react";
import { generateDemoMetrics, ServiceMetrics } from "@/lib/services";
import { formatNumber, formatLatency } from "@/lib/utils";
import MetricBox from "@/components/MetricBox";
import BarChart from "@/components/BarChart";

const THROUGHPUT_HISTORY = [7200, 8100, 7800, 9200, 8534, 9100, 8800, 9400, 8200, 7600, 8900, 8534];
const THROUGHPUT_LABELS = [
  "00:00", "02:00", "04:00", "06:00", "08:00", "10:00",
  "12:00", "14:00", "16:00", "18:00", "20:00", "22:00",
];

export default function RelayServerPage() {
  const [metrics, setMetrics] = useState<ServiceMetrics>(generateDemoMetrics("relay-server"));

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(generateDemoMetrics("relay-server"));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">📡 Relay Server</h1>
        <p className="text-dashboard-muted mt-1">WebSocket relay via Durable Objects</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Active Connections" value={formatNumber(metrics.activeConnections || 0)} color="text-cyan-400" />
        <MetricBox label="Throughput" value={`${formatNumber(metrics.throughput || 0)} msg/s`} />
        <MetricBox label="Total Requests" value={formatNumber(metrics.totalRequests || 0)} />
        <MetricBox label="Error Rate" value={`${metrics.errorRate?.toFixed(2) || 0}%`} color="text-dashboard-success" />
      </div>

      {/* Throughput chart */}
      <BarChart data={THROUGHPUT_HISTORY} labels={THROUGHPUT_LABELS} color="#06b6d4" height={140} />

      {/* Durable Objects status */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Durable Objects Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBox label="Active DOs" value="89" icon="🏗️" />
          <MetricBox label="Avg DO Latency" value="3ms" icon="⚡" />
          <MetricBox label="DO Errors (24h)" value="2" icon="⚠️" color="text-dashboard-success" />
          <MetricBox label="WebSocket Uptime" value="99.97%" icon="🟢" color="text-dashboard-success" />
        </div>
      </div>

      {/* Connection details */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Connection Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: "Ethereum Mainnet", count: 520, color: "#627eea" },
            { label: "Polygon", count: 380, color: "#8247e5" },
            { label: "Arbitrum", count: 197, color: "#28a0f0" },
            { label: "Optimism", count: 98, color: "#ff0420" },
            { label: "Other", count: 52, color: "#6b7280" },
          ].map((chain, i) => {
            const total = metrics.activeConnections || 1247;
            const pct = ((chain.count / total) * 100).toFixed(1);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-dashboard-muted w-36">{chain.label}</span>
                <div className="flex-1 bg-dashboard-border rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: chain.color }}
                  />
                </div>
                <span className="text-sm text-white w-12 text-right">{chain.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
