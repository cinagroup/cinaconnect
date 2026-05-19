export function statusColor(status: string): string {
  switch (status) {
    case "healthy":
      return "text-dashboard-success";
    case "degraded":
      return "text-dashboard-warning";
    case "down":
      return "text-dashboard-danger";
    default:
      return "text-dashboard-muted";
  }
}

export function statusBg(status: string): string {
  switch (status) {
    case "healthy":
      return "bg-dashboard-success/10 border-dashboard-success/30";
    case "degraded":
      return "bg-dashboard-warning/10 border-dashboard-warning/30";
    case "down":
      return "bg-dashboard-danger/10 border-dashboard-danger/30";
    default:
      return "bg-dashboard-muted/10 border-dashboard-muted/30";
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}
