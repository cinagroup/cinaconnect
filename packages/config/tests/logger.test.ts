/**
 * Tests for @cinacoin/config — logger utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../src/logger.js';

describe('createLogger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a logger with the given service name', () => {
    const logger = createLogger('test-service');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should call console.log for info level (dev mode)', () => {
    const logger = createLogger('test-svc');
    logger.info('hello world');
    expect(logSpy).toHaveBeenCalled();
    const call = logSpy.mock.calls[0][0];
    expect(call).toContain('test-svc');
    expect(call).toContain('hello world');
  });

  it('should call console.warn for warn level (dev mode)', () => {
    const logger = createLogger('test-svc');
    logger.warn('warning msg');
    expect(warnSpy).toHaveBeenCalled();
    const call = warnSpy.mock.calls[0][0];
    expect(call).toContain('WARN');
    expect(call).toContain('warning msg');
  });

  it('should call console.error for error level (dev mode)', () => {
    const logger = createLogger('test-svc');
    logger.error('error occurred');
    expect(errorSpy).toHaveBeenCalled();
    const call = errorSpy.mock.calls[0][0];
    expect(call).toContain('ERROR');
    expect(call).toContain('error occurred');
  });

  it('should include context in log output', () => {
    const logger = createLogger('ctx-svc');
    logger.info('with context', { requestId: 'req-123', userId: 42 });
    expect(logSpy).toHaveBeenCalled();
    const call = logSpy.mock.calls[0][0];
    expect(call).toContain('req-123');
  });

  it('should produce JSON output in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const logger = createLogger('prod-svc');
    logger.info('prod message', { key: 'value' });

    const call = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe('info');
    expect(parsed.service).toBe('prod-svc');
    expect(parsed.message).toBe('prod message');
    expect(parsed.key).toBe('value');
    expect(parsed.timestamp).toBeDefined();

    vi.unstubAllEnvs();
  });

  it('should produce JSON for error level in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const logger = createLogger('prod-err');
    logger.error('prod error');

    const call = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe('error');
    expect(parsed.service).toBe('prod-err');
    expect(parsed.message).toBe('prod error');

    vi.unstubAllEnvs();
  });

  it('should produce valid JSON with all required fields in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const logger = createLogger('schema-test');
    logger.debug('debug check', { extra: true });

    const call = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(call);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('level', 'debug');
    expect(parsed).toHaveProperty('service', 'schema-test');
    expect(parsed).toHaveProperty('message', 'debug check');
    expect(parsed).toHaveProperty('extra', true);

    vi.unstubAllEnvs();
  });
});
