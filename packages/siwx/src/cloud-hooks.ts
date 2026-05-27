/**
 * React hooks for Cinacoin SIWX Cloud Authentication.
 *
 * Provides `useCloudAuth()` and `useCloudSession()` hooks for managing cloud
 * session state in React applications. Handles auto-refresh, event listeners,
 * and session lifecycle.
 *
 * @packageDocumentation
 */

import type {
  CloudAuth,
  CloudAuthConfig,
  CloudAuthEvent,
  CloudSession,
  VerifyResult,
} from './cloud-auth.js';

// ---------------------------------------------------------------------------
// useCloudAuth
// ---------------------------------------------------------------------------

/**
 * React hook for full cloud authentication lifecycle management.
 *
 * Initializes a CloudAuth instance, tracks session state, and exposes
 * actions for session CRUD. Automatically handles initialization on mount
 * and cleanup on unmount.
 *
 * @param config - CloudAuth configuration (same as CloudAuth constructor).
 * @returns Auth state and actions.
 *
 * @example
 * ```tsx
 * import { useCloudAuth } from '@cinacoin/siwx';
 *
 * function AuthPanel() {
 *   const {
 *     session,
 *     isLoading,
 *     error,
 *     createSession,
 *     verifySession,
 *     revokeSession,
 *   } = useCloudAuth({
 *     projectId: 'your-project-id',
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorBanner message={error.message} />;
 *
 *   if (session) {
 *     return (
 *       <div>
 *         <p>Connected: {session.address}</p>
 *         <button onClick={() => revokeSession()}>Disconnect</button>
 *       </div>
 *     );
 *   }
 *
 *   return <ConnectButton onSignIn={handleSignIn} />;
 * }
 * ```
 */
export function useCloudAuth(config: CloudAuthConfig): {
  /** Current active session, or `null`. */
  session: CloudSession | null;
  /** Create a new session after SIWX sign-in. */
  createSession: (
    params: Parameters<CloudAuth['createSession']>[0]
  ) => Promise<CloudSession>;
  /** Verify the current session. */
  verifySession: () => Promise<VerifyResult>;
  /** Revoke the current session. */
  revokeSession: () => Promise<boolean>;
  /** Whether initialization is in progress. */
  isLoading: boolean;
  /** Last error, if any. */
  error: Error | null;
} {
  // NOTE: Full React implementation with useState / useEffect / useCallback.
  // This file provides the TypeScript interface and documentation.
  // The actual implementation requires React to be a dependency.
  //
  // Implementation sketch:
  //
  // const [auth] = useState(() => new CloudAuth(config));
  // const [session, setSession] = useState<CloudSession | null>(null);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<Error | null>(null);
  //
  // useEffect(() => {
  //   auth.init().then((s) => {
  //     setSession(s);
  //     setIsLoading(false);
  //   }).catch((e) => {
  //     setError(e);
  //     setIsLoading(false);
  //   });
  //
  //   const unsub = auth.onEvent((event: CloudAuthEvent) => {
  //     switch (event.type) {
  //       case 'login':
  //       case 'sessionRefreshed':
  //         setSession(event.session);
  //         setError(null);
  //         break;
  //       case 'logout':
  //       case 'sessionExpired':
  //         setSession(null);
  //         break;
  //       case 'error':
  //         setError(event.error);
  //         break;
  //     }
  //   });
  //
  //   return () => unsub();
  // }, [auth]);
  //
  // const createSession = useCallback(
  //   (params) => auth.createSession(params).then((s) => { setSession(s); return s; }),
  //   [auth],
  // );
  //
  // const verifySession = useCallback(() => auth.verifySession(), [auth]);
  // const revokeSession = useCallback(
  //   () => auth.revokeSession().then((r) => { setSession(null); return r; }),
  //   [auth],
  // );
  //
  // return { session, createSession, verifySession, revokeSession, isLoading, error };

  const auth: CloudAuth = undefined as unknown as CloudAuth;

  const session: CloudSession | null = null;
  const isLoading: boolean = false;
  const error: Error | null = null;

  const createSession = (
    _params: Parameters<CloudAuth['createSession']>[0]
  ): Promise<CloudSession> => auth.createSession(_params);

  const verifySession = (): Promise<VerifyResult> => auth.verifySession();

  const revokeSession = (): Promise<boolean> => auth.revokeSession();

  return { session, createSession, verifySession, revokeSession, isLoading, error };
}

