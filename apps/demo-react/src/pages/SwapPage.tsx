import { useState } from 'react';

/**
 * MOCK PRICES — These are illustrative only, not live data.
 * A production swap would pull prices from a DEX aggregator API
 * (e.g. 1inch, Jupiter, CoW Protocol, or on-chain oracles).
 */
const TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', balance: '2.4821', price: 2995.67, icon: 'Ξ', color: '#627EEA', chain: 'Ethereum' },
  { symbol: 'USDC', name: 'USD Coin', balance: '12,450.00', price: 1.00, icon: '$', color: '#2775CA', chain: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana', balance: '45.82', price: 178.34, icon: '◎', color: '#9945FF', chain: 'Solana' },
  { symbol: 'BTC', name: 'Bitcoin', balance: '0.1234', price: 104820, icon: '₿', color: '#F7931A', chain: 'Bitcoin' },
  { symbol: 'ARB', name: 'Arbitrum', balance: '5,200.00', price: 0.89, icon: 'λ', color: '#28A0F0', chain: 'Arbitrum' },
  { symbol: 'POL', name: 'Polygon', balance: '8,500.00', price: 0.24, icon: '⬡', color: '#8247E5', chain: 'Polygon' },
];

const RECENT_SWAPS = [
  { from: 'ETH', to: 'USDC', amount: '0.5', received: '1,497.84', route: 'Uniswap V3', status: 'completed', time: '2m ago' },
  { from: 'SOL', to: 'USDC', amount: '10.0', received: '1,783.40', route: 'Jupiter', status: 'completed', time: '15m ago' },
  { from: 'USDC', to: 'ARB', amount: '500', received: '561.80', route: 'Camelot', status: 'pending', time: '1h ago' },
  { from: 'ETH', to: 'BTC', amount: '0.1', received: '0.0028', route: 'tBTC Bridge', status: 'completed', time: '3h ago' },
];

