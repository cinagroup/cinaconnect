/**
 * Cinacoin Analytics Ingestion Server
 * Cloudflare Worker for collecting analytics events
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { EventValidator } from "./validator.js";
import { RateLimiter } from "./rate-limiter.js";
import { GdprAnonymizer } from "./anonymizer.js";
import { EventDeduplicator } from "./deduplicator.js";
import { EventBatcher } from "./batcher.js";
import { PrometheusMetrics } from "./metrics.js";

export interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  DEDUP_KV: KVNamespace;
  API_KEY: string;
  RATE_LIMIT?: string;
  RATE_WINDOW?: string;
  BATCH_SIZE?: string;
  GDPR_ANONYMIZE?: string;
}

// Hono app
const app = new Hono<{ Bindings: Env }>();
app.use("/*", cors({
  origin: ["*"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  maxAge: 86400,
}));

const metrics = new PrometheusMetrics();

/**
 * POST /v1/events — Batch event ingestion
 */
app.post("/v1/events", async (c) => {
  const startTime = Date.now();

  // Auth check
  const apiKey = c.req.header("X-API-Key") || c.req.header("Authorization")?.replace("Bearer ", "");
  if (c.env.API_KEY && apiKey !== c.env.API_KEY) {
    metrics.recordAuthFailure();
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Parse body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Normalize to array
  const events = Array.isArray(body) ? body : (body && typeof body === "object" && "events" in body ? (body as { events: unknown[] }).events : [body]);

  if (!Array.isArray(events) || events.length === 0) {
    return c.json({ error: "Expected array of events" }, 400);
  }

  // Rate limiting per app_id
  const rateLimit = parseInt(c.env.RATE_LIMIT ?? "1000", 10);
  const rateWindow = parseInt(c.env.RATE_WINDOW ?? "3600", 10);
  const rateLimiter = new RateLimiter(c.env.RATE_LIMIT_KV, rateLimit, rateWindow);

  const appIds = new Set(events.map((e: any) => e?.appId ?? "default"));
  for (const appId of appIds) {
    const limited = await rateLimiter.isLimited(appId);
    if (limited) {
      metrics.recordRateLimit();
      return c.json({ error: "Rate limit exceeded", retryAfter: rateWindow }, 429);
    }
  }

  // Validate events
  const validEvents: any[] = [];
  const validationErrors: string[] = [];
  for (const event of events) {
    const result = EventValidator.validate(event);
    if (result.valid) {
      validEvents.push(result.event);
    } else {
      validationErrors.push(result.error!);
    }
  }

  if (validEvents.length === 0) {
    return c.json({ error: "No valid events", details: validationErrors }, 400);
  }

  // Deduplicate
  const deduplicator = new EventDeduplicator(c.env.DEDUP_KV);
  const deduped = await deduplicator.filterDuplicates(validEvents);
  metrics.recordDeduplication(validEvents.length, deduped.length);

  // GDPR Anonymization
  const anonymize = c.env.GDPR_ANONYMIZE !== "false";
  const processedEvents = anonymize
    ? deduped.map((e) => GdprAnonymizer.anonymize(e, c))
    : deduped;

  // Batch insert to D1
  const batchSize = parseInt(c.env.BATCH_SIZE ?? "100", 10);
  const batcher = new EventBatcher(c.env.DB, batchSize);
  const inserted = await batcher.insert(processedEvents);

  const duration = Date.now() - startTime;
  metrics.recordEventIngestion(inserted, duration);

  return c.json({
    accepted: inserted,
    rejected: events.length - inserted,
    duplicates: validEvents.length - deduped.length,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
  }, 202);
});

/**
 * GET /v1/health — Health check
 */
app.get("/v1/health", async (c) => {
  const start = Date.now();
  let dbOk = false;
  try {
    await c.env.DB.prepare("SELECT 1").run();
    dbOk = true;
  } catch {
    // DB not yet configured
  }

  const latency = Date.now() - start;

  return c.json({
    status: "ok",
    timestamp: Date.now(),
    latency: `${latency}ms`,
    database: dbOk ? "connected" : "not_configured",
    version: "0.1.0",
    uptime: metrics.uptime(),
  });
});

/**
 * GET /v1/metrics — Prometheus metrics
 */
app.get("/v1/metrics", async (c) => {
  const text = metrics.render();
  c.header("Content-Type", "text/plain; version=0.0.4");
  return c.body(text);
});

/**
 * Default route
 */
app.get("/", (c) =>
  c.json({
    service: "cinacoin-analytics",
    version: "0.1.0",
    endpoints: {
      "POST /v1/events": "Batch event ingestion",
      "GET /v1/health": "Health check",
      "GET /v1/metrics": "Prometheus metrics",
    },
  })
);

export default app;
