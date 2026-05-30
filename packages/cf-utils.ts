// Shared inline utilities for Cloudflare Workers
// Copied from @cinacoin/config to avoid monorepo resolution issues

export function createLogger(serviceName: string) {
  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => console.debug(`[${serviceName}] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    info: (msg: string, ctx?: Record<string, unknown>) => console.log(`[${serviceName}] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    warn: (msg: string, ctx?: Record<string, unknown>) => console.warn(`[${serviceName}] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    error: (msg: string, ctx?: Record<string, unknown>) => console.error(`[${serviceName}] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
  };
}

export function extractRequestId(request: Request): string {
  return request.headers.get('x-request-id')
    || request.headers.get('x-correlation-id')
    || request.headers.get('cf-ray')
    || crypto.randomUUID();
}

export const CSRF_ALLOWED_ORIGINS: string[] = [];

export function validateCsrf(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  if (CSRF_ALLOWED_ORIGINS.length === 0) return true;
  return CSRF_ALLOWED_ORIGINS.includes(origin);
}
