"use client";

import { useState, useEffect } from "react";
import { generateDemoMetrics, ServiceMetrics } from "@/lib/services";
import { formatNumber, formatLatency } from "@/lib/utils";
import MetricBox from "@/components/MetricBox";
import BarChart from "@/components/BarChart";
import ProgressRing from "@/components/ProgressRing";

const SENT_HISTORY = [28000, 31000, 29500, 34000, 36000, 22000, 19000];
const SENT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function NotifyServerPage() {
  const [metrics, setMetrics] = useState<ServiceMetrics>(generateDemoMetrics("notify-server"));

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(generateDemoMetrics("notify-server"));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🔔 Notify Server</h1>
        <p className="text-dashboard-muted mt-1">Notification delivery service</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Total Sent" value={formatNumber(metrics.totalRequests || 0)} />
        <MetricBox label="Delivery Rate" value={`${metrics.deliveryRate?.toFixed(1) || 0}%`} color="text-dashboard-success" />
        <MetricBox label="Avg Latency" value={formatLatency(metrics.avgLatency || 0)} />
        <MetricBox label="Error Count" value={formatNumber(metrics.errorCount || 0)} color={metrics.errorRate! > 2 ? "text-dashboard-danger" : "text-dashboard-warning"} />
      </div>

      {/* Delivery ring */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Delivery Performance</h3>
        <div className="flex items-center justify-center gap-8">
          <ProgressRing
            value={Math.round(metrics.deliveryRate || 0)}
            size={120}
            strokeWidth={10}
            color={(metrics.deliveryRate || 0) > 98 ? "#22c55e" : (metrics.deliveryRate || 0) > 95 ? "#f59e0b" : "#ef4444"}
            label="Delivered"
          />
          <div className="space-y-3">
            <div>
              <p className="text-sm text-dashboard-muted">Successfully DeliveredRate</p>
              <p className="text-xl font-bold text-dashboard-success">{metrics.deliveryRate?.toFixed(1) || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-dashboard-muted">Failed Delivery</p>
              <p className="text-xl font-bold text-dashboard-danger">{formatNumber(metrics.errorCount || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sent chart */}
      <BarChart data={SENT_HISTORY} labels={SENT_LABELS} color="#f59e0b" height={140} />

      {/* Notification channels */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Notification Channels</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBox label="Email" value="142K" icon="📧" />
          <MetricBox label="Web Push" value="98K" icon="🌐" />
          <MetricBox label="Webhook" value="76K" icon="🔗" />
          <MetricBox label="SMS" value="29K" icon="📱" />
        </div>
      </div>
    </div>
  );
}
