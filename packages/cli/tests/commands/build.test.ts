/**
 * Tests for @cinacoin/cli build command.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  spinner: vi.fn(() => ({
    succeed: vi.fn(),
    fail: vi.fn(),
    warn: vi.fn(),
  })),
  warn: vi.fn(),
}));

describe('buildCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exit = vi.fn() as any;
  });

  it('should register a build command', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { buildCommand } = await import('../src/commands/build.js');
    buildCommand(mockCli);

    expect(mockCli.command).toHaveBeenCalledWith('build');
  });

  it('should accept --scope option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { buildCommand } = await import('../src/commands/build.js');
    buildCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--scope <package>', 'Build a specific package only');
  });

  it('should accept --force option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { buildCommand } = await import('../src/commands/build.js');
    buildCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--force', 'Force rebuild (clean dist first)');
  });

  it('should accept --turbo option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { buildCommand } = await import('../src/commands/build.js');
    buildCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--turbo', 'Use turbo for parallel builds (default)', true);
  });

  it('should find workspace root via pnpm-workspace.yaml', async () => {
    const { execSync } = await import('node:child_process');
    (execSync as ReturnType<typeof vi.fn>).mockReturnValue('');

    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn((cb: (opts: any) => void) => cb({})),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { buildCommand } = await import('../src/commands/build.js');
    buildCommand(mockCli);

    // execSync should be called with turbo build command
    expect(execSync).toHaveBeenCalled();
  });

  it('should use scoped build when --scope is provided', async () => {
    const { execSync } = await import('node:child_process');
    (execSync as ReturnType<typeof vi.fn>).mockReturnValue('');

    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn((cb: (opts: any) => void) => cb({ scope: '@cinacoin/core-sdk' })),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { buildCommand } = await import('../src/commands/build.js');
    buildCommand(mockCli);

    expect(execSync).toHaveBeenCalledWith(
      'npx turbo run build --filter=@cinacoin/core',
      expect.objectContaining({ stdio: 'pipe' })
    );
  });
});
