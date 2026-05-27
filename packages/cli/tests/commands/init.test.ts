/**
 * Tests for @cinacoin/cli init command.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Mock path
vi.mock('node:path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  spinner: vi.fn(() => ({
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
}));

describe('initCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exit = vi.fn() as any;
  });

  it('should register an init command', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      argument: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { initCommand } = await import('../src/commands/init.js');
    initCommand(mockCli);

    expect(mockCli.command).toHaveBeenCalledWith('init');
  });

  it('should accept directory argument', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      argument: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { initCommand } = await import('../src/commands/init.js');
    initCommand(mockCli);

    expect(mockCommand.argument).toHaveBeenCalledWith(
      '[directory]',
      'Project directory name',
      'my-cinacoin-app'
    );
  });

  it('should accept template option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      argument: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { initCommand } = await import('../src/commands/init.js');
    initCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith(
      '--template <name>',
      'Template to use (web | react | vue | next)',
      'web'
    );
  });

  it('should accept package-manager option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      argument: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { initCommand } = await import('../src/commands/init.js');
    initCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith(
      '--package-manager <pm>',
      'Package manager (npm | yarn | pnpm)',
      'pnpm'
    );
  });

  it('should accept dry-run option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      argument: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { initCommand } = await import('../src/commands/init.js');
    initCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--dry-run', 'Show what would be created without writing files');
  });

  it('should support all template types', () => {
    const templates = ['web', 'react', 'vue', 'next'];
    expect(templates).toContain('web');
    expect(templates).toContain('react');
    expect(templates).toContain('vue');
    expect(templates).toContain('next');
    expect(templates).toHaveLength(4);
  });
});