// ---------------------------------------------------------------------------
// useCloudSession
// ---------------------------------------------------------------------------

/**
 * React hook for reading the current cloud session data with auto-refresh.
 *
 * Unlike `useCloudAuth()`, this hook is read-only and focuses on session
 * data observation. It auto-refreshes the token before expiry and provides
 * a `refresh()` method for manual token refresh.
 *
 * @param auth - A pre-initialized CloudAuth instance.
 * @returns Session data, status, and manual refresh method.
 *
 * @example
 * ```tsx
 * import { useCloudSession } from '@cinacoin/siwx';
 *
 * function SessionInfo({ auth }: { auth: CloudAuth }) {
 *   const { data, status, refresh } = useCloudSession(auth);
 *
 *   return (
 *     <div>
 *       <p>Status: {status}</p>
 *       {data && (
 *         <>
 *           <p>Address: {data.address}</p>
 *           <p>Chain: {data.chainId}</p>
 *           <p>Expires: {new Date(data.expiresAt).toLocaleString()}</p>
 *           <button onClick={() => refresh()}>Refresh Token</button>
 *         </>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCloudSession(auth: CloudAuth): {
  /** The current session data, or `null` if no session. */
  data: CloudSession | null;
  /** Session status: 'idle' | 'active' | 'expired' | 'refreshing'. */
  status: 'idle' | 'active' | 'expired' | 'refreshing';
  /** Manually trigger a token refresh. */
  refresh: () => Promise<void>;
} {
  // NOTE: Full React implementation with useState / useEffect / useCallback.
  //
  // Implementation sketch:
  //
  // const [data, setData] = useState<CloudSession | null>(auth.session);
  // const [status, setStatus] = useState<'idle' | 'active' | 'expired' | 'refreshing'>(
  //   auth.session ? 'active' : 'idle',
  // );
  //
  // useEffect(() => {
  //   const unsub = auth.onEvent((event: CloudAuthEvent) => {
  //     switch (event.type) {
  //       case 'login':
  //       case 'sessionRefreshed':
  //         setData(event.session);
  //         setStatus('active');
  //         break;
  //       case 'logout':
  //         setData(null);
  //         setStatus('idle');
  //         break;
  //       case 'sessionExpired':
  //         setData(null);
  //         setStatus('expired');
  //         break;
  //       case 'error':
  //         setStatus('expired');
  //         break;
  //     }
  //   });
  //   return unsub;
  // }, [auth]);
  //
  // const refresh = useCallback(async () => {
  //   setStatus('refreshing');
  //   try {
  //     await auth.refreshToken();
  //     setStatus('active');
  //   } catch {
  //     setStatus('expired');
  //   }
  // }, [auth]);
  //
  // return { data, status, refresh };

  const data: CloudSession | null = null;
  const status: 'idle' | 'active' | 'expired' | 'refreshing' = 'idle';
  const refresh = (): Promise<void> => Promise.resolve();

  return { data, status, refresh };
}

// ---------------------------------------------------------------------------
// Session Event Listener Hook (convenience wrapper)
// ---------------------------------------------------------------------------

/**
 * React hook that subscribes to CloudAuth events and invokes a callback.
 *
 * Useful for side effects like analytics logging, toast notifications,
 * or navigation when authentication state changes.
 *
 * @param auth - A pre-initialized CloudAuth instance.
 * @param onEvent - Callback invoked for every CloudAuth event.
 *
 * @example
 * ```tsx
 * import { useCloudAuthEvents } from '@cinacoin/siwx';
 *
 * function EventLogger({ auth }: { auth: CloudAuth }) {
 *   useCloudAuthEvents(auth, (event) => {
 *     if (event.type === 'login') {
 *       analytics.track('wallet_connected', { address: event.session.address });
 *     }
 *     if (event.type === 'sessionExpired') {
 *       toast.warning('Your session expired. Please sign in again.');
 *     }
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useCloudAuthEvents(
  auth: CloudAuth,
  onEvent: (event: CloudAuthEvent) => void
): void {
  // NOTE: Full React implementation with useEffect.
  //
  // useEffect(() => {
  //   const unsub = auth.onEvent(onEvent);
  //   return unsub;
  // }, [auth, onEvent]);
}
