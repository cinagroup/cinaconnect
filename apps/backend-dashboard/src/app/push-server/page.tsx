"use client";

import { useState, useEffect } from "react";
import { generateDemoMetrics, ServiceMetrics } from "@/lib/services";
import { formatNumber, formatLatency } from "@/lib/utils";
import MetricBox from "@/components/MetricBox";
import BarChart from "@/components/BarChart";
import ProgressRing from "@/components/ProgressRing";

const TOKEN_HISTORY = [45000, 47200, 48900, 50100, 51200, 52100, 52890];
const TOKEN_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PushServerPage() {
  const [metrics, setMetrics] = useState<ServiceMetrics>(generateDemoMetrics("push-server"));

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(generateDemoMetrics("push-server"));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">📱 Push Server</h1>
        <p className="text-dashboard-muted mt-1">Push notification delivery</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Device Tokens" value={formatNumber(metrics.deviceTokens || 0)} color="text-emerald-400" />
        <MetricBox label="Delivery Success" value={formatNumber(metrics.deliverySuccess || 0)} color="text-dashboard-success" />
        <MetricBox label="Delivery Failed" value={formatNumber(metrics.deliveryFailed || 0)} color="text-dashboard-danger" />
        <MetricBox label="Delivery Rate" value={`${metrics.deliveryRate?.toFixed(1) || 0}%`} color="text-dashboard-success" />
      </div>

      {/* Delivery ring */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Delivery Success Rate</h3>
        <div className="flex items-center justify-center gap-8">
          <ProgressRing
            value={Math.round(metrics.deliveryRate || 0)}
            size={120}
            strokeWidth={10}
            color={(metrics.deliveryRate || 0) > 99 ? "#22c55e" : (metrics.deliveryRate || 0) > 95 ? "#f59e0b" : "#ef4444"}
            label="Success"
          />
          <div className="space-y-3">
            <div>
              <p className="text-sm text-dashboard-muted">Successful</p>
              <p className="text-xl font-bold text-dashboard-success">{formatNumber(metrics.deliverySuccess || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-dashboard-muted">Failed</p>
              <p className="text-xl font-bold text-dashboard-danger">{formatNumber(metrics.deliveryFailed || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Token growth chart */}
      <BarChart data={TOKEN_HISTORY} labels={TOKEN_LABELS} color="#22c55e" height={140} />

      {/* Platform breakdown */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Platform Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: "iOS (APNs)", count: 31200, color: "#007aff" },
            { label: "Android (FCM)", count: 18900, color: "#34a853" },
            { label: "Web Push", count: 2790, color: "#f59e0b" },
          ].map((platform, i) => {
            const total = metrics.deviceTokens || 52890;
            const pct = ((platform.count / total) * 100).toFixed(1);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-dashboard-muted w-32">{platform.label}</span>
                <div className="flex-1 bg-dashboard-border rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: platform.color }}
                  />
                </div>
                <span className="text-sm text-white w-16 text-right">{formatNumber(platform.count)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error breakdown */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Error Breakdown (24h)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBox label="Invalid Token" value="1,892" icon="🚫" color="text-dashboard-danger" />
          <MetricBox label="Expired Token" value="987" icon="⏰" color="text-dashboard-warning" />
          <MetricBox label="Rate Limited" value="342" icon="⏱️" color="text-dashboard-warning" />
          <MetricBox label="Network Error" value="200" icon="🌐" color="text-dashboard-muted" />
        </div>
      </div>
    </div>
  );
}
