// Service definitions for the 5 Cloudflare Workers
export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  healthPath: string;
  metricsPath: string;
  icon: string;
  color: string;
}

export const SERVICES: ServiceDefinition[] = [
  {
    id: "rpc-proxy",
    name: "RPC Proxy",
    description: "RPC request proxy with KV caching",
    healthPath: "/health",
    metricsPath: "/metrics",
    icon: "🔄",
    color: "#6366f1",
  },
  {
    id: "keys-server",
    name: "Keys Server",
    description: "Session key management with D1 storage",
    healthPath: "/health",
    metricsPath: "/metrics",
    icon: "🔑",
    color: "#8b5cf6",
  },
  {
    id: "relay-server",
    name: "Relay Server",
    description: "WebSocket relay via Durable Objects",
    healthPath: "/health",
    metricsPath: "/metrics",
    icon: "📡",
    color: "#06b6d4",
  },
  {
    id: "notify-server",
    name: "Notify Server",
    description: "Notification delivery service",
    healthPath: "/health",
    metricsPath: "/metrics",
    icon: "🔔",
    color: "#f59e0b",
  },
  {
    id: "push-server",
    name: "Push Server",
    description: "Push notification delivery",
    healthPath: "/health",
    metricsPath: "/metrics",
    icon: "📱",
    color: "#22c55e",
  },
];

export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export interface HealthCheck {
  status: ServiceStatus;
  latency: number | null; // ms
  lastChecked: number; // timestamp
  error?: string;
}

export interface ServiceMetrics {
  requestId?: string;
  totalRequests?: number;
  errorCount?: number;
  errorRate?: number;
  avgLatency?: number;
  p99Latency?: number;
  activeConnections?: number;
  activeSessions?: number;
  storageUsed?: number; // bytes
  storageLimit?: number; // bytes
  throughput?: number; // msg/s
  deliveryRate?: number; // %
  deviceTokens?: number;
  deliverySuccess?: number;
  deliveryFailed?: number;
}

// Base URLs for services — these should match your Cloudflare Workers deployments
// Override via environment variable DASHBOARD_SERVICE_BASE_URL or per-service env vars
function getBaseUrl(serviceId: string): string {
  // Per-service override
  const envKey = `SERVICE_URL_${serviceId.toUpperCase().replace(/-/g, "_")}`;
  if (typeof process !== "undefined" && process.env?.[envKey]) {
    return process.env[envKey]!;
  }
  // Generic override
  if (typeof process !== "undefined" && process.env?.DASHBOARD_SERVICE_BASE_URL) {
    const base = process.env.DASHBOARD_SERVICE_BASE_URL;
    return `${base}/${serviceId}`;
  }
  
  // Check if running in production (Cloudflare Pages)
  const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";
  
  if (isProduction) {
    // Production Cloudflare Workers URLs
    const productionUrls: Record<string, string> = {
      "rpc-proxy": "https://cinaconnect-rpc-proxy.cinagroup.workers.dev",
      "keys-server": "https://cinaconnect-keys-server.cinagroup.workers.dev",
      "relay-server": "https://cinaconnect-relay-server.cinagroup.workers.dev",
      "notify-server": "https://cinaconnect-notify-server.cinagroup.workers.dev",
      "push-server": "https://cinaconnect-push-server.cinagroup.workers.dev",
    };
    return productionUrls[serviceId] || `https://cinaconnect-${serviceId}.cinagroup.workers.dev`;
  }
  
  // Default: localhost dev URLs
  const defaults: Record<string, string> = {
    "rpc-proxy": "http://localhost:8787",
    "keys-server": "http://localhost:8788",
    "relay-server": "http://localhost:8789",
    "notify-server": "http://localhost:8790",
    "push-server": "http://localhost:8791",
  };
  return defaults[serviceId] || `http://localhost:8787/${serviceId}`;
}

export async function checkHealth(
  serviceId: string
): Promise<HealthCheck> {
  const service = SERVICES.find((s) => s.id === serviceId);
  if (!service) {
    return { status: "unknown", latency: null, lastChecked: Date.now(), error: "Unknown service" };
  }

  const baseUrl = getBaseUrl(serviceId);
  const url = `${baseUrl}${service.healthPath}`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;

    if (response.ok) {
      return { status: "healthy", latency, lastChecked: Date.now() };
    } else if (response.status >= 500) {
      return { status: "degraded", latency, lastChecked: Date.now(), error: `HTTP ${response.status}` };
    } else {
      return { status: "degraded", latency, lastChecked: Date.now(), error: `HTTP ${response.status}` };
    }
  } catch (err: any) {
    const latency = Date.now() - start;
    return {
      status: "down",
      latency: err.name === "AbortError" ? null : latency,
      lastChecked: Date.now(),
      error: err.message || "Connection failed",
    };
  }
}

export async function fetchMetrics(
  serviceId: string
): Promise<ServiceMetrics | null> {
  const service = SERVICES.find((s) => s.id === serviceId);
  if (!service) return null;

  const baseUrl = getBaseUrl(serviceId);
  const url = `${baseUrl}${service.metricsPath}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (response.ok) {
      return response.json() as Promise<ServiceMetrics>;
    }
    return null;
  } catch {
    return null;
  }
}

// Simulated metrics for demo mode (when real endpoints aren't available)
export function generateDemoMetrics(serviceId: string): ServiceMetrics {
  const base = (() => {
    switch (serviceId) {
      case "rpc-proxy":
        return {
          totalRequests: 1284567,
          errorCount: 2341,
          errorRate: 0.18,
          avgLatency: 45,
          p99Latency: 189,
        };
      case "keys-server":
        return {
          activeSessions: 3842,
          storageUsed: 2_400_000_000,
          storageLimit: 10_000_000_000,
          totalRequests: 892341,
          errorCount: 1023,
          errorRate: 0.11,
          avgLatency: 12,
          p99Latency: 67,
        };
      case "relay-server":
        return {
          activeConnections: 1247,
          throughput: 8534,
          totalRequests: 4521890,
          errorCount: 892,
          errorRate: 0.02,
          avgLatency: 8,
          p99Latency: 34,
        };
      case "notify-server":
        return {
          totalRequests: 345678,
          deliveryRate: 98.7,
          errorCount: 4521,
          errorRate: 1.31,
          avgLatency: 230,
          p99Latency: 890,
        };
      case "push-server":
        return {
          deviceTokens: 52890,
          deliverySuccess: 498721,
          deliveryFailed: 3421,
          deliveryRate: 99.3,
          totalRequests: 502142,
          errorCount: 3421,
          errorRate: 0.68,
          avgLatency: 180,
          p99Latency: 620,
        };
      default:
        return {};
    }
  })();

  return base as ServiceMetrics;
}
