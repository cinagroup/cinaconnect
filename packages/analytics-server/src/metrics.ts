/**
 * Prometheus-style metrics
 * Tracks event ingestion rates, latencies, errors
 */

export class PrometheusMetrics {
  private eventCount: number = 0;
  private errorCount: number = 0;
  private authFailures: number = 0;
  private rateLimited: number = 0;
  private dedupedCount: number = 0;
  private totalLatency: number = 0;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  recordEventIngestion(count: number, latencyMs: number) {
    this.eventCount += count;
    this.totalLatency += latencyMs;
  }

  recordError() {
    this.errorCount++;
  }

  recordAuthFailure() {
    this.authFailures++;
  }

  recordRateLimit() {
    this.rateLimited++;
  }

  recordDeduplication(total: number, after: number) {
    this.dedupedCount += total - after;
  }

  uptime(): string {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    if (mins > 0) return `${mins}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Render metrics in Prometheus text exposition format.
   */
  render(): string {
    const lines = [
      "# HELP cinaconnect_events_total Total events ingested",
      "# TYPE cinaconnect_events_total counter",
      `cinaconnect_events_total ${this.eventCount}`,
      "",
      "# HELP cinaconnect_errors_total Total errors",
      "# TYPE cinaconnect_errors_total counter",
      `cinaconnect_errors_total ${this.errorCount}`,
      "",
      "# HELP cinaconnect_auth_failures_total Authentication failures",
      "# TYPE cinaconnect_auth_failures_total counter",
      `cinaconnect_auth_failures_total ${this.authFailures}`,
      "",
      "# HELP cinaconnect_rate_limited_total Rate limited requests",
      "# TYPE cinaconnect_rate_limited_total counter",
      `cinaconnect_rate_limited_total ${this.rateLimited}`,
      "",
      "# HELP cinaconnect_duplicates_removed_total Duplicate events removed",
      "# TYPE cinaconnect_duplicates_removed_total counter",
      `cinaconnect_duplicates_removed_total ${this.dedupedCount}`,
      "",
      "# HELP cinaconnect_avg_latency_ms Average ingestion latency in ms",
      "# TYPE cinaconnect_avg_latency_ms gauge",
      `cinaconnect_avg_latency_ms ${this.eventCount > 0 ? Math.round(this.totalLatency / this.eventCount) : 0}`,
      "",
      "# HELP cinaconnect_uptime_seconds Uptime in seconds",
      "# TYPE cinaconnect_uptime_seconds gauge",
      `cinaconnect_uptime_seconds ${Math.round((Date.now() - this.startTime) / 1000)}`,
      "",
    ];
    return lines.join("\n");
  }
}
