import { useState } from 'react';

export default function AuthPage() {
  const [step, setStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState('Ethereum');
  const [signing, setSigning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [address, setAddress] = useState('');

  const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Base'];

  const siweMessage = `cinaconnect-demo.pages.dev wants you to sign in with your Ethereum account:
0x7a3F8C12dE4bF5678901234567890AbCdEfE82b

I accept the Terms of Service: https://cinaconnect.com/terms

URI: https://cinaconnect-demo.pages.dev/
Version: 1
Chain ID: 1
Nonce: 8b3f9a2c
Issued At: 2026-05-17T13:45:00.000Z`;

  const handleConnect = () => { setAddress('0x7a3F8C12dE4bF5678901234567890AbCdEfE82b'); setStep(2); };
  const handleSign = () => { setSigning(true); setTimeout(() => { setSigning(false); setStep(3); }, 1500); };
  const handleVerify = () => { setVerified(true); setStep(4); };
  const handleReset = () => { setStep(1); setAddress(''); setVerified(false); setSigning(false); };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">CinaConnect</a>
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-3">Sign-In with Ethereum</h1>
          <p className="text-gray-400">Wallet-native authentication. No passwords. No emails. Just your wallet.</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Connect', 'Sign', 'Verify', 'Profile'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${step > i + 1 ? 'bg-green-500/20 text-green-400' : step === i + 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 3 && <div className={`w-4 h-px ${step > i + 1 ? 'bg-green-500/40' : 'bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Connect */}
        {step === 1 && (
          <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-center">Step 1: Connect Wallet</h2>
            <div className="flex gap-2 flex-wrap justify-center">
              {chains.map(c => (
                <button key={c} onClick={() => setSelectedChain(c)} className={`px-4 py-2 rounded-xl text-sm transition-all ${selectedChain === c ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{c}</button>
              ))}
            </div>
            <button onClick={handleConnect} className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20">
              Connect to {selectedChain}
            </button>
          </div>
        )}

        {/* Step 2: Sign */}
        {step === 2 && (
          <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-center">Step 2: Sign Message</h2>
            <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs text-gray-400 whitespace-pre-wrap border border-gray-800 max-h-48 overflow-y-auto">
              {siweMessage}
            </div>
            <button onClick={handleSign} disabled={signing} className={`w-full py-4 rounded-xl font-semibold transition-all ${signing ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20'}`}>
              {signing ? (
                <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />Signing...</span>
              ) : 'Sign Message'}
            </button>
          </div>
        )}

        {/* Step 3: Verify */}
        {step === 3 && (
          <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-center">Step 3: Verify Signature</h2>
            <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between text-sm mb-2"><span className="text-gray-500">Address</span><span className="font-mono text-xs">{address}</span></div>
              <div className="flex items-center justify-between text-sm mb-2"><span className="text-gray-500">Signature</span><span className="font-mono text-xs">0x1a2b3c4d...</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Nonce</span><span className="font-mono text-xs">8b3f9a2c</span></div>
            </div>
            <button onClick={handleVerify} className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20">
              Verify Signature
            </button>
          </div>
        )}

        {/* Step 4: Profile */}
        {step === 4 && (
          <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-green-500/20 p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl mb-4">✓</div>
              <h2 className="text-xl font-semibold text-green-400">Authenticated!</h2>
            </div>
            <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Address</span><span className="font-mono text-xs">{address}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Chain</span><span className="text-sm">{selectedChain}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Nonce</span><span className="font-mono text-xs">8b3f9a2c</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Verified</span><span className="text-green-400">✓ True</span></div>
            </div>
            <button onClick={handleReset} className="w-full py-3 rounded-xl font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all">
              Reset Demo
            </button>
          </div>
        )}

        {/* Code Example */}
        <div className="mt-8 bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Implement SIWE in 3 Lines</h2>
          <pre className="bg-gray-950 rounded-xl p-4 font-mono text-sm text-gray-300 overflow-x-auto">
{`import { SIWEAuth } from '@cinaconnect/core-sdk';

const siwe = new SIWEAuth(connector, { domain: 'your-app.com' });
const { address, verified } = await siwe.signIn();
if (verified) console.log('User authenticated:', address);`}</pre>
        </div>

        {/* Comparison */}
        <div className="mt-8 bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">CinaConnect vs Reown</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-gray-500"><th className="text-left p-2 font-normal">Feature</th><th className="text-center p-2 font-normal">CinaConnect</th><th className="text-center p-2 font-normal">Reown</th></tr></thead>
            <tbody>
              {[['SIWE Support','✅','✅'],['Self-Hosted','✅','❌'],['Open Source','✅','Partial'],['Free Forever','✅','Paid tiers'],['Custom SIWx','✅','✅'],['Multi-Chain','16 chains','8 chains'],['Passkey Auth','✅','❌']].map(([f, a, b], i) => (
                <tr key={f} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-2">{f}</td><td className="p-2 text-center">{a}</td><td className="p-2 text-center">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
