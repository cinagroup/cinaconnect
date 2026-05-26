export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ServiceCheck {
  name: string;
  url: string;
  description: string;
  status: ServiceStatus;
  responseTime: number | null; // ms
  lastChecked: string | null; // ISO timestamp
  uptime: number; // percentage 0-100
  error?: string;
}

export interface ServiceConfig {
  name: string;
  url: string;
  description: string;
}

export interface ServiceStatusData {
  updatedAt: string;
  services: ServiceConfig[];
}

export interface HistoryEntry {
  timestamp: string;
  services: {
    name: string;
    status: ServiceStatus;
    responseTime: number | null;
  }[];
}

export interface AppState {
  services: ServiceCheck[];
  history: HistoryEntry[];
  lastRefresh: string | null;
  autoRefresh: boolean;
  refreshing: boolean;
  overallStatus: ServiceStatus;
}
