/**
 * Request ID generation and extraction utilities.
 *
 * Provides consistent request tracing across all Cinacoin services.
 */

/**
 * Generate a unique request ID.
 * Uses crypto.randomUUID when available, falls back to a hex timestamp.
 */
export function generateRequestId(): string {
  // Cloudflare Workers and modern Node.js
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    // Non-cryptographic fallback (dev only) — deterministic hash to avoid Math.random()
    const ts = Date.now().toString(36).padStart(8, '0');
    const pid = typeof process !== 'undefined' && process.pid ? process.pid.toString(36).slice(0, 4) : '0000';
    for (let i = 0; i < 16; i++) {
      const seed = `${ts}${pid}${i}`;
      let hash = 0;
      for (let j = 0; j < seed.length; j++) hash = ((hash << 5) - hash + seed.charCodeAt(j)) | 0;
      bytes[i] = (hash & 0xff);
    }
  }
  return (
    hex(bytes[0]) + hex(bytes[1]) + hex(bytes[2]) + hex(bytes[3]) + '-' +
    hex(bytes[4]) + hex(bytes[5]) + '-' +
    hex(bytes[6]) + hex(bytes[7]) + '-' +
    hex(bytes[8]) + hex(bytes[9]) + '-' +
    hex(bytes[10]) + hex(bytes[11]) + hex(bytes[12]) + hex(bytes[13]) + hex(bytes[14]) + hex(bytes[15])
  );
}

function hex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * Extract or generate a request ID from an incoming HTTP request.
 *
 * Checks headers in order of preference:
 *  1. `X-Request-ID`
 *  2. `X-Correlation-ID`
 *  3. `traceparent` (W3C Trace Context) — extracts the trace-id portion
 *  4. Generates a new ID if none is present
 */
export function extractRequestId(request: Request): string {
  // Try X-Request-ID first (most common)
  const xRequestId = request.headers.get('X-Request-ID');
  if (xRequestId) return xRequestId;

  // Try X-Correlation-ID
  const correlationId = request.headers.get('X-Correlation-ID');
  if (correlationId) return correlationId;

  // Try W3C Trace Context traceparent (format: version-traceId-parentId-flags)
  const traceparent = request.headers.get('traceparent');
  if (traceparent) {
    const parts = traceparent.split('-');
    if (parts.length >= 2 && parts[1]) {
      return parts[1];
    }
  }

  // Generate a new one
  return generateRequestId();
}
