/**
 * POST /api/auth/nonce — Get a fresh nonce for SIWE signing
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateNonce } from '@/lib/auth';

const NONCE_COOKIE = 'cinacoin-nonce';

export async function POST() {
  const nonce = generateNonce();
  const cookieStore = await cookies();

  cookieStore.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 300, // 5 minutes
  });

  return NextResponse.json({ nonce });
}
