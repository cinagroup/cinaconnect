/**
 * Structured logging utility for Cinacoin services.
 *
 * - Production: single-line JSON output
 * - Development: pretty-print with ANSI colors
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogContext {
  service: string;
  requestId?: string;
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ---------------------------------------------------------------------------
// Color helpers (dev only)
// ---------------------------------------------------------------------------

const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',    // cyan
  info: '\x1b[32m',     // green
  warn: '\x1b[33m',     // yellow
  error: '\x1b[31m',    // red
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function color(level: LogLevel, text: string): string {
  return `${COLORS[level]}${text}${COLORS.reset}`;
}

function dim(text: string): string {
  return `${COLORS.dim}${text}${COLORS.reset}`;
}

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

function isProduction(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') return true;
  }
  // Cloudflare Workers: check for __ENV__ or DurableObject/ExecutionContext presence
  // Safe fallback: if we can detect CF runtime
  // @ts-ignore — Cloudflare Workers inject `navigator` or `cf` context
  if (typeof (globalThis as { WebSocketPair?: typeof WebSocket }).WebSocketPair !== 'undefined') return true;
  return false;
}

// ---------------------------------------------------------------------------
// Log emitter
// ---------------------------------------------------------------------------

function emit(level: LogLevel, service: string, msg: string, ctx?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const enriched: Record<string, unknown> = {
    timestamp,
    level,
    service,
    message: msg,
    ...ctx,
  };

  if (isProduction()) {
    // Single-line JSON for production (Cloudflare Workers, Node.js prod)
    console.log(JSON.stringify(enriched));
  } else {
    // Pretty-print for development
    const ctxEntries = ctx
      ? Object.entries(ctx)
          .filter(([k]) => k !== 'requestId') // requestId shown in prefix
          .map(([k, v]) => `${dim(k)}=${JSON.stringify(v)}`)
          .join(' ')
      : '';

    const requestId = ctx?.requestId ? ` [${ctx.requestId}]` : '';
    const line = `${dim(timestamp)} ${color(level, level.toUpperCase().padEnd(5))} ${COLORS.bold}[${service}]${COLORS.reset}${requestId} ${msg}${ctxEntries ? ' ' + ctxEntries : ''}`;

    switch (level) {
      case 'error':
        console.error(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      default:
        console.log(line);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a logger instance bound to a specific service name.
 */
export function createLogger(serviceName: string): {
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
} {
  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => {
      emit('debug', serviceName, msg, ctx);
    },
    info: (msg: string, ctx?: Record<string, unknown>) => {
      emit('info', serviceName, msg, ctx);
    },
    warn: (msg: string, ctx?: Record<string, unknown>) => {
      emit('warn', serviceName, msg, ctx);
    },
    error: (msg: string, ctx?: Record<string, unknown>) => {
      emit('error', serviceName, msg, ctx);
    },
  };
}

// ---------------------------------------------------------------------------
// Re-export types
// ---------------------------------------------------------------------------

export type Logger = ReturnType<typeof createLogger>;
