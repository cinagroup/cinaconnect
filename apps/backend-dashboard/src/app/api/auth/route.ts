/**
 * Backend Dashboard — Secure Session API Routes.
 *
 * Replaces localStorage-based auth with httpOnly cookie sessions.
 *
 * Routes:
 *   GET    /api/auth/session  — Check if user has a valid session
 *   POST   /api/auth/nonce    — Get a fresh nonce for SIWE signing
 *   POST   /api/auth/login    — Verify SIWE signature and set session cookie
 *   POST   /api/auth/refresh  — Extend session by another 24h
 *   POST   /api/auth/logout   — Clear session
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSiweMessage, generateNonce } from '@/lib/auth';

const SESSION_COOKIE = 'cinacoin-session';
const NONCE_COOKIE = 'cinacoin-nonce';
const SESSION_TTL = 24 * 60 * 60; // 24 hours

// ---------------------------------------------------------------------------
// Route dispatcher
// ---------------------------------------------------------------------------

export async function GET() {
  return handleSession();
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const action = url.pathname.split('/').pop();

  switch (action) {
    case 'login':
      return handleLogin(req);
    case 'nonce':
      return handleNonce();
    case 'refresh':
      return handleRefresh();
    default:
      return handleLogout();
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/session — Check if user has a valid session
// ---------------------------------------------------------------------------

async function handleSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = JSON.parse(atob(sessionCookie.value));

    if (session.expiresAt < Math.floor(Date.now() / 1000)) {
      cookieStore.delete(SESSION_COOKIE);
      return NextResponse.json({ authenticated: false, error: 'expired' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      address: session.address,
      nonce: session.nonce,
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    });
  } catch {
    return NextResponse.json({ authenticated: false, error: 'invalid' }, { status: 401 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout — Clear session
// ---------------------------------------------------------------------------

async function handleLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(NONCE_COOKIE);
  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// POST /api/auth/login — Verify SIWE signature and set session cookie
// ---------------------------------------------------------------------------

/**
 * Verify a SIWE signature and recover the signer address.
 * Uses viem for cryptographic verification.
 */
async function verifySiweSignature(message: string, signature: string): Promise<string> {
  const { recoverAddress, hashMessage } = await import('viem');

  if (!signature.startsWith('0x') || signature.length !== 132) {
    throw new Error('Invalid signature format');
  }

  const msgHash = hashMessage(message);
  const recovered = await recoverAddress({
    hash: msgHash,
    signature: signature as `0x${string}`,
  });

  // Parse message to extract claimed address
  const lines = message.split('\n');
  const claimedAddress = lines[1]?.trim();
  if (!claimedAddress || claimedAddress.toLowerCase() !== recovered.toLowerCase()) {
    throw new Error('Address mismatch — signature does not match claimed address');
  }

  return recovered;
}

async function handleLogin(req: Request) {
  try {
    const body = await req.json();
    const { message, signature, nonce } = body;

    if (!message || !signature || !nonce) {
      return NextResponse.json(
        { error: 'Missing message, signature, or nonce' },
        { status: 400 },
      );
    }

    // Verify the nonce was the one we issued (prevent replay attacks)
    const cookieStore = await cookies();
    const storedNonce = cookieStore.get(NONCE_COOKIE);
    if (!storedNonce || storedNonce.value !== nonce) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 },
      );
    }

    // Verify SIWE signature
    const recoveredAddress = await verifySiweSignature(message, signature);

    // Create session
    const now = Math.floor(Date.now() / 1000);
    const session = {
      address: recoveredAddress,
      nonce,
      timestamp: now,
      expiresAt: now + SESSION_TTL,
    };

    const token = btoa(JSON.stringify(session));

    // Set httpOnly, Secure, SameSite=Strict cookie
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL,
    });

    // Clear used nonce
    cookieStore.delete(NONCE_COOKIE);

    return NextResponse.json({
      success: true,
      address: recoveredAddress,
      expiresAt: new Date((now + SESSION_TTL) * 1000).toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/nonce — Get a fresh nonce for SIWE signing
// ---------------------------------------------------------------------------

async function handleNonce() {
  const nonce = generateNonce();
  const cookieStore = await cookies();

  // Store nonce in httpOnly cookie for later verification
  cookieStore.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 300, // 5 minutes
  });

  return NextResponse.json({ nonce });
}

// ---------------------------------------------------------------------------
// POST /api/auth/refresh — Extend session by another 24h
// ---------------------------------------------------------------------------

async function handleRefresh() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const session = JSON.parse(atob(sessionCookie.value));

    if (session.expiresAt < Math.floor(Date.now() / 1000)) {
      cookieStore.delete(SESSION_COOKIE);
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const newExpiry = Math.floor(Date.now() / 1000) + SESSION_TTL;
    session.expiresAt = newExpiry;

    const newToken = btoa(JSON.stringify(session));

    cookieStore.set(SESSION_COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL,
    });

    return NextResponse.json({
      expiresAt: new Date(newExpiry * 1000).toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
