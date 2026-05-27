/**
 * Tests for @cinacoin/cli test command.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  spinner: vi.fn(() => ({
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
  warn: vi.fn(),
}));

describe('testCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exit = vi.fn() as any;
  });

  it('should register a test command', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { testCommand } = await import('../src/commands/test.js');
    testCommand(mockCli);

    expect(mockCli.command).toHaveBeenCalledWith('test');
  });

  it('should accept --unit option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { testCommand } = await import('../src/commands/test.js');
    testCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--unit', 'Run unit tests only (vitest)');
  });

  it('should accept --e2e option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { testCommand } = await import('../src/commands/test.js');
    testCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--e2e', 'Run E2E tests only (playwright)');
  });

  it('should accept --coverage option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { testCommand } = await import('../src/commands/test.js');
    testCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--coverage', 'Generate coverage report');
  });

  it('should accept --watch option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { testCommand } = await import('../src/commands/test.js');
    testCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--watch', 'Run in watch mode (unit tests only)');
  });

  it('should accept --project option', async () => {
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockCli = {
      command: vi.fn().mockReturnValue(mockCommand),
    } as any;

    const { testCommand } = await import('../src/commands/test.js');
    testCommand(mockCli);

    expect(mockCommand.option).toHaveBeenCalledWith('--project <name>', 'Playwright project to test (chromium, firefox, webkit)');
  });
});
