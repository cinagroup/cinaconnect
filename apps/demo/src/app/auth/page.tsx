'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet, shortenAddress } from '@/lib/useWallet';
import DemoLayout from '@/components/DemoLayout';
import { useToast } from '@/lib/toast';
import { parseMessage } from '@cinacoin/siwe';
import {
  createSiweMessage,
  signSiweMessage,
  verifySiweSignature,
} from '@/lib/siwe';
import {
  registerPasskey,
  authenticatePasskey,
  isWebAuthnSupported,
  hasPlatformAuthenticator,
  getStoredCredentials,
  getCredentialById,
  removePasskey,
} from '@/lib/passkey';
import {
  getAuthSession,
  clearAuthSession,
  isAuthenticated,
  formatSessionRemaining,
  signOut,
  type AuthSession,
} from '@/lib/authSession';

/* ── types ── */
type AuthStep = 'idle' | 'connected' | 'signing' | 'signed' | 'verifying' | 'verified' | 'error';
type PasskeyStep = 'idle' | 'registering' | 'authenticating' | 'success' | 'error';

export default function AuthPage() {
  const { account, status, error: walletError, connectors, connect, disconnect } = useWallet();
  const { success, error: toastError, info } = useToast();

  // ── SIWE state ──
  const [authStep, setAuthStep] = useState<AuthStep>('idle');
  const [siweMessage, setSiweMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; recoveredAddress: string } | null>(null);
  const [isSigningLoading, setIsSigningLoading] = useState(false);
  const [isVerifyingLoading, setIsVerifyingLoading] = useState(false);

  // ── Passkey state ──
  const [passkeyStep, setPasskeyStep] = useState<PasskeyStep>('idle');
  const [passkeyUsername, setPasskeyUsername] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyResult, setPasskeyResult] = useState<{ credentialId: string; username: string } | null>(null);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);

  // ── Session state ──
  const [session, setSession] = useState<AuthSession | null>(null);
  const [showSessionInfo, setShowSessionInfo] = useState(false);

  const isConnected = status === 'connected';

  // ── Restore session on mount ──
  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());

    hasPlatformAuthenticator().then((available) => {
      setPlatformAuthAvailable(available);
    });

    const existing = getAuthSession();
    if (existing.authenticated) {
      setSession(existing);
      if (existing.passkey.authenticated) {
        setPasskeyStep('success');
        setPasskeyResult({
          credentialId: existing.passkey.credentialId || '',
          username: existing.passkey.username || '',
        });
      }
      if (existing.siwe.verified) {
        setAuthStep('verified');
        setSiweMessage(existing.siwe.message || '');
        setSignature(existing.siwe.signature || '');
        setVerificationResult({ valid: true, recoveredAddress: existing.address || '' });
      }
    }
  }, []);

  // ── SIWE handlers ──
  const handleConnect = useCallback(async () => {
    setError(null);
    setAuthStep('idle');
    setSiweMessage('');
    setSignature('');
    setVerificationResult(null);
    setShowSessionInfo(false);

    try {
      await connect('io.metamask');
      setAuthStep('connected');
      success('Wallet Connected', 'Ready to sign SIWE message');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      setAuthStep('error');
      toastError('Connection Failed', msg);
    }
  }, [connect, success, toastError]);

  const handleSign = useCallback(async () => {
    if (!account.address || !account.chainId) {
      setError('Wallet not connected');
      setAuthStep('error');
      return;
    }

    setError(null);
    setIsSigningLoading(true);
    setAuthStep('signing');
    setSignature('');
    setVerificationResult(null);

    try {
      const { message, data } = createSiweMessage(account.address, account.chainId);
      setSiweMessage(message);

      const sig = await signSiweMessage(message, account.address);
      setSignature(sig);
      setAuthStep('signed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signing failed';
      if (msg.includes('User denied') || msg.includes('rejected') || msg.includes('User rejected')) {
        setError('Signing rejected by user');
        toastError('Signing Rejected', 'User denied the signature request');
      } else {
        setError(msg);
        toastError('Signing Failed', msg);
      }
      setAuthStep('error');
    } finally {
      setIsSigningLoading(false);
    }
  }, [account.address, account.chainId, toastError]);

  const handleVerify = useCallback(async () => {
    if (!siweMessage || !signature || !account.address) {
      setError('Missing message or signature');
      setAuthStep('error');
      return;
    }

    setError(null);
    setIsVerifyingLoading(true);
    setAuthStep('verifying');

    try {
      const result = await verifySiweSignature(account.address, siweMessage, signature);
      setVerificationResult({ valid: result.valid, recoveredAddress: result.recoveredAddress });

      if (result.valid) {
        setAuthStep('verified');
        // Restore session display
        const updated = getAuthSession();
        setSession(updated);
        success('Authentication Successful', 'Wallet ownership verified via SIWE');
      } else {
        setError(`Signature verification failed — ${result.error || 'address mismatch'}`);
        setAuthStep('error');
        toastError('Verification Failed', result.error || 'Signature does not match expected address');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setAuthStep('error');
    } finally {
      setIsVerifyingLoading(false);
    }
  }, [siweMessage, signature, account.address, success, toastError]);

  // ── Passkey handlers ──
  const handleRegisterPasskey = useCallback(async () => {
    if (!passkeyUsername.trim()) {
      setPasskeyError('Please enter a username');
      return;
    }

    setPasskeyError(null);
    setPasskeyStep('registering');

    try {
      const result = await registerPasskey(passkeyUsername.trim());
      if (result.success && result.credential) {
        setPasskeyStep('success');
        setPasskeyResult({
          credentialId: result.credential.id,
          username: result.credential.username,
        });
        const updated = getAuthSession();
        setSession(updated);
        success('Passkey Registered', `Welcome, ${result.credential.username}!`);
      } else {
        setPasskeyError(result.error || 'Registration failed');
        setPasskeyStep('error');
        toastError('Registration Failed', result.error || 'Unknown error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setPasskeyError(msg);
      setPasskeyStep('error');
      toastError('Registration Failed', msg);
    }
  }, [passkeyUsername, success, toastError]);

  const handleLoginPasskey = useCallback(async () => {
    setPasskeyError(null);
    setPasskeyStep('authenticating');

    try {
      const result = await authenticatePasskey();
      if (result.success) {
        setPasskeyStep('success');
        setPasskeyResult({
          credentialId: result.credentialId || '',
          username: result.username || '',
        });
        const updated = getAuthSession();
        setSession(updated);
        success('Passkey Authenticated', `Welcome back, ${result.username}!`);
      } else {
        setPasskeyError(result.error || 'Authentication failed');
        setPasskeyStep('error');
        toastError('Authentication Failed', result.error || 'Unknown error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setPasskeyError(msg);
      setPasskeyStep('error');
      toastError('Authentication Failed', msg);
    }
  }, [success, toastError]);

  // ── Shared handlers ──
  const handleReset = useCallback(() => {
    setAuthStep('idle');
    setSiweMessage('');
    setSignature('');
    setError(null);
    setVerificationResult(null);
    setShowSessionInfo(false);
    setPasskeyStep('idle');
    setPasskeyError(null);
    setPasskeyResult(null);
    setPasskeyUsername('');
  }, []);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    handleReset();
  }, [disconnect, handleReset]);

  const handleSignOut = useCallback(() => {
    signOut();
    handleReset();
    success('Signed Out', 'Session cleared');
  }, [handleReset, success]);

  /* ── step progress helpers ── */
  const stepLabels = ['Connect', 'Sign', 'Verify', 'Done'];
  const stepMap: Record<AuthStep, number> = {
    idle: 0, connected: 0, signing: 1, signed: 1, verifying: 2, verified: 3, error: -1,
  };
  const currentStep = stepMap[authStep];

  const storedCredentials = getStoredCredentials();
  const hasExistingPasskeys = storedCredentials.length > 0;

  return (
    <DemoLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Hero ── */}
        <section className="py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Real SIWE — EIP-4361 + Passkeys
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Sign-In With Ethereum
            </span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Authenticate with your wallet or biometrics. No passwords, no accounts.
            <br />
            <span className="text-gray-500">Powered by @cinacoin/siwe + WebAuthn Passkeys.</span>
          </p>
        </section>

        {/* ── Active Session Banner ── */}
        {session?.authenticated && (
          <div className="mb-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-400">
                  {session.address
                    ? `Authenticated: ${shortenAddress(session.address)}`
                    : `Authenticated: ${session.passkey.username}`
                  }
                </p>
                <p className="text-xs text-gray-400">
                  {session.siwe.verified ? 'SIWE verified' : 'Passkey authenticated'}
                  {' · '}
                  {formatSessionRemaining()}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 text-xs font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* ── Error Banner ── */}
        {(error || passkeyError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm text-red-400 font-medium">{error || passkeyError}</p>
              {walletError && <p className="text-xs text-red-400/70 mt-1">Wallet error: {walletError}</p>}
            </div>
          </div>
        )}

        {/* ── Two-column layout: SIWE + Passkey ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          {/* ═══════════════════════════════════════════ */}
          {/* ── SIWE Auth Panel ── */}
          {/* ═══════════════════════════════════════════ */}
          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-400">🔗</span> Wallet Auth (SIWE)
            </h2>

            {/* Step Progress */}
            <section className="mb-6">
              <div className="flex items-center justify-center gap-0">
                {stepLabels.map((label, i) => {
                  const isDone = authStep === 'verified' ? i < 3 : authStep === 'connected' && i === 0;
                  const isCurrent = currentStep === i && authStep !== 'error';
                  return (
                    <div key={label} className="flex items-center">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isDone || (authStep === 'verified' && i === 3)
                          ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                          : isCurrent
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 ring-2 ring-blue-500/20'
                          : 'bg-gray-800/40 text-gray-500 border border-gray-800'
                      }`}>
                        {isDone || (authStep === 'verified' && i === 3) ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
                            style={{ borderColor: isCurrent ? 'rgb(96 165 250)' : 'rgb(107 114 128)', color: isCurrent ? 'rgb(96 165 250)' : 'rgb(107 114 128)' }}>
                            {i + 1}
                          </span>
                        )}
                        {label}
                      </div>
                      {i < 3 && (
                        <div className={`w-4 h-0.5 mx-1 ${
                          isDone || (authStep === 'verified' && i === 3)
                            ? 'bg-green-500/40'
                            : 'bg-gray-800'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Wallet Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isConnected
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : 'bg-gray-700/50 text-gray-500 border border-gray-600/40'
                }`}>
                  <span className={`size-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {isConnected && account.address && (
                  <span className="text-xs font-mono text-gray-400">{shortenAddress(account.address)}</span>
                )}
              </div>
              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>

            {/* Chain info */}
            {isConnected && account.chainName && (
              <div className="mb-4 text-xs text-gray-500">
                <span className="text-gray-400 font-medium">{account.chainName}</span>
                <span className="mx-1">·</span>
                <span>ID: {account.chainId}</span>
              </div>
            )}

            {/* ── SIWE: Connect ── */}
            {authStep === 'idle' && !isConnected && (
              <div className="space-y-3">
                <button
                  onClick={handleConnect}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-500/20 text-sm"
                >
                  🔗 Connect Wallet & Sign
                </button>
              </div>
            )}

            {/* ── SIWE: Connected, ready to sign ── */}
            {authStep === 'connected' && isConnected && account.address && !siweMessage && (
              <button
                onClick={handleSign}
                disabled={isSigningLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50 text-sm"
              >
                {isSigningLoading ? 'Waiting for wallet...' : '✍️ Sign SIWE Message'}
              </button>
            )}

            {/* ── SIWE: Signing ── */}
            {authStep === 'signing' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Please approve the signature in your wallet.</p>
                <div className="flex items-center justify-center py-4">
                  <svg className="animate-spin w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              </div>
            )}

            {/* ── SIWE: Signed ── */}
            {authStep === 'signed' && siweMessage && signature && (
              <div className="space-y-3">
                <p className="text-sm text-green-400 font-semibold">✓ Message Signed</p>
                <div className="rounded-lg bg-gray-950 border border-gray-800 p-3">
                  <p className="text-[10px] text-gray-500 mb-1">SIWE Message:</p>
                  <pre className="font-mono text-[10px] text-gray-300 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-40 overflow-y-auto">
                    {siweMessage}
                  </pre>
                </div>
                <button
                  onClick={handleVerify}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all text-sm"
                >
                  🔐 Verify Signature
                </button>
              </div>
            )}

            {/* ── SIWE: Verifying ── */}
            {authStep === 'verifying' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Checking signature validity...</p>
                <div className="flex items-center justify-center py-4">
                  <svg className="animate-spin w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              </div>
            )}

            {/* ── SIWE: Verified ── */}
            {authStep === 'verified' && siweMessage && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm font-semibold text-green-400">✓ Authentication Successful</p>
                  <p className="text-xs text-gray-400 mt-1">Wallet ownership verified via SIWE</p>
                </div>
                {(() => {
                  try {
                    const parsed = parseMessage(siweMessage);
                    return (
                      <div className="rounded-lg bg-gray-950 border border-gray-800 p-3 space-y-1 text-[10px] font-mono text-gray-400">
                        <div className="flex justify-between"><span>Domain:</span><span className="text-gray-300">{parsed.domain}</span></div>
                        <div className="flex justify-between"><span>Nonce:</span><span className="text-gray-300">{parsed.nonce}</span></div>
                        <div className="flex justify-between"><span>Chain ID:</span><span className="text-gray-300">{parsed.chainId}</span></div>
                        <div className="flex justify-between"><span>Issued At:</span><span className="text-gray-300">{parsed.issuedAt}</span></div>
                      </div>
                    );
                  } catch {
                    return null;
                  }
                })()}
                <button
                  onClick={handleReset}
                  className="w-full py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 text-xs font-medium transition-all border border-gray-700"
                >
                  Start Over
                </button>
              </div>
            )}

            {/* ── Connected but no step active ── */}
            {isConnected && account.address && !siweMessage && authStep !== 'connected' && authStep !== 'signing' && authStep !== 'signed' && authStep !== 'verifying' && authStep !== 'verified' && authStep !== 'error' && (
              <button
                onClick={handleSign}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all text-sm"
              >
                ✍️ Sign SIWE Message
              </button>
            )}

            {/* ── SIWE Error recovery ── */}
            {authStep === 'error' && error && (
              <button
                onClick={handleReset}
                className="w-full py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 text-xs font-medium transition-all border border-gray-700"
              >
                Try Again
              </button>
            )}

            {/* SIWE info toggle */}
            <button
              onClick={() => setShowSessionInfo(!showSessionInfo)}
              className="mt-4 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showSessionInfo ? '▾ Hide SIWE Details' : '▸ Show SIWE Details'}
            </button>

            {showSessionInfo && siweMessage && (
              <div className="mt-3 rounded-lg bg-gray-950 border border-gray-800 p-3">
                <pre className="font-mono text-[10px] text-gray-300 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-60 overflow-y-auto">
                  {siweMessage}
                </pre>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* ── Passkey Auth Panel ── */}
          {/* ═══════════════════════════════════════════ */}
          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-purple-400">🔑</span> Passkey Auth
            </h2>

            {!webAuthnSupported && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-yellow-400">
                  ⚠ WebAuthn is not supported in this browser. Try Chrome, Safari, or Firefox with a security key.
                </p>
              </div>
            )}

            {/* Passkey Registration */}
            {passkeyStep === 'idle' && (
              <div className="space-y-4">
                {/* Register */}
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-2">Register New Passkey</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter username..."
                      value={passkeyUsername}
                      onChange={(e) => setPasskeyUsername(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                      disabled={!webAuthnSupported}
                    />
                    <button
                      onClick={handleRegisterPasskey}
                      disabled={!webAuthnSupported || !passkeyUsername.trim()}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Register
                    </button>
                  </div>
                  {platformAuthAvailable && (
                    <p className="text-[10px] text-gray-500 mt-1">✓ Platform authenticator available (Face ID / Touch ID / Windows Hello)</p>
                  )}
                </div>

                {/* Login with existing passkey */}
                {hasExistingPasskeys && (
                  <div className="pt-3 border-t border-gray-800">
                    <p className="text-sm font-semibold text-gray-300 mb-2">
                      Login with Passkey
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {storedCredentials.length} passkey(s) registered on this device
                    </p>
                    <button
                      onClick={handleLoginPasskey}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all text-sm"
                    >
                      🔑 Login with Passkey
                    </button>
                    {/* Show registered usernames */}
                    <div className="mt-2 space-y-1">
                      {storedCredentials.map((cred) => (
                        <div key={cred.id} className="flex items-center justify-between text-xs text-gray-400 px-2 py-1 rounded bg-gray-800/40">
                          <span className="font-mono">{cred.username}</span>
                          <button
                            onClick={() => {
                              removePasskey(cred.id);
                              setPasskeyError(`Removed passkey for "${cred.username}"`);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasExistingPasskeys && !webAuthnSupported && (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500">No passkeys registered and WebAuthn is not supported.</p>
                  </div>
                )}
              </div>
            )}

            {/* Passkey Registering */}
            {passkeyStep === 'registering' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Creating passkey for &quot;{passkeyUsername}&quot;...</p>
                <div className="flex items-center justify-center py-6">
                  <svg className="animate-spin w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 text-center">Please approve in your device&apos;s security dialog</p>
              </div>
            )}

            {/* Passkey Authenticating */}
            {passkeyStep === 'authenticating' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Authenticating with passkey...</p>
                <div className="flex items-center justify-center py-6">
                  <svg className="animate-spin w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 text-center">Please verify with your biometric/PIN</p>
              </div>
            )}

            {/* Passkey Success */}
            {passkeyStep === 'success' && passkeyResult && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm font-semibold text-green-400">✓ Authentication Successful</p>
                  <p className="text-xs text-gray-400 mt-1">Authenticated via passkey</p>
                </div>
                <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-lg">
                      {passkeyResult.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-green-400">{passkeyResult.username}</h3>
                      <p className="text-[10px] text-gray-500 font-mono break-all">ID: {passkeyResult.credentialId.slice(0, 24)}...</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 text-xs font-medium transition-all border border-gray-700"
                >
                  Start Over
                </button>
              </div>
            )}

            {/* Passkey Error */}
            {passkeyStep === 'error' && passkeyError && (
              <button
                onClick={() => {
                  setPasskeyStep('idle');
                  setPasskeyError(null);
                }}
                className="w-full py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 text-xs font-medium transition-all border border-gray-700"
              >
                Try Again
              </button>
            )}
          </div>
        </div>

        {/* ── Session Info (when authenticated) ── */}
        {session?.authenticated && (
          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-6 sm:p-8 mb-16">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-green-400">🛡️</span> Session Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {session.address && (
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
                  <p className="font-mono text-sm text-gray-300 break-all">{session.address}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[10px]">SIWE</span>
                  </p>
                </div>
              )}
              {session.passkey.username && (
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Passkey User</p>
                  <p className="text-sm text-gray-300 font-semibold">{session.passkey.username}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 text-[10px]">Passkey</span>
                  </p>
                </div>
              )}
              {session.createdAt && (
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Session Started</p>
                  <p className="text-sm text-gray-300">{new Date(session.createdAt).toLocaleString()}</p>
                </div>
              )}
              {session.expiresAt && (
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Session Expires</p>
                  <p className="text-sm text-gray-300">{new Date(session.expiresAt).toLocaleString()}</p>
                  <p className="text-xs text-green-400 mt-1">{formatSessionRemaining()}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowSessionInfo(!showSessionInfo)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 text-sm font-medium transition-all border border-gray-700"
              >
                {showSessionInfo ? 'Hide Details' : 'Show Raw Session'}
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>

            {showSessionInfo && (
              <div className="mt-4 rounded-lg bg-gray-950 border border-gray-800 p-4">
                <pre className="font-mono text-[10px] text-gray-400 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── Info Section ── */}
        <section className="mb-16">
          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-6 sm:p-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-green-400">📋</span> How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SIWE */}
              <div>
                <h4 className="text-base font-semibold text-blue-400 mb-3">🔗 SIWE (Sign-In With Ethereum)</h4>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>
                    <strong className="text-gray-300">1. Connect</strong> — Connect your wallet via <code className="text-blue-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">eth_requestAccounts</code>.
                  </p>
                  <p>
                    <strong className="text-gray-300">2. Sign</strong> — Sign a SIWE message (EIP-4361) via <code className="text-blue-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">personal_sign</code>.
                  </p>
                  <p>
                    <strong className="text-gray-300">3. Verify</strong> — Verify the signature matches the address in the message.
                  </p>
                </div>
              </div>
              {/* Passkey */}
              <div>
                <h4 className="text-base font-semibold text-purple-400 mb-3">🔑 Passkey (WebAuthn)</h4>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>
                    <strong className="text-gray-300">1. Register</strong> — Create a passkey via <code className="text-purple-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">navigator.credentials.create()</code>.
                  </p>
                  <p>
                    <strong className="text-gray-300">2. Login</strong> — Authenticate via <code className="text-purple-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">navigator.credentials.get()</code>.
                  </p>
                  <p>
                    <strong className="text-gray-300">3. Verify</strong> — Session persisted in localStorage with 24h expiry.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-gray-950 border border-gray-800 p-4 font-mono text-xs text-gray-300 overflow-x-auto">
              <pre>{`// SIWE — Sign-In With Ethereum
const { message } = createSiweMessage(address, chainId);
const signature = await signSiweMessage(message, address);
const result = await verifySiweSignature(address, message, signature);

// Passkey — WebAuthn
const result = await registerPasskey('username');
const auth = await authenticatePasskey();`}</pre>
            </div>
          </div>
        </section>

        {/* ── Supported Chains ── */}
        <section className="py-12 border-t border-gray-800/50 mb-16">
          <p className="text-center text-sm text-gray-500 mb-8 uppercase tracking-wider font-medium">
            Supported Chains
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {[
              { name: 'Ethereum', symbol: 'Ξ', color: 'from-blue-400 to-indigo-500' },
              { name: 'Polygon', symbol: '⬡', color: 'from-purple-400 to-violet-600' },
              { name: 'Arbitrum', symbol: 'λ', color: 'from-sky-400 to-blue-600' },
              { name: 'Base', symbol: '⊙', color: 'from-blue-500 to-cyan-400' },
            ].map((chain) => (
              <div
                key={chain.name}
                className="group flex flex-col items-center gap-2 px-5 py-4 rounded-2xl bg-gray-800/30 border border-gray-800 hover:border-gray-600 transition-all cursor-default"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${chain.color} flex items-center justify-center text-lg font-bold shadow-lg group-hover:scale-110 transition-transform`}>
                  {chain.symbol}
                </div>
                <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                  {chain.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DemoLayout>
  );
}
