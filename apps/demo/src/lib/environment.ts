/**
 * Environment detection for the CinaCoin demo app.
 *
 * Set `NEXT_PUBLIC_ENVIRONMENT=demo` (or omit it — demo is the default)
 * to run in demo mode with mock data and simulated transactions.
 * Set `NEXT_PUBLIC_ENVIRONMENT=production` to enable real API calls.
 */

const env = (process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'demo') as string;

export const isDemoMode: boolean = env === 'demo';

export const environment: 'demo' | 'production' = isDemoMode ? 'demo' : 'production';

export function environmentLabel(): string {
  return isDemoMode ? 'Demo' : 'Production';
}
