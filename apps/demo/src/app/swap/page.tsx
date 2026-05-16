import DemoLayout from '@/components/DemoLayout';

export default function SwapPage() {
  return (
    <DemoLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Swap Demo</h1>
          <p className="text-gray-400">Cross-chain token swap powered by OnChainUX Swap SDK</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700 p-6 space-y-4">
          {/* From Token */}
          <div className="bg-gray-700/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">From</span>
              <span className="text-sm text-gray-400">Balance: 0.00</span>
            </div>
            <div className="flex items-center gap-3">
              <select className="bg-gray-600 rounded-lg px-3 py-2 text-sm font-semibold">
                <option>ETH</option>
                <option>USDC</option>
                <option>SOL</option>
              </select>
              <input
                type="text"
                placeholder="0.0"
                className="flex-1 bg-transparent text-right text-2xl font-semibold outline-none"
              />
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center">
            <button className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500 transition-colors">
              ⇅
            </button>
          </div>

          {/* To Token */}
          <div className="bg-gray-700/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">To</span>
              <span className="text-sm text-gray-400">Balance: 0.00</span>
            </div>
            <div className="flex items-center gap-3">
              <select className="bg-gray-600 rounded-lg px-3 py-2 text-sm font-semibold">
                <option>USDC</option>
                <option>ETH</option>
                <option>BTC</option>
              </select>
              <input
                type="text"
                placeholder="0.0"
                className="flex-1 bg-transparent text-right text-2xl font-semibold outline-none"
                readOnly
              />
            </div>
          </div>

          {/* Swap Details */}
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Rate</span>
              <span>1 ETH = 3,245.67 USDC</span>
            </div>
            <div className="flex justify-between">
              <span>Network Fee</span>
              <span>~$2.34</span>
            </div>
            <div className="flex justify-between">
              <span>Slippage</span>
              <span>0.5%</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact</span>
              <span className="text-green-400">0.02%</span>
            </div>
            <div className="flex justify-between">
              <span>Minimum Received</span>
              <span>3,229.44 USDC</span>
            </div>
          </div>

          {/* Route */}
          <div className="bg-gray-700/30 rounded-lg p-3 text-xs text-gray-500">
            Route: ETH → Uniswap V3 → USDC (Ethereum Mainnet)
          </div>

          {/* Swap Button */}
          <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Connect Wallet to Swap
          </button>
        </div>
      </div>
    </DemoLayout>
  );
}
