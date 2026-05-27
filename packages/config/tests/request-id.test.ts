/**
 * Tests for @cinacoin/config — request ID utilities.
 */

import { describe, it, expect } from 'vitest';
import { generateRequestId, extractRequestId } from '../src/request-id.js';

describe('generateRequestId', () => {
  it('should generate a UUID-like string', () => {
    const id = generateRequestId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should match UUID format (8-4-4-4-12 hex)', () => {
    const id = generateRequestId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(id)).toBe(true);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRequestId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('extractRequestId', () => {
  it('should return X-Request-ID header value when present', () => {
    const req = new Request('https://api.example.com', {
      headers: { 'X-Request-ID': 'req-abc-123' },
    });
    expect(extractRequestId(req)).toBe('req-abc-123');
  });

  it('should return X-Correlation-ID when X-Request-ID is absent', () => {
    const req = new Request('https://api.example.com', {
      headers: { 'X-Correlation-ID': 'corr-xyz-789' },
    });
    expect(extractRequestId(req)).toBe('corr-xyz-789');
  });

  it('should prefer X-Request-ID over X-Correlation-ID', () => {
    const req = new Request('https://api.example.com', {
      headers: {
        'X-Request-ID': 'req-primary',
        'X-Correlation-ID': 'corr-secondary',
      },
    });
    expect(extractRequestId(req)).toBe('req-primary');
  });

  it('should extract trace-id from traceparent header', () => {
    const req = new Request('https://api.example.com', {
      headers: { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' },
    });
    expect(extractRequestId(req)).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('should generate a new ID when no headers present', () => {
    const req = new Request('https://api.example.com');
    const id = extractRequestId(req);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(id)).toBe(true);
  });

  it('should handle empty traceparent gracefully', () => {
    const req = new Request('https://api.example.com', {
      headers: { traceparent: '' },
    });
    const id = extractRequestId(req);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
