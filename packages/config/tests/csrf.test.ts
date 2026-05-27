/**
 * Tests for @cinacoin/config — CSRF protection.
 */

import { describe, it, expect, vi } from 'vitest';
import { validateCsrf, extractOrigin, CSRF_ALLOWED_ORIGINS } from '../src/csrf.js';
import type { CsrfOptions } from '../src/csrf.js';

// Helper to create a mock Request
function makeRequest(method: string, headers: Record<string, string> = {}): Request {
  const headersObj = new Headers();
  for (const [k, v] of Object.entries(headers)) {
    headersObj.set(k, v);
  }
  return new Request('https://api.example.com/endpoint', {
    method,
    headers: headersObj,
  });
}

describe('extractOrigin', () => {
  it('should extract origin from Origin header', () => {
    const req = makeRequest('POST', { Origin: 'https://cinacoin.com' });
    const origin = extractOrigin(req);
    expect(origin).toBe('https://cinacoin.com');
  });

  it('should extract origin from Referer header', () => {
    const req = makeRequest('POST', { Referer: 'https://cinacoin.com/dashboard' });
    const origin = extractOrigin(req);
    expect(origin).toBe('https://cinacoin.com');
  });

  it('should prefer Origin header over Referer', () => {
    const req = makeRequest('POST', {
      Origin: 'https://cinacoin.com',
      Referer: 'https://evil.com/page',
    });
    const origin = extractOrigin(req);
    expect(origin).toBe('https://cinacoin.com');
  });

  it('should return null when no origin headers present', () => {
    const req = makeRequest('POST');
    const origin = extractOrigin(req);
    expect(origin).toBeNull();
  });

  it('should handle custom origin headers', () => {
    const req = makeRequest('POST', { 'X-Custom-Origin': 'https://custom.example.com' });
    const origin = extractOrigin(req, ['X-Custom-Origin']);
    expect(origin).toBe('https://custom.example.com');
  });

  it('should handle malformed Referer gracefully', () => {
    const req = makeRequest('POST', { Referer: 'not-a-valid-url' });
    const origin = extractOrigin(req);
    expect(origin).toBeNull();
  });
});

describe('validateCsrf', () => {
  const allowedOrigins = ['https://cinacoin.com', 'http://localhost:3000'];

  it('should pass GET requests without origin check', () => {
    const req = makeRequest('GET');
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).toBeNull();
  });

  it('should pass HEAD requests without origin check', () => {
    const req = makeRequest('HEAD');
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).toBeNull();
  });

  it('should pass OPTIONS requests without origin check', () => {
    const req = makeRequest('OPTIONS');
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).toBeNull();
  });

  it('should reject POST without origin header', () => {
    const req = makeRequest('POST');
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('should reject POST from disallowed origin', () => {
    const req = makeRequest('POST', { Origin: 'https://evil.com' });
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('should accept POST from allowed origin', () => {
    const req = makeRequest('POST', { Origin: 'https://cinacoin.com' });
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).toBeNull();
  });

  it('should accept PUT from allowed origin', () => {
    const req = makeRequest('PUT', { Origin: 'http://localhost:3000' });
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).toBeNull();
  });

  it('should reject DELETE from disallowed origin', () => {
    const req = makeRequest('DELETE', { Origin: 'https://malicious.site' });
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('should return JSON error response body', () => {
    const req = makeRequest('POST');
    const result = validateCsrf(req, { allowedOrigins });
    expect(result!.headers.get('Content-Type')).toBe('application/json');
  });

  it('should accept custom origin headers', () => {
    const req = makeRequest('PATCH', { 'X-App-Origin': 'https://cinacoin.com' });
    const result = validateCsrf(req, {
      allowedOrigins,
      originHeaders: ['X-App-Origin'],
    });
    expect(result).toBeNull();
  });

  it('should handle PATCH method as unsafe', () => {
    const req = makeRequest('PATCH');
    const result = validateCsrf(req, { allowedOrigins });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

describe('CSRF_ALLOWED_ORIGINS', () => {
  it('should be a frozen array of allowed origins', () => {
    expect(CSRF_ALLOWED_ORIGINS).toContain('https://cinacoin.com');
    expect(CSRF_ALLOWED_ORIGINS).toContain('http://localhost:3000');
    expect(CSRF_ALLOWED_ORIGINS).toContain('http://localhost:5173');
    expect(CSRF_ALLOWED_ORIGINS).toContain('https://dashboard.cinacoin.com');
  });

  it('should not contain evil origins', () => {
    expect(CSRF_ALLOWED_ORIGINS).not.toContain('https://evil.com');
    expect(CSRF_ALLOWED_ORIGINS).not.toContain('http://localhost:9999');
  });
});
