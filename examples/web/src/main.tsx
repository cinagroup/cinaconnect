import React from 'react'
import ReactDOM from 'react-dom/client'
import { CinaConnectProvider } from '@cinaconnect/react'
import { ConnectDemo } from './components/ConnectDemo'
import { SwapDemo } from './components/SwapDemo'
import { MultiChainDemo } from './components/MultiChainDemo'
import { AuthDemo } from './components/AuthDemo'
import './index.css'

const config = {
  projectId: import.meta.env.VITE_PROJECT_ID || 'demo-project-id',
  relayUrl: import.meta.env.VITE_RELAY_URL || 'wss://relay.cinaconnect.com/v1',
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrl: 'https://rpc.cinaconnect.com/eth',
    },
    {
      id: 137,
      name: 'Polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrl: 'https://rpc.cinaconnect.com/polygon',
    },
    {
      id: 42161,
      name: 'Arbitrum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrl: 'https://rpc.cinaconnect.com/arbitrum',
    },
  ],
  metadata: {
    name: 'CinaConnect Demo',
    description: 'CinaConnect Web Example — 完整功能演示',
    url: window.location.origin,
    icons: [],
  },
  theme: {
    mode: 'dark',
    accentColor: '#3B82F6',
  },
  debug: true,
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CinaConnectProvider config={config}>
      <div className="app">
        <header className="app-header">
          <h1>🔢 CinaConnect Web Demo</h1>
          <p>自有品牌链上 UX 工具包 — 完整功能演示</p>
        </header>

        <main className="app-main">
          <section className="demo-section">
            <h2>1. 钱包连接</h2>
            <ConnectDemo />
          </section>

          <section className="demo-section">
            <h2>2. Swap 交易</h2>
            <SwapDemo />
          </section>

          <section className="demo-section">
            <h2>3. 多链切换</h2>
            <MultiChainDemo />
          </section>

          <section className="demo-section">
            <h2>4. SIWE 认证</h2>
            <AuthDemo />
          </section>
        </main>

        <footer className="app-footer">
          <p>CinaConnect v0.1.0 — MIT License</p>
        </footer>
      </div>
    </CinaConnectProvider>
  </React.StrictMode>,
)
