"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  checkAllServices,
  saveToHistory,
  getHistory,
  loadHistoryUptimes,
  calculateOverallStatus,
  formatTime,
  formatDuration,
} from "@/lib/health-check";
import { ServiceCheck, ServiceConfig, ServiceStatus, HistoryEntry } from "@/types";

// Icons as simple SVG components
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-.994-9.638a9.955 9.955 0 0113.958 3.222M20.015 4.356a9.955 9.955 0 00-13.958-3.222" />
    </svg>
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const config = {
    healthy: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Operational" },
    degraded: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", label: "Degraded" },
    down: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "Down" },
    unknown: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20", label: "Unknown" },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {status === "healthy" && <CheckIcon className="w-3 h-3" />}
      {status === "degraded" && <WarningIcon className="w-3 h-3" />}
      {status === "down" && <ErrorIcon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

function UptimeBadge({ uptime }: { uptime: number }) {
  const color = uptime >= 99.9 ? "text-emerald-400" : uptime >= 99 ? "text-yellow-400" : "text-red-400";
  return (
    <span className={`text-xs font-mono ${color}`}>
      {uptime.toFixed(1)}%
    </span>
  );
}

function ServiceCard({ service }: { service: ServiceCheck }) {
  const statusColor = {
    healthy: "border-l-emerald-500",
    degraded: "border-l-yellow-500",
    down: "border-l-red-500",
    unknown: "border-l-gray-500",
  }[service.status];

  return (
    <div className={`animate-fade-in bg-[var(--bg-card)] rounded-lg border border-[var(--border)] border-l-4 ${statusColor} p-5 hover:bg-[var(--bg-card-hover)] transition-colors`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{service.name}</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-3">{service.description}</p>
        </div>
        <StatusBadge status={service.status} />
      </div>
      <div className="flex items-center gap-6 mt-4 text-sm">
        <div>
          <span className="text-[var(--text-secondary)]">Response Time</span>
          <p className={`font-mono text-sm mt-0.5 ${service.responseTime !== null && service.responseTime < 1000 ? "text-emerald-400" : service.responseTime !== null && service.responseTime < 3000 ? "text-yellow-400" : "text-red-400"}`}>
            {formatDuration(service.responseTime)}
          </p>
        </div>
        <div>
          <span className="text-[var(--text-secondary)]">Uptime</span>
          <p className="mt-0.5"><UptimeBadge uptime={service.uptime} /></p>
        </div>
        <div>
          <span className="text-[var(--text-secondary)]">Last Check</span>
          <p className="font-mono text-sm text-[var(--text-secondary)] mt-0.5">{formatTime(service.lastChecked)}</p>
        </div>
      </div>
      {service.error && (
        <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 font-mono">
          Error: {service.error}
        </div>
      )}
    </div>
  );
}

function HistoryChart({ history, services }: { history: HistoryEntry[]; services: string[] }) {
  if (history.length < 2) return null;

  const recent = history.slice(-48); // Show last 48 entries (4h at 5-min intervals)

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-5 animate-fade-in">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Health History (Last ~4 Hours)</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {services.map((serviceName) => {
          const serviceData = recent.map((entry) => {
            const found = entry.services.find((s) => s.name === serviceName);
            return found?.status || "unknown";
          });

          const statusDot = (status: string) => {
            if (status === "healthy") return "bg-emerald-500";
            if (status === "degraded") return "bg-yellow-500";
            if (status === "down") return "bg-red-500";
            return "bg-gray-600";
          };

          return (
            <div key={serviceName} className="flex flex-col items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)] truncate max-w-[80px]">{serviceName}</span>
              <div className="flex gap-0.5">
                {serviceData.map((status, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-4 rounded-sm ${statusDot(status)}`}
                    title={`${serviceName}: ${status}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Operational</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500" /> Degraded</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Down</span>
      </div>
    </div>
  );
}

export default function HealthStatusPage() {
  const [services, setServices] = useState<ServiceCheck[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<ServiceStatus>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configs, setConfigs] = useState<ServiceConfig[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const serviceConfigRef = useRef<ServiceConfig[]>([]);

  const runChecks = useCallback(async () => {
    const configs = serviceConfigRef.current;
    if (configs.length === 0) return;

    setRefreshing(true);
    setError(null);
    try {
      const checks = await checkAllServices(configs);

      // Load history and compute uptimes
      const hist = getHistory();
      const uptimes = loadHistoryUptimes(configs, hist);
      const updated = checks.map((c) => ({
        ...c,
        uptime: uptimes.get(c.name) ?? 99,
      }));

      saveToHistory(updated);
      setServices(updated);
      setHistory([...hist, {
        timestamp: new Date().toISOString(),
        services: updated.map((s) => ({ name: s.name, status: s.status, responseTime: s.responseTime })),
      }].slice(-288));
      setOverallStatus(calculateOverallStatus(updated));
      setLastRefresh(new Date().toISOString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Load service configuration
  useEffect(() => {
    let mounted = true;
    fetch("/service-status.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        serviceConfigRef.current = data.services;
        setConfigs(data.services);
        setConfigLoaded(true);
        // Load existing history
        const hist = getHistory();
        setHistory(hist);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(`Failed to load service configuration: ${err.message}`);
        setConfigLoaded(true);
      });
    return () => { mounted = false; };
  }, []);

  // Run initial check
  useEffect(() => {
    if (configLoaded && configs.length > 0) {
      runChecks();
    }
  }, [configLoaded, configs, runChecks]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(runChecks, 300000); // 5 minutes
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, runChecks]);

  const overallConfig = {
    healthy: { gradient: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", icon: "text-emerald-400", label: "All Systems Operational" },
    degraded: { gradient: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", icon: "text-yellow-400", label: "Some Systems Degraded" },
    down: { gradient: "from-red-500/20 to-red-500/5", border: "border-red-500/30", icon: "text-red-400", label: "System Outage" },
    unknown: { gradient: "from-gray-500/20 to-gray-500/5", border: "border-gray-500/30", icon: "text-gray-400", label: "Status Unknown" },
  }[overallStatus];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">CinaCoin</h1>
              <p className="text-[var(--text-secondary)] text-sm mt-1">Service Status</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  autoRefresh
                    ? "bg-[var(--blue-bg)] border-blue-500/30 text-blue-400"
                    : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-blue-400 animate-pulse-dot" : "bg-gray-600"}`} />
                Auto-refresh
              </button>
              {/* Manual refresh */}
              <button
                onClick={runChecks}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors disabled:opacity-50"
              >
                <RefreshIcon spinning={refreshing} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {/* Overall Status */}
        <div className={`mb-8 rounded-xl border ${overallConfig.border} bg-gradient-to-r ${overallConfig.gradient} p-6 animate-fade-in`}>
          <div className="flex items-center gap-3">
            {overallStatus === "healthy" && <CheckIcon className={`w-6 h-6 ${overallConfig.icon}`} />}
            {overallStatus === "degraded" && <WarningIcon className={`w-6 h-6 ${overallConfig.icon}`} />}
            {overallStatus === "down" && <ErrorIcon className={`w-6 h-6 ${overallConfig.icon}`} />}
            {overallStatus === "unknown" && <span className={`w-6 h-6 rounded-full border-2 border-current ${overallConfig.icon}`} />}
            <div>
              <h2 className={`text-lg font-semibold ${overallConfig.icon}`}>{overallConfig.label}</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {lastRefresh ? `Last checked at ${formatTime(lastRefresh)}` : "Checking..."}
                {refreshing && " (refreshing)"}
              </p>
            </div>
            {refreshing && (
              <div className="ml-auto flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                <RefreshIcon spinning />
              </div>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Service Cards */}
        <div className="space-y-4 mb-8">
          {!configLoaded ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <RefreshIcon spinning />
              <p className="mt-4">Loading service configuration...</p>
            </div>
          ) : (
            services.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))
          )}
        </div>

        {/* History Chart */}
        {history.length >= 2 && (
          <div className="mb-8">
            <HistoryChart history={history} services={configs.map((c) => c.name)} />
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-[var(--text-secondary)] pt-4 border-t border-[var(--border)]">
          <p>Health checks run client-side every 5 minutes. Last updated: {lastRefresh ? formatTime(lastRefresh) : "—"}</p>
          <p className="mt-1">
            Powered by CinaCoin — <a href="https://cinacoin.dev" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">cinacoin.dev</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
