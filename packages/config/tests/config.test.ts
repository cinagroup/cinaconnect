/**
 * config/tests/config.test.ts
 *
 * Tests for ConfigManager, feature flags, and configuration utilities.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../src/ConfigManager.js';
import type { RemoteConfig, FeatureFlags } from '../src/ConfigManager.js';

describe('ConfigManager Factory', () => {
  it('should create a manager via ConfigManager.create()', () => {
    const config: RemoteConfig = { projectId: 'proj_123' };
    const manager = ConfigManager.create(config);
    expect(manager).not.toBeNull();
  });
});

describe('ConfigManager Default Features', () => {
  it('headless defaults to true', () => {
    const manager = ConfigManager.create({ projectId: 'proj_test' });
    expect(manager.getFeature('headless')).toBe(true);
  });

  it('analytics_enabled defaults to true', () => {
    const manager = ConfigManager.create({ projectId: 'proj_test' });
    expect(manager.getFeature('analytics_enabled')).toBe(true);
  });

  it('swap_enabled defaults to true', () => {
    const manager = ConfigManager.create({ projectId: 'proj_test' });
    expect(manager.getFeature('swap_enabled')).toBe(true);
  });

  it('onramp_enabled defaults to true', () => {
    const manager = ConfigManager.create({ projectId: 'proj_test' });
    expect(manager.getFeature('onramp_enabled')).toBe(true);
  });

  it('smart_accounts_enabled defaults to false', () => {
    const manager = ConfigManager.create({ projectId: 'proj_test' });
    expect(manager.getFeature('smart_accounts_enabled')).toBe(false);
  });

  it('social_login_enabled defaults to false', () => {
    const manager = ConfigManager.create({ projectId: 'proj_test' });
    expect(manager.getFeature('social_login_enabled')).toBe(false);
  });
});

describe('ConfigManager Fallback Override', () => {
  it('should override fallback values', () => {
    const manager = ConfigManager.create({
      projectId: 'proj_override',
      fallback: {
        swap_enabled: false,
        custom_flag: true,
      },
    });
    expect(manager.getFeature('swap_enabled')).toBe(false);
    expect(manager.getFeature('custom_flag')).toBe(true);
    // Default still applies for non-overridden
    expect(manager.getFeature('headless')).toBe(true);
  });
});

describe('getFeature', () => {
  it('should return known flag value', () => {
    const manager = ConfigManager.create({ projectId: 'proj_get' });
    expect(manager.getFeature('headless')).toBe(true);
  });

  it('should return false for unknown flags', () => {
    const manager = ConfigManager.create({ projectId: 'proj_get' });
    expect(manager.getFeature('nonexistent_flag')).toBe(false);
  });

  it('should return false for empty string', () => {
    const manager = ConfigManager.create({ projectId: 'proj_get' });
    expect(manager.getFeature('')).toBe(false);
  });
});

describe('getAllFeatures', () => {
  it('should return an object', () => {
    const manager = ConfigManager.create({ projectId: 'proj_all' });
    const features = manager.getAllFeatures();
    expect(typeof features).toBe('object');
  });

  it('should include headless in snapshot', () => {
    const manager = ConfigManager.create({ projectId: 'proj_all' });
    const features = manager.getAllFeatures();
    expect(features.headless).toBe(true);
  });

  it('should include swap_enabled in snapshot', () => {
    const manager = ConfigManager.create({ projectId: 'proj_all' });
    const features = manager.getAllFeatures();
    expect(features.swap_enabled).toBe(true);
  });

  it('should return a new copy each time', () => {
    const manager = ConfigManager.create({ projectId: 'proj_all' });
    const f1 = manager.getAllFeatures();
    const f2 = manager.getAllFeatures();
    expect(f1).not.toBe(f2);
  });
});

describe('onFeatureChange', () => {
  it('should invoke callback immediately with current value', () => {
    const manager = ConfigManager.create({ projectId: 'proj_change' });
    const calls: Array<[string, boolean]> = [];
    manager.onFeatureChange('swap_enabled', (flag, value) => {
      calls.push([flag, value]);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('swap_enabled');
    expect(calls[0][1]).toBe(true);
  });

  it('should return an unsubscribe function', () => {
    const manager = ConfigManager.create({ projectId: 'proj_change' });
    const unsubscribe = manager.onFeatureChange('swap_enabled', () => {});
    expect(typeof unsubscribe).toBe('function');
  });
});

describe('ConfigManager init (fallback)', () => {
  it('should gracefully fall back when remote fetch fails', async () => {
    const manager = ConfigManager.create({ projectId: 'proj_init' });
    await manager.init();
    expect(manager.getFeature('headless')).toBe(true);
  });
});

describe('ConfigManager destroy', () => {
  it('should still allow reading features after destroy', () => {
    const manager = ConfigManager.create({ projectId: 'proj_destroy' });
    manager.destroy();
    expect(manager.getFeature('headless')).toBe(true);
  });
});

describe('FeatureFlags type', () => {
  it('should support index signature for custom flags', () => {
    const flags: FeatureFlags = {
      headless: true,
      analytics_enabled: false,
      swap_enabled: true,
      onramp_enabled: false,
      smart_accounts_enabled: false,
      social_login_enabled: false,
      custom_flag: true,
    };
    expect(flags.headless).toBe(true);
    expect(flags['custom_flag']).toBe(true);
  });
});

describe('default features baseline', () => {
  it('should have exactly 4 true flags by default', () => {
    const manager = ConfigManager.create({ projectId: 'proj_baseline' });
    const all = manager.getAllFeatures();
    let trueCount = 0;
    for (const key of Object.keys(all)) {
      if (all[key]) trueCount++;
    }
    expect(trueCount).toBe(4);
  });
});

describe('RemoteConfig options', () => {
  it('should accept minimal config', () => {
    const manager = ConfigManager.create({ projectId: 'a' });
    expect(manager).not.toBeNull();
  });

  it('should accept custom polling interval', () => {
    const manager = ConfigManager.create({ projectId: 'b', pollingInterval: 60000 });
    expect(manager).not.toBeNull();
  });

  it('should accept fallback overrides', () => {
    const manager = ConfigManager.create({ projectId: 'c', fallback: { test: true } });
    expect(manager.getFeature('test')).toBe(true);
  });

  it('should accept combined options', () => {
    const manager = ConfigManager.create({
      projectId: 'd',
      pollingInterval: 10000,
      fallback: { x: true, y: false },
    });
    expect(manager.getFeature('x')).toBe(true);
    expect(manager.getFeature('y')).toBe(false);
  });
});
