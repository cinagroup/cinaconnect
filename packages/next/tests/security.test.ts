/**
 * @vitest-environment jsdom
 * Security tests — CSRF protection, CSP headers, and session hardening.
 */

import { describe, it, expect } from 'vitest';
import {
  generateCsrfToken,
  createCsrfCookieHeader,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  csrfFetch,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../src/server/csrf';
import { buildCspString } from '../src/server/securityHeaders';

// ---------------------------------------------------------------------------
// CSRF Token Generation
// ---------------------------------------------------------------------------

describe('CSRF Token Generation', () => {
  it('generates a 64-character hex token', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens on each call', () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
  });
});

// ---------------------------------------------------------------------------
// CSRF Cookie Header
// ---------------------------------------------------------------------------

describe('CSRF Cookie Header', () => {
  it('creates a Set-Cookie header with correct flags', () => {
    const token = generateCsrfToken();
    const header = createCsrfCookieHeader(token);

    expect(header).toContain(`cinacoin-csrf=${token}`);
    expect(header).toContain('Max-Age=3600');
    expect(header).toContain('Path=/');
    expect(header).toContain('SameSite=Strict');
    expect(header).toContain('Secure');
  });

  it('includes domain when provided', () => {
    const header = createCsrfCookieHeader('test-token', { domain: 'example.com' });
    expect(header).toContain('Domain=example.com');
  });
});

// ---------------------------------------------------------------------------
// CSP Header Building
// ---------------------------------------------------------------------------

describe('CSP Header Building', () => {
  it('builds default CSP with correct directives', () => {
    const csp = buildCspString();

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it('allows CSP overrides', () => {
    const csp = buildCspString({
      'connect-src': ["'self'", 'https://api.example.com'],
      'script-src': ["'self'", "'unsafe-eval'"],
    });

    expect(csp).toContain("connect-src 'self' https://api.example.com");
    expect(csp).toContain("script-src 'self' 'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('includes nonce when provided', () => {
    const csp = buildCspString({}, 'abc123');
    expect(csp).toContain("'nonce-abc123'");
  });
});

// ---------------------------------------------------------------------------
// CSRF Token Extraction
// ---------------------------------------------------------------------------

describe('CSRF Token Extraction', () => {
  it('extracts cookie value from Cookie header', () => {
    const mockReq = {
      headers: new Headers({ cookie: 'cinacoin-csrf=test123; other=value' }),
    } as Request;

    expect(getCsrfTokenFromCookie(mockReq)).toBe('test123');
  });

  it('returns null when cookie is missing', () => {
    const mockReq = {
      headers: new Headers({ cookie: 'other=value' }),
    } as Request;

    expect(getCsrfTokenFromCookie(mockReq)).toBeNull();
  });

  it('extracts header value', () => {
    const mockReq = {
      headers: new Headers({ 'x-csrf-token': 'my-token' }),
    } as Request;

    expect(getCsrfTokenFromHeader(mockReq)).toBe('my-token');
  });

  it('returns null when header is missing', () => {
    const mockReq = {
      headers: new Headers(),
    } as Request;

    expect(getCsrfTokenFromHeader(mockReq)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CSRF Fetch Wrapper
// ---------------------------------------------------------------------------

describe('CSRF Fetch Wrapper', () => {
  beforeEach(() => {
    // Mock document.cookie and fetch
    (globalThis as any).__mockCookies = 'cinacoin-csrf=test-token';
  });

  it('attaches CSRF token to POST requests', async () => {
    const originalDoc = globalThis.document;
    const originalFetch = globalThis.fetch;

    Object.defineProperty(globalThis, 'document', {
      value: { cookie: 'cinacoin-csrf=test-token' },
      writable: true,
      configurable: true,
    });

    let capturedHeaders: Headers | undefined;
    (globalThis as any).fetch = (_url: string, init: RequestInit) => {
      capturedHeaders = new Headers(init.headers);
      return Promise.resolve(new Response('ok'));
    };

    await csrfFetch('/api/test', { method: 'POST' });

    expect(capturedHeaders!.get(CSRF_HEADER_NAME)).toBe('test-token');

    // Restore
    Object.defineProperty(globalThis, 'document', {
      value: originalDoc,
      writable: true,
      configurable: true,
    });
    globalThis.fetch = originalFetch;
  });

  it('does NOT attach CSRF token to GET requests', async () => {
    const originalDoc = globalThis.document;
    const originalFetch = globalThis.fetch;

    Object.defineProperty(globalThis, 'document', {
      value: { cookie: 'cinacoin-csrf=test-token' },
      writable: true,
      configurable: true,
    });

    let capturedHeaders: Headers | undefined;
    (globalThis as any).fetch = (_url: string, init: RequestInit) => {
      capturedHeaders = new Headers(init.headers);
      return Promise.resolve(new Response('ok'));
    };

    await csrfFetch('/api/test', { method: 'GET' });

    expect(capturedHeaders!.get(CSRF_HEADER_NAME)).toBeNull();

    // Restore
    Object.defineProperty(globalThis, 'document', {
      value: originalDoc,
      writable: true,
      configurable: true,
    });
    globalThis.fetch = originalFetch;
  });
});