export default function SwapPage() {
  const [fromToken, setFromToken] = useState(0);
  const [toToken, setToToken] = useState(1);
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [flipped, setFlipped] = useState(false);
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);

  const from = TOKENS[fromToken];
  const to = TOKENS[toToken];
  const amount = parseFloat(fromAmount) || 0;
  const toAmount = amount > 0 ? ((amount * from.price) / to.price).toFixed(to.price > 100 ? 6 : 2) : '';
  const usdValue = amount > 0 ? `≈ $${(amount * from.price).toFixed(2)}` : '';
  const rate = from.price > 0 ? `1 ${from.symbol} = ${(from.price / to.price).toFixed(to.price > 100 ? 6 : 4)} ${to.symbol}` : '';

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFlipped(!flipped);
  };

  const TokenSelector = ({ show, onClose, onSelect, label }: any) => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${!show && 'hidden'}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl p-4">
        <h3 className="font-semibold mb-3">{label}</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {TOKENS.map((t, i) => (
            <button key={t.symbol} onClick={() => { onSelect(i); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 transition-colors">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: t.color }}>{t.icon}</span>
              <div className="flex-1 text-left">
                <span className="font-medium text-sm">{t.symbol}</span>
                <p className="text-xs text-gray-500">{t.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">{t.balance}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">CinaCoin</a>
          <div className="flex items-center gap-1">
            <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Home</a>
            <a href="/swap" className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-gray-800">Swap</a>
            <a href="/multichain" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Multi-Chain</a>
            <a href="/auth" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Auth</a>
          </div>
        </div>
      </nav>

      {/* Swap Card */}
      <section className="max-w-md mx-auto pt-12 px-4">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Swap Tokens</h1>

        <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-4 space-y-2">
          {/* FROM */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex justify-between mb-3">
              <span className="text-xs text-gray-500">From</span>
              <span className="text-xs text-gray-500">Balance: {from.balance} {from.symbol}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowFromSelector(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors shrink-0">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: from.color }}>{from.icon}</span>
                <span className="font-semibold text-sm">{from.symbol}</span>
                <span className="text-gray-500">▾</span>
              </button>
              <input type="text" value={fromAmount} onChange={e => setFromAmount(e.target.value)} placeholder="0.0" className="flex-1 bg-transparent text-right text-2xl font-semibold outline-none placeholder:text-gray-600" />
            </div>
            {amount > 0 && <p className="text-xs text-gray-500 mt-2 text-right">{usdValue}</p>}
          </div>

          {/* Flip Arrow */}
          <div className="flex justify-center">
            <button onClick={handleFlip} className={`w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-all duration-300 ${flipped ? 'rotate-180' : ''}`}>⇅</button>
          </div>

          {/* TO */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex justify-between mb-3">
              <span className="text-xs text-gray-500">To</span>
              <span className="text-xs text-gray-500">Balance: {to.balance} {to.symbol}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowToSelector(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors shrink-0">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: to.color }}>{to.icon}</span>
                <span className="font-semibold text-sm">{to.symbol}</span>
                <span className="text-gray-500">▾</span>
              </button>
              <div className="flex-1 text-right text-2xl font-semibold text-gray-400">{toAmount || '0.0'}</div>
            </div>
          </div>
        </div>

        {/* Swap Details */}
        {amount > 0 && (
          <div className="mt-4 bg-gray-900/50 backdrop-blur rounded-2xl border border-gray-800 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                ⚠️ Mock prices — not live data
              </span>
            </div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Rate</span><span>{rate}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Network Fee</span><span className="text-green-400">~$2.34</span></div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Slippage</span>
              <div className="flex gap-1">
                {['0.1', '0.5', '1.0'].map(s => (
                  <button key={s} onClick={() => setSlippage(s)} className={`px-2 py-0.5 rounded text-xs transition-all ${slippage === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{s}%</button>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Price Impact</span><span className="text-green-400">0.02%</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Minimum Received</span><span>{(parseFloat(toAmount || '0') * 0.995).toFixed(2)} {to.symbol}</span></div>
            <div className="pt-2 border-t border-gray-800 text-xs text-gray-500">Route: {from.symbol} → {to.symbol} via Uniswap V3</div>
          </div>
        )}

        {/* Swap Button */}
        <button className={`w-full mt-4 py-4 rounded-xl font-semibold text-lg transition-all ${amount > 0 ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
          {amount > 0 ? 'Swap' : 'Enter an amount'}
        </button>

        {/* Powered by */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Powered by <span className="text-gray-400">CinaCoin Swap SDK</span>
          {' · '}<span className="text-amber-500/60">Demo mode — prices are illustrative</span>
        </p>

        {/* Recent Swaps */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recent Swaps</h2>
          <div className="bg-gray-900/50 backdrop-blur rounded-2xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  <th className="text-left p-3 font-normal">Pair</th>
                  <th className="text-left p-3 font-normal">Route</th>
                  <th className="text-left p-3 font-normal">Status</th>
                  <th className="text-right p-3 font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_SWAPS.map((s, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="p-3"><span className="font-medium">{s.from}</span><span className="text-gray-500 mx-1">→</span><span className="font-medium">{s.to}</span></td>
                    <td className="p-3 text-gray-400">{s.route}</td>
                    <td className="p-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${s.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${s.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400'}`}/>{s.status}</span></td>
                    <td className="p-3 text-right text-gray-500">{s.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <TokenSelector show={showFromSelector} onClose={() => setShowFromSelector(false)} onSelect={(i: number) => { setFromToken(i); if (i === toToken) setToToken(fromToken); }} label="Select Token" />
      <TokenSelector show={showToSelector} onClose={() => setShowToSelector(false)} onSelect={(i: number) => { setToToken(i); if (i === fromToken) setFromToken(toToken); }} label="Select Token" />
    </div>
  );
}
