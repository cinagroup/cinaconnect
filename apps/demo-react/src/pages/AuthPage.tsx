import { useState } from 'react';

const SOCIAL_PROVIDERS = [
  { id: 'google', name: 'Google', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
  ) },
  { id: 'apple', name: 'Apple', icon: (
    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
  ) },
  { id: 'x', name: 'X (Twitter)', icon: (
    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ) },
  { id: 'github', name: 'GitHub', icon: (
    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
  ) },
  { id: 'discord', name: 'Discord', icon: (
    <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1201.099.246.198.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
  ) },
  { id: 'facebook', name: 'Facebook', icon: (
    <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  ) },
  { id: 'email', name: 'Email', icon: (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
  ) },
  { id: 'passkey', name: 'Passkey', icon: (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.85.577-4.147"/></svg>
  ) },
];

const WALLET_PROVIDERS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊' },
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵' },
];

export default function AuthPage() {
  const [authMethod, setAuthMethod] = useState<'wallet' | 'social'>('wallet');
  const [step, setStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState('Ethereum');
  const [signing, setSigning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedSocial, setSelectedSocial] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Base'];

  const siweMessage = `cinacoin-demo.pages.dev wants you to sign in with your Ethereum account:
0x7a3F8C12dE4bF5678901234567890AbCdEfE82b

I accept the Terms of Service: https://cinacoin.com/terms

URI: https://cinacoin-demo.pages.dev/
Version: 1
Chain ID: 1
Nonce: 8b3f9a2c
Issued At: 2026-05-17T13:45:00.000Z`;

  const handleConnect = () => { setAddress('0x7a3F8C12dE4bF5678901234567890AbCdEfE82b'); setStep(2); };
  const handleSign = () => { setSigning(true); setTimeout(() => { setSigning(false); setStep(3); }, 1500); };
  const handleVerify = () => { setVerified(true); setStep(4); };
  const handleReset = () => { setStep(1); setAddress(''); setVerified(false); setSigning(false); setSelectedSocial(null); };
  const handleSocialLogin = (id: string) => {
    setSelectedSocial(id);
    setSocialLoading(true);
    setTimeout(() => {
      setSocialLoading(false);
      setAddress(`0x${id.slice(0, 4)}...82bE`);
      setStep(4);
      setVerified(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">CinaCoin</a>
          <div className="flex items-center gap-1">
            <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Home</a>
            <a href="/swap" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Swap</a>
            <a href="/multichain" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Multi-Chain</a>
            <a href="/auth" className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-gray-800">Auth</a>
          </div>
        </div>
      </nav>

      <section className="max-w-xl mx-auto pt-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-3">Authentication</h1>
          <p className="text-gray-400">Sign in with your wallet or social account. No passwords needed.</p>
        </div>

        {/* Auth Method Tabs */}
        <div className="flex gap-2 mb-8 bg-gray-900/50 p-1 rounded-xl">
          <button onClick={() => { setAuthMethod('wallet'); setStep(1); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'wallet' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white'}`}>
            🔗 Wallet
          </button>
          <button onClick={() => { setAuthMethod('social'); setStep(1); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'social' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white'}`}>
            👤 Social
          </button>
        </div>

        {/* Wallet Auth */}
        {authMethod === 'wallet' && (
          <div className="space-y-4">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {['Connect', 'Sign', 'Verify', 'Profile'].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${step > i + 1 ? 'bg-green-500/20 text-green-400' : step === i + 1 ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/40' : 'bg-gray-800 text-gray-500'}`}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  {i < 3 && <div className={`w-8 h-px ${step > i + 1 ? 'bg-green-500/40' : 'bg-gray-800'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-center">Connect Wallet</h2>
                <div className="flex gap-2 flex-wrap justify-center mb-4">
                  {chains.map(c => (
                    <button key={c} onClick={() => setSelectedChain(c)} className={`px-4 py-2 rounded-xl text-sm transition-all ${selectedChain === c ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{c}</button>
                  ))}
                </div>
                {WALLET_PROVIDERS.map(w => (
                  <button key={w.id} onClick={handleConnect} className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all">
                    <span className="text-2xl">{w.icon}</span>
                    <div className="flex-1 text-left"><span className="font-medium">{w.name}</span><p className="text-xs text-gray-500">Connect with {w.name}</p></div>
                    <span className="text-gray-500">→</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-center">Sign Message</h2>
                <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs text-gray-400 whitespace-pre-wrap border border-gray-800 max-h-48 overflow-y-auto">{siweMessage}</div>
                <button onClick={handleSign} disabled={signing} className={`w-full py-4 rounded-xl font-semibold transition-all ${signing ? 'bg-gray-700 text-gray-500' : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20'}`}>
                  {signing ? <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />Signing...</span> : 'Sign Message'}
                </button>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-center">Verify Signature</h2>
                <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="font-mono text-xs">{address}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Signature</span><span className="font-mono text-xs">0x1a2b3c4d...</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Nonce</span><span className="font-mono text-xs">8b3f9a2c</span></div>
                </div>
                <button onClick={handleVerify} className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20">Verify</button>
              </div>
            )}
          </div>
        )}

        {/* Social Auth */}
        {authMethod === 'social' && (
          <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-center">Sign in with Social</h2>
            <p className="text-sm text-gray-500 text-center">Connect with your favorite account. We'll create a wallet for you.</p>

            <div className="grid grid-cols-2 gap-3">
              {SOCIAL_PROVIDERS.map(p => (
                <button key={p.id} onClick={() => handleSocialLogin(p.id)} disabled={socialLoading}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:-translate-y-0.5 ${selectedSocial === p.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700/50 hover:border-gray-600'} bg-gray-800/50 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}>
                  {p.icon}
                  <span className="font-medium text-sm">{p.name}</span>
                </button>
              ))}
            </div>

            {socialLoading && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-10 h-10 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Connecting to {SOCIAL_PROVIDERS.find(s => s.id === selectedSocial)?.name}...</p>
              </div>
            )}

            {selectedSocial && !socialLoading && step === 4 && (
              <div className="bg-gray-950 rounded-xl p-4 border border-green-500/20">
                <div className="text-center mb-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-xl mb-2">✓</div>
                  <h3 className="text-lg font-semibold text-green-400">Authenticated!</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Provider</span><span>{SOCIAL_PROVIDERS.find(s => s.id === selectedSocial)?.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Wallet</span><span className="font-mono text-xs">{address}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Verified</span><span className="text-green-400">✓ True</span></div>
                </div>
                <button onClick={handleReset} className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all">Reset</button>
              </div>
            )}
          </div>
        )}

        {/* Profile (both methods) */}
        {step === 4 && verified && (
          <div className="mt-6 bg-gray-900/80 backdrop-blur rounded-2xl border border-green-500/20 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold">0x</div>
              <div>
                <p className="font-mono text-sm">{address}</p>
                <p className="text-xs text-gray-500">{authMethod === 'social' ? `Signed in via ${SOCIAL_PROVIDERS.find(s => s.id === selectedSocial)?.name}` : 'Signed in with Ethereum'}</p>
              </div>
            </div>
            <button onClick={handleReset} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all">Disconnect</button>
          </div>
        )}

        {/* Comparison */}
        <div className="mt-8 bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">CinaCoin vs Reown</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-gray-500 text-xs"><th className="text-left p-2 font-normal">Feature</th><th className="text-center p-2 font-normal">CinaCoin</th><th className="text-center p-2 font-normal">Reown</th></tr></thead>
            <tbody>
              {[['Wallet Login','✅','✅'],['Social Login','✅','❌'],['Passkey Auth','✅','❌'],['Email Login','✅','❌'],['SIWE','✅','✅'],['Self-Hosted','✅','❌'],['Open Source','✅','Partial'],['Free Forever','✅','Paid tiers']].map(([f, a, b], i) => (
                <tr key={f} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-2">{f}</td><td className="p-2 text-center">{a}</td><td className="p-2 text-center">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Code Example */}
        <div className="mt-8 bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Implement Auth in 3 Lines</h2>
          <pre className="bg-gray-950 rounded-xl p-4 font-mono text-sm text-gray-300 overflow-x-auto">
{`// Wallet login (SIWE)
const { address } = await cc.connect('ethereum', 'metamask');

// Social login → auto wallet
const wallet = await cc.socialLogin('google');

// Passkey login
const wallet = await cc.passkeyLogin();`}</pre>
        </div>
      </section>
    </div>
  );
}
