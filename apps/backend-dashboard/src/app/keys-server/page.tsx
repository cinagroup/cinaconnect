"use client";

import { useState, useEffect } from "react";
import { generateDemoMetrics, ServiceMetrics } from "@/lib/services";
import { formatNumber, formatLatency, formatBytes } from "@/lib/utils";
import MetricBox from "@/components/MetricBox";
import BarChart from "@/components/BarChart";
import ProgressRing from "@/components/ProgressRing";

const SESSION_HISTORY = [2800, 3200, 3500, 3100, 3800, 4100, 3900];
const SESSION_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function KeysServerPage() {
  const [metrics, setMetrics] = useState<ServiceMetrics>(generateDemoMetrics("keys-server"));

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(generateDemoMetrics("keys-server"));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const storagePct = metrics.storageUsed && metrics.storageLimit
    ? Math.round((metrics.storageUsed / metrics.storageLimit) * 100)
    : 24;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🔑 Keys Server</h1>
        <p className="text-dashboard-muted mt-1">Session key management with D1 storage</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Active Sessions" value={formatNumber(metrics.activeSessions || 0)} color="text-dashboard-primaryLight" />
        <MetricBox label="Total Requests" value={formatNumber(metrics.totalRequests || 0)} />
        <MetricBox label="Avg Latency" value={formatLatency(metrics.avgLatency || 0)} />
        <MetricBox label="Error Rate" value={`${metrics.errorRate?.toFixed(2) || 0}%`} color={metrics.errorRate! > 0.5 ? "text-dashboard-danger" : "text-dashboard-success"} />
      </div>

      {/* Storage */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">D1 Storage Usage</h3>
        <div className="flex items-center justify-center gap-8">
          <ProgressRing
            value={storagePct}
            size={120}
            strokeWidth={10}
            color={storagePct > 80 ? "#ef4444" : storagePct > 60 ? "#f59e0b" : "#22c55e"}
            label="Used"
          />
          <div className="space-y-3">
            <div>
              <p className="text-sm text-dashboard-muted">Used Space</p>
              <p className="text-xl font-bold text-white">{formatBytes(metrics.storageUsed || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-dashboard-muted">Total Capacity</p>
              <p className="text-xl font-bold text-white">{formatBytes(metrics.storageLimit || 10_000_000_000)}</p>
            </div>
            <div>
              <p className="text-sm text-dashboard-muted">Available</p>
              <p className="text-xl font-bold text-dashboard-success">
                {formatBytes((metrics.storageLimit || 10_000_000_000) - (metrics.storageUsed || 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Session history chart */}
      <BarChart data={SESSION_HISTORY} labels={SESSION_LABELS} color="#8b5cf6" height={140} />

      {/* Session details */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Session Details</h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricBox label="New Sessions (24h)" value="1,247" icon="🆕" />
          <MetricBox label="Expired Sessions" value="892" icon="⏰" />
          <MetricBox label="Revoked Sessions" value="23" icon="🚫" />
        </div>
      </div>
    </div>
  );
}
