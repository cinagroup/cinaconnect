import DemoLayout from '@/components/DemoLayout';

interface ChainDemo {
  id: string;
  name: string;
  icon: string;
  color: string;
  adapter: string;
  wallets: string[];
}

const CHAINS: ChainDemo[] = [
  {
    id: 'evm',
    name: 'EVM Chains',
    icon: '⬡',
    color: 'from-blue-500 to-cyan-500',
    adapter: 'EvmAdapter',
    wallets: ['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Rabby'],
  },
  {
    id: 'solana',
    name: 'Solana',
    icon: '◎',
    color: 'from-purple-500 to-green-500',
    adapter: 'SolanaChainAdapter',
    wallets: ['Phantom', 'Solflare', 'Backpack'],
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    icon: '₿',
    color: 'from-orange-500 to-yellow-500',
    adapter: 'BitcoinChainAdapter',
    wallets: ['Xverse', 'Leather', 'Unisat'],
  },
];

export default function MultiChainPage() {
  return (
    <DemoLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Multi-Chain Demo</h1>
          <p className="text-gray-400">
            OnChainUX supports EVM, Solana, and Bitcoin — all through a unified API.
          </p>
        </div>

        <div className="space-y-4">
          {CHAINS.map((chain) => (
            <div
              key={chain.id}
              className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
            >
              <div className={`h-1 bg-gradient-to-r ${chain.color}`} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{chain.icon}</span>
                  <div>
                    <h2 className="text-xl font-semibold">{chain.name}</h2>
                    <code className="text-sm text-blue-400">{chain.adapter}</code>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Supported Wallets</h3>
                  <div className="flex flex-wrap gap-2">
                    {chain.wallets.map((wallet) => (
                      <span
                        key={wallet}
                        className="px-3 py-1.5 bg-gray-700/50 rounded-lg text-sm text-gray-300"
                      >
                        {wallet}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700/50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Balance</span>
                      <p className="font-semibold">0.00</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="font-semibold text-yellow-400">Disconnected</p>
                    </div>
                  </div>
                </div>

                <button className={`w-full py-3 bg-gradient-to-r ${chain.color} rounded-xl font-semibold hover:opacity-90 transition-opacity`}>
                  Connect {chain.name}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cross-Chain Flow */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4">Cross-Chain Flow</h2>
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="bg-gray-700 rounded-lg px-4 py-3">
              <span className="text-gray-400">From</span>
              <p className="font-semibold">Ethereum</p>
            </div>
            <span className="text-2xl text-gray-500">→</span>
            <div className="bg-gray-700 rounded-lg px-4 py-3">
              <span className="text-gray-400">Bridge</span>
              <p className="font-semibold">OnChainUX Relay</p>
            </div>
            <span className="text-2xl text-gray-500">→</span>
            <div className="bg-gray-700 rounded-lg px-4 py-3">
              <span className="text-gray-400">To</span>
              <p className="font-semibold">Solana</p>
            </div>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}
