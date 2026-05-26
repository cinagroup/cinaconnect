import { describe, it, expect } from "vitest";
import { PrometheusMetrics } from "../src/metrics.js";

describe("PrometheusMetrics", () => {
  it("records event ingestion", () => {
    const m = new PrometheusMetrics();
    m.recordEventIngestion(10, 50);
    m.recordEventIngestion(5, 30);
    expect(m.render()).toContain("cinaconnect_events_total 15");
  });

  it("calculates average latency", () => {
    const m = new PrometheusMetrics();
    m.recordEventIngestion(2, 100);
    m.recordEventIngestion(2, 200);
    const rendered = m.render();
    expect(rendered).toContain("cinaconnect_avg_latency_ms 150");
  });

  it("records auth failures", () => {
    const m = new PrometheusMetrics();
    m.recordAuthFailure();
    m.recordAuthFailure();
    m.recordAuthFailure();
    expect(m.render()).toContain("cinaconnect_auth_failures_total 3");
  });

  it("records rate limiting", () => {
    const m = new PrometheusMetrics();
    m.recordRateLimit();
    expect(m.render()).toContain("cinaconnect_rate_limited_total 1");
  });

  it("records deduplication", () => {
    const m = new PrometheusMetrics();
    m.recordDeduplication(100, 85); // 15 duplicates removed
    expect(m.render()).toContain("cinaconnect_duplicates_removed_total 15");
  });

  it("reports uptime", () => {
    const m = new PrometheusMetrics();
    expect(m.uptime()).toMatch(/^\d+s$/);
    expect(m.render()).toContain("cinaconnect_uptime_seconds");
  });

  it("renders all metric lines", () => {
    const m = new PrometheusMetrics();
    m.recordEventIngestion(1, 10);
    const text = m.render();
    expect(text).toContain("# TYPE cinaconnect_events_total counter");
    expect(text).toContain("# TYPE cinaconnect_errors_total counter");
    expect(text).toContain("# TYPE cinaconnect_auth_failures_total counter");
    expect(text).toContain("# TYPE cinaconnect_rate_limited_total counter");
    expect(text).toContain("# TYPE cinaconnect_duplicates_removed_total counter");
    expect(text).toContain("# TYPE cinaconnect_avg_latency_ms gauge");
    expect(text).toContain("# TYPE cinaconnect_uptime_seconds gauge");
  });
});
