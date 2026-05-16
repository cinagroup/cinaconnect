import DemoLayout from '@/components/DemoLayout';

export default function HomePage() {
  return (
    <DemoLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            OnChainUX Demo
          </h1>
          <p className="text-gray-400 text-lg">
            A self-hosted wallet connection toolkit. No WalletConnect. No Reown.
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700 p-8 space-y-6">
          <h2 className="text-xl font-semibold">Connect Wallet</h2>

          <div className="flex flex-wrap gap-4 items-center">
            {/* ConnectButton would be a web component: <ocx-connect-button> */}
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors">
              Connect Wallet
            </button>

            {/* ChainSwitcher would be: <ocx-chain-switcher> */}
            <select className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm">
              <option>Ethereum</option>
              <option>Polygon</option>
              <option>Arbitrum</option>
              <option>Solana</option>
              <option>Bitcoin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {['connect-button', 'connect-modal', 'chain-switcher', 'account-modal', 'wallet-card', 'transaction-toast'].map((comp) => (
              <div key={comp} className="px-4 py-3 bg-gray-700/50 rounded-lg text-gray-300 font-mono text-xs">
                ocx-{comp}
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <a href="/swap" className="block p-6 bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-colors">
            <h3 className="text-lg font-semibold mb-2">Swap Demo →</h3>
            <p className="text-gray-400 text-sm">Cross-chain token swapping with OnChainUX Swap SDK</p>
          </a>
          <a href="/multi-chain" className="block p-6 bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-colors">
            <h3 className="text-lg font-semibold mb-2">Multi-Chain Demo →</h3>
            <p className="text-gray-400 text-sm">EVM + Solana + Bitcoin adapters in action</p>
          </a>
        </div>
      </div>
    </DemoLayout>
  );
}
