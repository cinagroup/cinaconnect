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
      "# HELP cinacoin_events_total Total events ingested",
      "# TYPE cinacoin_events_total counter",
      `cinacoin_events_total ${this.eventCount}`,
      "",
      "# HELP cinacoin_errors_total Total errors",
      "# TYPE cinacoin_errors_total counter",
      `cinacoin_errors_total ${this.errorCount}`,
      "",
      "# HELP cinacoin_auth_failures_total Authentication failures",
      "# TYPE cinacoin_auth_failures_total counter",
      `cinacoin_auth_failures_total ${this.authFailures}`,
      "",
      "# HELP cinacoin_rate_limited_total Rate limited requests",
      "# TYPE cinacoin_rate_limited_total counter",
      `cinacoin_rate_limited_total ${this.rateLimited}`,
      "",
      "# HELP cinacoin_duplicates_removed_total Duplicate events removed",
      "# TYPE cinacoin_duplicates_removed_total counter",
      `cinacoin_duplicates_removed_total ${this.dedupedCount}`,
      "",
      "# HELP cinacoin_avg_latency_ms Average ingestion latency in ms",
      "# TYPE cinacoin_avg_latency_ms gauge",
      `cinacoin_avg_latency_ms ${this.eventCount > 0 ? Math.round(this.totalLatency / this.eventCount) : 0}`,
      "",
      "# HELP cinacoin_uptime_seconds Uptime in seconds",
      "# TYPE cinacoin_uptime_seconds gauge",
      `cinacoin_uptime_seconds ${Math.round((Date.now() - this.startTime) / 1000)}`,
      "",
    ];
    return lines.join("\n");
  }
}
