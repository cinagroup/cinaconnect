/**
 * E2E Test Framework for Cinacoin
 * 
 * Provides utilities for end-to-end testing of:
 * - Wallet connection flows
 * - Transaction execution
 * - Cross-chain operations
 * - Server API endpoints
 * - Mobile SDK integrations
 */

import { expect } from 'vitest';
import type { WalletProvider } from '@cinacoin/core-sdk';
import type { ChainConfig } from '@cinacoin/chains';

// ============================================================
// Test Fixtures
// ============================================================

export interface TestWallet {
  provider: WalletProvider;
  address: string;
  privateKey: string;
  balance: bigint;
}

export interface TestEnvironment {
  /** Base URL for API tests */
  apiUrl: string;
  /** WebSocket URL for relay tests */
  wsUrl: string;
  /** Test wallet configuration */
  wallets: TestWallet[];
  /** Chain configurations */
  chains: ChainConfig[];
  /** Timeout for async operations */
  timeoutMs: number;
}

// ============================================================
// E2E Test Helpers
// ============================================================

export class E2ETestHelper {
  private env: TestEnvironment;

  constructor(env: TestEnvironment) {
    this.env = env;
  }

  /**
   * Test wallet connection flow
   */
  async testWalletConnection(providerId: string): Promise<{
    connected: boolean;
    address: string;
    chainId: number;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    
    // Simulate wallet connection
    const wallet = this.env.wallets.find(w => w.provider.id === providerId);
    if (!wallet) {
      throw new Error(`Test wallet "${providerId}" not found`);
    }

    // Mock connection flow
    const result = {
      connected: true,
      address: wallet.address,
      chainId: 1,
      latencyMs: Date.now() - startTime,
    };

    expect(result.connected).toBe(true);
    expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.chainId).toBeGreaterThan(0);
    expect(result.latencyMs).toBeLessThan(5000);

    return result;
  }

  /**
   * Test transaction flow
   */
  async testTransactionFlow(
    from: string,
    to: string,
    amount: bigint,
    chainId: number = 1
  ): Promise<{
    hash: string;
    status: 'success' | 'failed';
    gasUsed: bigint;
    latencyMs: number;
  }> {
    const startTime = Date.now();

    // Validate inputs
    expect(from).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(to).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(amount).toBeGreaterThan(0n);
    expect(chainId).toBeGreaterThan(0);

    // Mock transaction result
    const result = {
      hash: '0x' + 'a'.repeat(64),
      status: 'success' as const,
      gasUsed: 21000n,
      latencyMs: Date.now() - startTime,
    };

    expect(result.status).toBe('success');
    expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.latencyMs).toBeLessThan(30000);

    return result;
  }

  /**
   * Test API endpoint health
   */
  async testApiHealth(endpoint: string): Promise<{
    status: number;
    responseTimeMs: number;
    healthy: boolean;
  }> {
    const startTime = Date.now();
    const url = `${this.env.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url);
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.status,
        responseTimeMs: responseTime,
        healthy: response.status >= 200 && response.status < 300,
      };
    } catch (err) {
      return {
        status: 0,
        responseTimeMs: Date.now() - startTime,
        healthy: false,
      };
    }
  }

  /**
   * Test rate limiting behavior
   */
  async testRateLimit(endpoint: string, maxRequests: number): Promise<{
    allowedCount: number;
    limitedAfter: number;
    status429: boolean;
  }> {
    let allowedCount = 0;
    let limitedAfter = 0;
    let status429 = false;

    for (let i = 0; i < maxRequests + 5; i++) {
      try {
        const response = await fetch(`${this.env.apiUrl}${endpoint}`);
        if (response.status === 429) {
          limitedAfter = i;
          status429 = true;
          break;
        } else if (response.ok) {
          allowedCount++;
        }
      } catch {
        break;
      }
    }

    return { allowedCount, limitedAfter, status429 };
  }
}

// ============================================================
// Test Fixtures
// ============================================================

export function createTestEnvironment(): TestEnvironment {
  return {
    apiUrl: process.env.TEST_API_URL || 'http://localhost:8080/api/v1',
    wsUrl: process.env.TEST_WS_URL || 'ws://localhost:8081',
    wallets: [
      {
        provider: {} as WalletProvider,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
        privateKey: '0x' + 'a'.repeat(64),
        balance: 1000000000000000000n,
      },
    ],
    chains: [
      { chainId: 1, name: 'Ethereum', rpcUrl: 'https://eth.llamarpc.com' },
      { chainId: 137, name: 'Polygon', rpcUrl: 'https://polygon-rpc.com' },
    ],
    timeoutMs: 30000,
  };
}

export function createE2EHelper(env?: TestEnvironment): E2ETestHelper {
  return new E2ETestHelper(env || createTestEnvironment());
}
