"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SERVICES, ServiceDefinition, HealthCheck, ServiceMetrics, checkHealth, generateDemoMetrics } from "@/lib/services";
import { formatNumber, formatLatency, statusColor } from "@/lib/utils";
import ServiceCard from "@/components/ServiceCard";
import MetricBox from "@/components/MetricBox";
import BarChart from "@/components/BarChart";

// Simulated 7-day request history for overview
const HISTORY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HISTORY_DATA = [142000, 158000, 171000, 163000, 189000, 98000, 112000];

function useHealthChecks() {
  const [health, setHealth] = useState<Record<string, HealthCheck>>({});
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    const runChecks = async () => {
      const results: Record<string, HealthCheck> = {};
      for (const svc of SERVICES) {
        results[svc.id] = await checkHealth(svc.id);
      }
      setHealth(results);

      // If all services are down, enable demo mode
      const allDown = SERVICES.every((s) => results[s.id]?.status === "down");
      if (allDown) {
        setDemoMode(true);
      }
    };

    runChecks();
    const interval = setInterval(runChecks, 30000);
    return () => clearInterval(interval);
  }, []);

  return { health, demoMode };
}

export default function OverviewPage() {
  const { health, demoMode } = useHealthChecks();

  // Compute aggregate stats
  const totalRequests = SERVICES.reduce((sum, s) => {
    const metrics = demoMode ? generateDemoMetrics(s.id) : null;
    return sum + (metrics?.totalRequests || 0);
  }, 0);

  const totalErrors = SERVICES.reduce((sum, s) => {
    const metrics = demoMode ? generateDemoMetrics(s.id) : null;
    return sum + (metrics?.errorCount || 0);
  }, 0);

  const avgErrorRate = SERVICES.reduce((sum, s) => {
    const metrics = demoMode ? generateDemoMetrics(s.id) : null;
    return sum + (metrics?.errorRate || 0);
  }, 0) / SERVICES.length;

  const healthyCount = Object.values(health).filter(
    (h) => h.status === "healthy"
  ).length;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Service Overview</h1>
          <p className="text-dashboard-muted mt-1">
            {demoMode ? "Demo Mode — Simulated metrics" : "Live monitoring of Cloudflare Workers"}
          </p>
        </div>
        <Link
          href="/settings"
          className="px-4 py-2 text-sm bg-dashboard-surface border border-dashboard-border rounded-lg text-dashboard-muted hover:text-white hover:border-dashboard-primary transition-colors"
        >
          ⚙️ Settings
        </Link>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Total Services" value={`${healthyCount}/${SERVICES.length}`} icon="📊" color="text-dashboard-primaryLight" />
        <MetricBox label="Total Requests" value={formatNumber(totalRequests)} icon="📈" />
        <MetricBox label="Total Errors" value={formatNumber(totalErrors)} icon="⚠️" color={totalErrors > 10000 ? "text-dashboard-danger" : "text-dashboard-warning"} />
        <MetricBox label="Avg Error Rate" value={`${avgErrorRate.toFixed(2)}%`} icon="📉" color={avgErrorRate > 1 ? "text-dashboard-danger" : "text-dashboard-success"} />
      </div>

      {/* 7-day request chart */}
      <BarChart data={HISTORY_DATA} labels={HISTORY_DAYS} color="#6366f1" height={140} />

      {/* Service status cards */}
      <h2 className="text-lg font-semibold text-white mt-6">Service Status</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => (
          <Link key={service.id} href={`/${service.id}`}>
            <ServiceCard
              service={service}
              health={health[service.id] || { status: "unknown", latency: null, lastChecked: Date.now() }}
              demoMode={demoMode}
            />
          </Link>
        ))}
      </div>

      {/* Service summary table */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dashboard-border">
              <th className="text-left px-4 py-3 text-dashboard-muted font-medium">Service</th>
              <th className="text-left px-4 py-3 text-dashboard-muted font-medium">Status</th>
              <th className="text-right px-4 py-3 text-dashboard-muted font-medium">Requests</th>
              <th className="text-right px-4 py-3 text-dashboard-muted font-medium">Error Rate</th>
              <th className="text-right px-4 py-3 text-dashboard-muted font-medium">Avg Latency</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((service) => {
              const metrics = demoMode ? generateDemoMetrics(service.id) : null;
              const h = health[service.id] || { status: "unknown", latency: null, lastChecked: 0 };
              return (
                <tr key={service.id} className="border-b border-dashboard-border/50 hover:bg-dashboard-border/20">
                  <td className="px-4 py-3 text-white">
                    <span className="mr-2">{service.icon}</span>
                    {service.name}
                  </td>
                  <td className={`px-4 py-3 font-medium ${statusColor(h.status)}`}>
                    {h.status}
                  </td>
                  <td className="px-4 py-3 text-right text-white">{metrics ? formatNumber(metrics.totalRequests || 0) : "—"}</td>
                  <td className="px-4 py-3 text-right text-white">{metrics ? `${metrics.errorRate?.toFixed(2) || 0}%` : "—"}</td>
                  <td className="px-4 py-3 text-right text-white">
                    {metrics ? formatLatency(metrics.avgLatency || 0) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
