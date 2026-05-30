/**
 * GET /api/auth/session — Check if user has a valid session
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cinacoin-session';

export async function GET() {
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
