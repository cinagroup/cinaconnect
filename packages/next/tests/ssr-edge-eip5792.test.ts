/**
 * Tests for @cinacoin/next — SSR, Edge Runtime, and server utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: null })),
    set: vi.fn(),
  })),
}));

vi.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: vi.fn((data) => ({ json: data })),
    redirect: vi.fn((url) => ({ url })),
    next: vi.fn(() => ({ ok: true })),
  },
}));

// Mock viem
vi.mock('viem', () => ({
  recoverAddress: vi.fn(async () => '0x1234567890abcdef1234567890abcdef12345678'),
  hashMessage: vi.fn(() => '0xhash'),
}));

// ---------------------------------------------------------------------------
// Edge Runtime Tests
// ---------------------------------------------------------------------------

describe('Edge Runtime — decodeEdgeSessionToken', () => {
  // We test the decode function directly by importing it
  // Since it's a private function, we test through getEdgeSession

  it('should return null for invalid token', async () => {
    // Invalid base64
    const { getEdgeSession } = await import('../src/server/edge.js');
    const mockReq = {
      cookies: {
        get: vi.fn(() => ({ value: 'not-valid-base64' })),
      },
    } as any;

    const result = await getEdgeSession(mockReq, { cookieName: 'test-session' });
    expect(result).toBeNull();
  });

  it('should return null for expired token', async () => {
    const { getEdgeSession } = await import('../src/server/edge.js');
    const expiredSession = JSON.stringify({
      address: '0x1234',
      chainId: 1,
      nonce: 'abc',
      expiresAt: Math.floor(Date.now() / 1000) - 100,
    });
    const token = btoa(expiredSession);

    const mockReq = {
      cookies: {
        get: vi.fn(() => ({ value: token })),
      },
    } as any;

    const result = await getEdgeSession(mockReq, { cookieName: 'test-session' });
    expect(result).toBeNull();
  });

  it('should return session for valid token', async () => {
    const { getEdgeSession } = await import('../src/server/edge.js');
    const validSession = {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1,
      nonce: 'test-nonce',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = btoa(JSON.stringify(validSession));

    const mockReq = {
      cookies: {
        get: vi.fn(() => ({ value: token })),
      },
    } as any;

    const result = await getEdgeSession(mockReq, { cookieName: 'test-session' });
    expect(result).not.toBeNull();
    expect(result!.address).toBe(validSession.address);
    expect(result!.chainId).toBe(validSession.chainId);
    expect(result!.nonce).toBe(validSession.nonce);
  });
});

describe('Edge Runtime — createSessionCookieHeader', () => {
  it('should create a valid Set-Cookie header', async () => {
    const { createSessionCookieHeader } = await import('../src/server/edge.js');
    const header = createSessionCookieHeader('test-token', {
      cookieName: 'cinacoin-session',
      domain: 'example.com',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });

    expect(header).toContain('cinacoin-session=test-token');
    expect(header).toContain('Secure');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=lax');
    expect(header).toContain('Domain=example.com');
  });

  it('should use default values', async () => {
    const { createSessionCookieHeader } = await import('../src/server/edge.js');
    const header = createSessionCookieHeader('token');

    expect(header).toContain('Max-Age=86400');
    expect(header).toContain('Path=/');
  });
});

describe('Edge Runtime — withCinacoinAuthEdge', () => {
  it('should return 401 when no session', async () => {
    const { withCinacoinAuthEdge } = await import('../src/server/edge.js');

    const mockReq = {
      cookies: { get: vi.fn(() => null) },
    } as any;

    const handler = withCinacoinAuthEdge(async (req, session) => {
      return new Response(JSON.stringify({ address: session.address }));
    });

    const response = await handler(mockReq);
    expect(response.status).toBe(401);
  });

  it('should call handler with session when authenticated', async () => {
    const { withCinacoinAuthEdge } = await import('../src/server/edge.js');

    const validSession = {
      address: '0xabc',
      chainId: 1,
      nonce: 'n',
      expiresAt: Date.now() / 1000 + 3600,
    };
    const token = btoa(JSON.stringify(validSession));

    const mockReq = {
      cookies: { get: vi.fn(() => ({ value: token })) },
    } as any;

    let receivedSession: any;
    const handler = withCinacoinAuthEdge(async (req, session) => {
      receivedSession = session;
      return new Response(JSON.stringify({ ok: true }));
    });

    const response = await handler(mockReq);
    expect(receivedSession.address).toBe('0xabc');
    expect(response.status).toBe(200);
  });
});

describe('Edge Runtime — requireAuthEdge', () => {
  it('should redirect to login when no cookie', async () => {
    const { requireAuthEdge } = await import('../src/server/edge.js');

    const mockReq = {
      nextUrl: { pathname: '/dashboard', origin: 'https://example.com' },
      cookies: { get: vi.fn(() => null) },
    } as any;

    const middleware = requireAuthEdge({ loginUrl: '/login' });
    // NextResponse.redirect is mocked — check it was called
    const { NextResponse } = await import('next/server');
    await middleware(mockReq);

    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('should allow public paths', async () => {
    const { requireAuthEdge } = await import('../src/server/edge.js');

    const mockReq = {
      nextUrl: { pathname: '/api/health' },
      cookies: { get: vi.fn(() => null) },
    } as any;

    const { NextResponse } = await import('next/server');
    const middleware = requireAuthEdge({ publicPaths: ['/api/health'] });
    await middleware(mockReq);

    expect(NextResponse.next).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// EIP-5792 Server Utilities Tests
// ---------------------------------------------------------------------------

describe('EIP-5792 — getWalletCapabilitiesOnServer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return inferred capabilities when RPC fails', async () => {
    const { getWalletCapabilitiesOnServer } = await import('../src/server/eip5792.js');

    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const caps = await getWalletCapabilitiesOnServer(
      '0x1234567890abcdef1234567890abcdef12345678',
      1,
    );

    expect(caps).toHaveProperty('capabilities');
    expect(caps.atomicBatchSupported).toBe(true); // Mainnet supports atomic batch
    expect(caps.paymasterSupported).toBe(true); // Mainnet supports paymaster
  });

  it('should use RPC result when available', async () => {
    const { getWalletCapabilitiesOnServer } = await import('../src/server/eip5792.js');

    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        result: {
          '0x1': {
            atomicBatch: { supported: true },
            paymasterService: { supported: false },
          },
        },
      }),
    });

    const caps = await getWalletCapabilitiesOnServer(
      '0x1234567890abcdef1234567890abcdef12345678',
      1,
    );

    expect(caps.capabilities['0x1'].atomicBatch.supported).toBe(true);
    // paymasterSupported combines RPC result with inferred capabilities
    // Chain 1 is in PAYMASTER_CHAINS, so it returns true even if RPC says false
    expect(caps.paymasterSupported).toBe(true);
    expect(caps.atomicBatchSupported).toBe(true);
  });
});

describe('EIP-5792 — verifyBatchCallOnServer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return NOT_FOUND when RPC fails and callId is not a tx hash', async () => {
    const { verifyBatchCallOnServer } = await import('../src/server/eip5792.js');

    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const result = await verifyBatchCallOnServer('some-batch-id', 1);

    expect(result.status).toBe('NOT_FOUND');
    expect(result.allSucceeded).toBe(false);
  });

  it('should verify transaction when callId is a tx hash', async () => {
    const { verifyBatchCallOnServer } = await import('../src/server/eip5792.js');

    const txHash = '0x' + 'a'.repeat(64);
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        result: {
          status: '0x1',
          blockHash: '0xbbb',
          blockNumber: '0x123',
          gasUsed: '0x1000',
          transactionHash: txHash,
          contractAddress: null,
          logs: [],
        },
      }),
    });

    const result = await verifyBatchCallOnServer(txHash, 1);

    expect(result.status).toBe('CONFIRMED');
    expect(result.allSucceeded).toBe(true);
    expect(result.receipts.length).toBe(1);
  });

  it('should detect failed transactions', async () => {
    const { verifyBatchCallOnServer } = await import('../src/server/eip5792.js');

    const txHash = '0x' + 'b'.repeat(64);
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        result: {
          status: '0x0',
          blockHash: '0xbbb',
          blockNumber: '0x123',
          gasUsed: '0x1000',
          transactionHash: txHash,
        },
      }),
    });

    const result = await verifyBatchCallOnServer(txHash, 1);

    expect(result.allSucceeded).toBe(false);
    expect(result.failedReceipts.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SSR Hooks Tests
// ---------------------------------------------------------------------------

describe('SSR Hooks — useAppKitState', () => {
  // These tests require React DOM rendering — test the logic
  it('should export useAppKitState function', async () => {
    const { useAppKitState } = await import('../src/hooks/ssr.js');
    expect(typeof useAppKitState).toBe('function');
  });

  it('should export useHydratedAppKit function', async () => {
    const { useHydratedAppKit } = await import('../src/hooks/ssr.js');
    expect(typeof useHydratedAppKit).toBe('function');
  });

  it('should export useOnChainReady function', async () => {
    const { useOnChainReady } = await import('../src/hooks/ssr.js');
    expect(typeof useOnChainReady).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Server Actions Tests
// ---------------------------------------------------------------------------

describe('Server Actions — generateNonce', () => {
  it('should generate different nonces on each call', async () => {
    // The nonce is generated inside createSiweSession
    // We test indirectly through the result
    const { createSiweSession } = await import('../src/server/actions.js');

    const result1 = await createSiweSession({ domain: 'test.com' });
    const result2 = await createSiweSession({ domain: 'test.com' });

    expect(result1.nonce).not.toBe(result2.nonce);
    expect(result1.nonce.length).toBe(64); // 32 bytes = 64 hex chars
  });
});

describe('Server Actions — createSiweSession', () => {
  it('should create a valid SIWE message', async () => {
    const { createSiweSession } = await import('../src/server/actions.js');

    const result = await createSiweSession({
      domain: 'example.com',
      statement: 'Sign in to the app',
    });

    expect(result.message).toContain('example.com wants you to sign in');
    expect(result.message).toContain('Nonce:');
    expect(result.message).toContain('Sign in to the app');
    expect(result.message).toContain('Version: 1');
    expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should use default domain when not provided', async () => {
    const { createSiweSession } = await import('../src/server/actions.js');

    const result = await createSiweSession({});

    expect(result.message).toContain('localhost wants you to sign in');
  });
});
