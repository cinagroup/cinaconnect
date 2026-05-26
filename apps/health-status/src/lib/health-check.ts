import { ServiceStatus, ServiceCheck, ServiceConfig, HistoryEntry } from "@/types";

const HISTORY_KEY = "health-status-history";
const HISTORY_MAX = 288; // 24h at 5-min intervals = 288 entries

export function calculateOverallStatus(services: ServiceCheck[]): ServiceStatus {
  if (services.length === 0) return "unknown";
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  if (services.every((s) => s.status === "healthy")) return "healthy";
  return "unknown";
}

export function estimateUptime(history: HistoryEntry[], serviceName: string): number {
  const serviceHistory = history
    .map((entry) => entry.services.find((s) => s.name === serviceName))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  if (serviceHistory.length === 0) return 100;
  const healthyCount = serviceHistory.filter((s) => s.status === "healthy").length;
  return parseFloat(((healthyCount / serviceHistory.length) * 100).toFixed(1));
}

async function checkService(config: ServiceConfig, timeoutMs: number = 8000): Promise<ServiceCheck> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(config.url, {
      method: "GET",
      signal: controller.signal,
      mode: "cors",
      cache: "no-cache",
    });
    clearTimeout(timer);

    const elapsed = Math.round(performance.now() - start);

    // If CORS blocks us, we can still attempt a no-cors fetch for basic reachability
    if (!response.ok) {
      return {
        name: config.name,
        url: config.url,
        description: config.description,
        status: "degraded",
        responseTime: elapsed,
        lastChecked: new Date().toISOString(),
        uptime: 99,
        error: `HTTP ${response.status}`,
      };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    // Try to parse health status from response
    let status: ServiceStatus = "healthy";
    if (data) {
      if (data.status === "ok" || data.healthy === true || data.status === "healthy") {
        status = "healthy";
      } else if (data.status === "degraded" || data.healthy === "degraded") {
        status = "degraded";
      } else if (data.status === "down" || data.healthy === false) {
        status = "down";
      }
    }

    return {
      name: config.name,
      url: config.url,
      description: config.description,
      status,
      responseTime: elapsed,
      lastChecked: new Date().toISOString(),
      uptime: 99, // will be updated from history
      error: data?.error,
    };
  } catch (err: unknown) {
    const elapsed = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : "Unknown error";

    // If it's a CORS/network error, try a no-cors fetch to at least check reachability
    try {
      const fallbackStart = performance.now();
      const fallbackResp = await fetch(config.url, {
        method: "GET",
        mode: "no-cors",
        cache: "no-cache",
      });
      const fallbackElapsed = Math.round(performance.now() - fallbackStart);
      // If no-cors succeeds, the service is reachable (we just can't read the response)
      return {
        name: config.name,
        url: config.url,
        description: config.description,
        status: "healthy",
        responseTime: fallbackElapsed,
        lastChecked: new Date().toISOString(),
        uptime: 99,
      };
    } catch {
      return {
        name: config.name,
        url: config.url,
        description: config.description,
        status: "down",
        responseTime: elapsed,
        lastChecked: new Date().toISOString(),
        uptime: 0,
        error: message,
      };
    }
  }
}

export async function checkAllServices(services: ServiceConfig[]): Promise<ServiceCheck[]> {
  return Promise.all(services.map((s) => checkService(s)));
}

export function saveToHistory(checks: ServiceCheck[]): void {
  try {
    const existing = getHistory();
    const entry: HistoryEntry = {
      timestamp: new Date().toISOString(),
      services: checks.map((s) => ({
        name: s.name,
        status: s.status,
        responseTime: s.responseTime,
      })),
    };
    const updated = [...existing, entry].slice(-HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage not available
  }
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function loadHistoryUptimes(services: ServiceConfig[], history: HistoryEntry[]): Map<string, number> {
  const uptimes = new Map<string, number>();
  for (const svc of services) {
    uptimes.set(svc.name, estimateUptime(history, svc.name));
  }
  return uptimes;
}

export function formatTime(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
