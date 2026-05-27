'use client';

import { useState, useCallback, useEffect } from 'react';
import DemoLayout from '@/components/DemoLayout';
import { useWallet, shortenAddress } from '@/lib/useWallet';
import { useToast } from '@/lib/toast';

/* ── theme presets ── */

const THEMES: Record<string, { name: string; bg: string; card: string; border: string; primary: string; text: string; accent: string }> = {
  dark: {
    name: 'Dark',
    bg: 'bg-gray-950',
    card: 'bg-gray-800/60',
    border: 'border-gray-700/50',
    primary: 'from-blue-500 to-purple-600',
    text: 'text-white',
    accent: 'text-blue-400',
  },
  light: {
    name: 'Light',
    bg: 'bg-gray-100',
    card: 'bg-white/80',
    border: 'border-gray-300/50',
    primary: 'from-blue-500 to-purple-600',
    text: 'text-gray-900',
    accent: 'text-blue-600',
  },
  midnight: {
    name: 'Midnight',
    bg: 'bg-slate-950',
    card: 'bg-slate-900/60',
    border: 'border-slate-700/50',
    primary: 'from-indigo-500 to-blue-600',
    text: 'text-slate-100',
    accent: 'text-indigo-400',
  },
  neon: {
    name: 'Neon',
    bg: 'bg-gray-950',
    card: 'bg-gray-900/70',
    border: 'border-green-500/30',
    primary: 'from-green-400 to-emerald-600',
    text: 'text-green-100',
    accent: 'text-green-400',
  },
  sunset: {
    name: 'Sunset',
    bg: 'bg-gray-950',
    card: 'bg-gray-900/60',
    border: 'border-orange-500/30',
    primary: 'from-orange-500 to-pink-600',
    text: 'text-orange-100',
    accent: 'text-orange-400',
  },
  ocean: {
    name: 'Ocean',
    bg: 'bg-slate-950',
    card: 'bg-slate-900/50',
    border: 'border-cyan-500/30',
    primary: 'from-cyan-500 to-teal-600',
    text: 'text-cyan-100',
    accent: 'text-cyan-400',
  },
  rose: {
    name: 'Rose',
    bg: 'bg-gray-950',
    card: 'bg-gray-900/60',
    border: 'border-pink-500/30',
    primary: 'from-pink-500 to-rose-600',
    text: 'text-pink-100',
    accent: 'text-pink-400',
  },
  minimal: {
    name: 'Minimal',
    bg: 'bg-gray-950',
    card: 'bg-gray-900/30',
    border: 'border-gray-800/40',
    primary: 'from-gray-400 to-gray-600',
    text: 'text-gray-200',
    accent: 'text-gray-400',
  },
};

/* ── code block ── */

function CodeBlock({ code, lang = 'tsx' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-700/40">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/60 border-b border-gray-700/40">
        <span className="text-[10px] text-gray-500 font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className={`text-[10px] px-2 py-0.5 rounded transition-all ${
            copied ? 'text-emerald-400 bg-emerald-500/15' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs text-gray-300 font-mono overflow-x-auto bg-gray-950/50 leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

/* ── component showcase card ── */

function ComponentShowcase({
  title,
  description,
  preview,
  code,
  theme,
}: {
  title: string;
  description: string;
  preview: React.ReactNode;
  code: string;
  theme: (typeof THEMES)['dark'];
}) {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className={`${theme.card} backdrop-blur-xl rounded-2xl border ${theme.border} overflow-hidden`}>
      <div className="px-5 py-4 border-b border-gray-700/30 flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-bold ${theme.text}`}>{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => setShowCode(!showCode)}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
            showCode
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-gray-700/40 text-gray-400 border border-gray-600/40 hover:text-white'
          }`}
        >
          {showCode ? 'Hide Code' : 'Show Code'}
        </button>
      </div>

      {/* Preview */}
      <div className="p-5">{preview}</div>

      {/* Code */}
      {showCode && (
        <div className="border-t border-gray-700/30">
          <div className="p-5">
            <CodeBlock code={code} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── main page ── */

export default function ComponentsPage() {
  const { account, status, connectors, connect } = useWallet();
  const { success } = useToast();
  const isConnected = status === 'connected';

  const [themeKey, setThemeKey] = useState('dark');
  const theme = THEMES[themeKey];

  return (
    <DemoLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            Component Gallery
          </h1>
          <p className="text-gray-400 text-sm">Browse all CinaCoin components with live theme previews</p>
        </div>

        {/* ── Theme Switcher ── */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50">
            <h2 className="text-lg font-bold text-white">🎨 Theme Preview</h2>
            <p className="text-xs text-gray-500 mt-1">Switch themes to see all components update in real-time</p>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setThemeKey(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    themeKey === key
                      ? `bg-gradient-to-r ${t.primary} text-white shadow-lg`
                      : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:text-white hover:border-gray-600'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Buttons ── */}
        <ComponentShowcase
          title="Buttons"
          description="Primary, secondary, ghost, and icon button variants"
          theme={theme}
          preview={
            <div className="space-y-4">
              {/* Variants */}
              <div className="flex flex-wrap gap-3 items-center">
                <button className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5">
                  Primary
                </button>
                <button className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gray-700/60 text-gray-300 border border-gray-600/40 hover:text-white hover:border-gray-500 transition-all">
                  Secondary
                </button>
                <button className="px-5 py-2.5 rounded-xl font-semibold text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Ghost
                </button>
                <button className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all">
                  Danger
                </button>
                <button className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all">
                  Success
                </button>
                <button disabled className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gray-700/40 text-gray-600 cursor-not-allowed">
                  Disabled
                </button>
              </div>

              {/* Sizes */}
              <div className="flex flex-wrap gap-3 items-center">
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  Small
                </button>
                <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  Medium
                </button>
                <button className="px-8 py-4 rounded-2xl text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  Large
                </button>
              </div>

              {/* Icon buttons */}
              <div className="flex flex-wrap gap-3 items-center">
                <button className="size-10 rounded-xl bg-gray-700/60 text-gray-400 hover:text-white hover:bg-gray-600 transition-all flex items-center justify-center text-lg">
                  🔗
                </button>
                <button className="size-10 rounded-xl bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/25 transition-all flex items-center justify-center text-lg">
                  🔄
                </button>
                <button className="size-10 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/25 transition-all flex items-center justify-center text-lg">
                  ✓
                </button>
              </div>
            </div>
          }
          code={`// Primary Button
<button className="px-5 py-2.5 rounded-xl font-semibold text-sm
  bg-gradient-to-r from-blue-600 to-purple-600 text-white
  shadow-lg shadow-blue-500/20">
  Connect Wallet
</button>

// Secondary Button
<button className="px-5 py-2.5 rounded-xl font-semibold text-sm
  bg-gray-700/60 text-gray-300 border border-gray-600/40">
  Cancel
</button>

// Ghost Button
<button className="px-5 py-2.5 rounded-xl font-semibold text-sm
  text-blue-400 hover:text-blue-300">
  Learn More
</button>

// Danger Button
<button className="px-5 py-2.5 rounded-xl font-semibold text-sm
  bg-red-500/15 text-red-400 border border-red-500/25">
  Delete
</button>

// Sizes: text-xs/rounded-lg (sm), text-sm/rounded-xl (md), text-base/rounded-2xl (lg)`}
        />

        {/* ── Wallet Card ── */}
        <ComponentShowcase
          title="Wallet Card"
          description="Connected wallet display with address, balance, and chain info"
          theme={theme}
          preview={
            <div className="space-y-3">
              {isConnected ? (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/60 border border-gray-700/40">
                  <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-500/20">
                    {account.address?.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-200 truncate">{shortenAddress(account.address ?? '')}</p>
                    <p className="text-xs text-gray-500">{account.chainName} · Chain ID: {account.chainId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-200">{account.balance} {account.chainSymbol}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/60 border border-gray-700/40">
                  <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    00
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-mono text-gray-200">0x1a2b...3c4d</p>
                    <p className="text-xs text-gray-500">Ethereum · Chain ID: 1</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-200">1.2345 ETH</p>
                  </div>
                </div>
              )}
            </div>
          }
          code={`// Wallet Card Component
<div className="flex items-center gap-4 p-4 rounded-xl
  bg-gray-900/60 border border-gray-700/40">
  {/* Avatar */}
  <div className="size-12 rounded-full bg-gradient-to-br
    from-blue-500 to-purple-600 flex items-center justify-center
    text-sm font-bold text-white">
    {address.slice(2, 4).toUpperCase()}
  </div>

  {/* Info */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-mono truncate">
      {shortenAddress(address)}
    </p>
    <p className="text-xs text-gray-500">
      {chainName} · Chain ID: {chainId}
    </p>
  </div>

  {/* Balance */}
  <div className="text-right">
    <p className="text-sm font-semibold">{balance} {symbol}</p>
  </div>
</div>`}
        />

        {/* ── Status Badges ── */}
        <ComponentShowcase
          title="Status Badges"
          description="Connection status, transaction state, and health indicators"
          theme={theme}
          preview={
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {/* Connection status */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/25">
                  <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                  Connected
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                  <span className="size-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  Connecting...
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-700/50 text-gray-500 border border-gray-600/40">
                  <span className="size-1.5 rounded-full bg-gray-500" />
                  Disconnected
                </span>
              </div>

              {/* Transaction status */}
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  ✓ Completed
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Pending
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
                  ✗ Failed
                </span>
              </div>

              {/* Health badges */}
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  ✓ Operational
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
                  ✗ Down
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  142ms
                </span>
              </div>
            </div>
          }
          code={`// Connected Status
<span className="inline-flex items-center gap-1.5 px-3 py-1.5
  rounded-full text-xs font-semibold
  bg-green-500/15 text-green-400 border border-green-500/25">
  <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
  Connected
</span>

// Pending Transaction
<span className="inline-flex items-center gap-1.5 px-3 py-1.5
  rounded-full text-xs font-semibold
  bg-amber-500/15 text-amber-400 border border-amber-500/25">
  <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
  Pending
</span>

// Latency Badge
<span className="inline-flex items-center gap-1.5 px-3 py-1.5
  rounded-full text-xs font-mono
  bg-blue-500/15 text-blue-400 border border-blue-500/25">
  142ms
</span>`}
        />

        {/* ── Chain Badges ── */}
        <ComponentShowcase
          title="Chain Badges"
          description="Visual network selectors for all supported chains"
          theme={theme}
          preview={
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Ethereum', symbol: 'ETH', color: '#627EEA', initial: 'Ξ' },
                { name: 'Polygon', symbol: 'POL', color: '#8247E5', initial: '⬡' },
                { name: 'Arbitrum', symbol: 'ARB', color: '#28A0F0', initial: 'A' },
                { name: 'Base', symbol: 'BASE', color: '#0052FF', initial: 'B' },
                { name: 'Optimism', symbol: 'OP', color: '#FF0420', initial: 'O' },
                { name: 'BNB Chain', symbol: 'BNB', color: '#F0B90B', initial: 'B' },
                { name: 'Avalanche', symbol: 'AVAX', color: '#E84142', initial: 'A' },
                { name: 'Solana', symbol: 'SOL', color: '#9945FF', initial: 'S' },
              ].map((c) => (
                <div
                  key={c.symbol}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-gray-600 transition-colors cursor-default shrink-0"
                >
                  <span
                    className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.initial}
                  </span>
                  <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          }
          code={`// Chain Badge Component
<div className="flex items-center gap-2 px-3 py-2 rounded-xl
  bg-gray-900/80 border border-gray-800 hover:border-gray-600
  transition-colors cursor-default shrink-0">
  <span className="inline-flex size-5 items-center justify-center
    rounded-full text-[10px] font-bold text-white"
    style={{ backgroundColor: chainColor }}>
    {chain.initial}
  </span>
  <span className="text-xs font-medium text-gray-400
    group-hover:text-gray-200 transition-colors">
    {chain.name}
  </span>
</div>`}
        />

        {/* ── Toggle Switch ── */}
        <ComponentShowcase
          title="Toggle Switch"
          description="On/off toggle for settings and preferences"
          theme={theme}
          preview={
            <div className="space-y-4">
              {[
                { label: 'Dark Mode', desc: 'Use dark theme throughout', checked: true },
                { label: 'Auto-Connect', desc: 'Reconnect last wallet on page load', checked: true },
                { label: 'Debug Mode', desc: 'Enable verbose logging in console', checked: false },
                { label: 'Compact Mode', desc: 'Reduce spacing and padding', checked: false },
              ].map((t) => (
                <ToggleDemo key={t.label} label={t.label} desc={t.desc} defaultChecked={t.checked} />
              ))}
            </div>
          }
          code={`// Toggle Switch Component
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={\`relative w-12 h-6 rounded-full transition-colors
        \${checked ? 'bg-blue-500' : 'bg-gray-700'}\`}
      role="switch" aria-checked={checked}
    >
      <span className={\`absolute top-0.5 left-0.5 w-5 h-5
        rounded-full bg-white shadow-md transition-transform
        \${checked ? 'translate-x-6' : 'translate-x-0'}\`} />
    </button>
  );
}

// Usage
<ToggleSwitch checked={darkMode} onChange={setDarkMode} />`}
        />

        {/* ── Input Fields ── */}
        <ComponentShowcase
          title="Input Fields"
          description="Text inputs, search bars, and select dropdowns"
          theme={theme}
          preview={
            <div className="space-y-4">
              {/* Text input */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Wallet Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-700/50 rounded-xl text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 font-mono"
                  readOnly
                  defaultValue="0x1a2b3c4d5e6f7890abcdef1234567890abcdef12"
                />
              </div>

              {/* Search input */}
              <div className="relative">
                <label className="text-sm text-gray-400 mb-1 block">Search Tokens</label>
                <input
                  type="text"
                  placeholder="Search by name, symbol, or address..."
                  className="w-full px-4 py-2.5 pl-10 bg-gray-900/60 border border-gray-700/50 rounded-xl text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <span className="absolute left-3 top-9 text-gray-500">🔍</span>
              </div>

              {/* Select */}
              <div className="relative">
                <label className="text-sm text-gray-400 mb-1 block">Network</label>
                <select className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-700/50 rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer">
                  <option>Ethereum</option>
                  <option>Polygon</option>
                  <option>Arbitrum</option>
                  <option>Base</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-9 text-gray-500 text-xs">▾</span>
              </div>
            </div>
          }
          code={`// Text Input
<input
  type="text"
  placeholder="0x..."
  className="w-full px-4 py-2.5 bg-gray-900/60 border
    border-gray-700/50 rounded-xl text-sm text-gray-200
    placeholder:text-gray-600 focus:outline-none
    focus:ring-2 focus:ring-blue-500/40 font-mono"
/>

// Search Input with icon
<div className="relative">
  <input placeholder="Search..." className="w-full px-4 py-2.5
    pl-10 bg-gray-900/60 border border-gray-700/50 rounded-xl
    text-sm placeholder:text-gray-600 focus:outline-none
    focus:ring-2 focus:ring-blue-500/40" />
  <span className="absolute left-3 top-1/2 -translate-y-1/2
    text-gray-500">🔍</span>
</div>

// Select Dropdown
<select className="w-full px-4 py-2.5 bg-gray-900/60 border
  border-gray-700/50 rounded-xl text-sm appearance-none
  focus:outline-none focus:ring-2 focus:ring-blue-500/40">
  <option>Ethereum</option>
  <option>Polygon</option>
</select>`}
        />

        {/* ── Card Layouts ── */}
        <ComponentShowcase
          title="Card Layouts"
          description="Feature cards, stat cards, and info panels"
          theme={theme}
          preview={
            <div className="space-y-4">
              {/* Feature cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🔗', title: 'Multi-Chain', desc: '16 chains, one SDK' },
                  { icon: '🔐', title: 'SIWE Auth', desc: 'Sign-In With Ethereum' },
                  { icon: '🔄', title: 'Token Swap', desc: 'DEX aggregation' },
                  { icon: '🌉', title: 'Cross-Chain', desc: 'Unified bridge routing' },
                ].map((f) => (
                  <div key={f.title} className="group p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-600 hover:bg-gray-800/60 transition-all cursor-default">
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <h4 className="text-sm font-semibold text-gray-200">{f.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: '64', label: 'Packages' },
                  { value: '16', label: 'Chains' },
                  { value: '30+', label: 'Wallets' },
                  { value: '$0', label: 'Cost' },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-gray-900/50 border border-gray-800/50">
                    <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {s.value}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          }
          code={`// Feature Card
<div className="group p-4 rounded-xl bg-gray-900/50 border
  border-gray-800 hover:border-gray-600 hover:bg-gray-800/60
  transition-all cursor-default">
  <div className="text-2xl mb-2">{icon}</div>
  <h4 className="text-sm font-semibold text-gray-200">{title}</h4>
  <p className="text-xs text-gray-500 mt-1">{description}</p>
</div>

// Stat Card
<div className="text-center p-3 rounded-xl bg-gray-900/50
  border border-gray-800/50">
  <div className="text-xl font-bold bg-gradient-to-r
    from-blue-400 to-purple-400 bg-clip-text text-transparent">
    {value}
  </div>
  <div className="text-[10px] text-gray-500 mt-1">{label}</div>
</div>`}
        />

        {/* ── Progress / Loading ── */}
        <ComponentShowcase
          title="Loading States"
          description="Spinners, skeleton loaders, and progress indicators"
          theme={theme}
          preview={
            <div className="space-y-4">
              {/* Spinners */}
              <div className="flex flex-wrap gap-6 items-center">
                <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="inline-flex items-center gap-2 text-sm text-gray-400">
                  <svg className="animate-spin h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </span>
                <div className="flex gap-1">
                  <div className="size-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>

              {/* Skeleton */}
              <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gray-700" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-700 rounded w-32 mb-2" />
                    <div className="h-2 bg-gray-800 rounded w-48" />
                  </div>
                </div>
                <div className="h-8 bg-gray-700/50 rounded" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-6 bg-gray-700/50 rounded" />
                  <div className="h-6 bg-gray-700/50 rounded" />
                  <div className="h-6 bg-gray-700/50 rounded" />
                </div>
              </div>
            </div>
          }
          code={`// Spinner
<svg className="animate-spin h-6 w-6 text-blue-400"
  viewBox="0 0 24 24" fill="none">
  <circle className="opacity-25" cx="12" cy="12" r="10"
    stroke="currentColor" strokeWidth="4" />
  <path className="opacity-75" fill="currentColor"
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
</svg>

// Skeleton Loader
<div className="animate-pulse space-y-3">
  <div className="h-3 bg-gray-700 rounded w-32" />
  <div className="h-2 bg-gray-800 rounded w-48" />
  <div className="h-8 bg-gray-700/50 rounded" />
</div>

// Dot loading
<div className="flex gap-1">
  <div className="size-2 rounded-full bg-blue-400 animate-bounce"
    style={{ animationDelay: '0ms' }} />
  <div className="size-2 rounded-full bg-blue-400 animate-bounce"
    style={{ animationDelay: '150ms' }} />
  <div className="size-2 rounded-full bg-blue-400 animate-bounce"
    style={{ animationDelay: '300ms' }} />
</div>`}
        />

        {/* ── Toast / Notification ── */}
        <ComponentShowcase
          title="Toast Notifications"
          description="Success, error, info, and warning toasts"
          theme={theme}
          preview={
            <div className="space-y-3">
              {[
                { type: 'Success', icon: '✓', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25', text: 'text-emerald-400', desc: 'Transaction completed successfully' },
                { type: 'Error', icon: '✗', bg: 'bg-red-500/15', border: 'border-red-500/25', text: 'text-red-400', desc: 'Connection failed: User rejected' },
                { type: 'Info', icon: 'ℹ', bg: 'bg-blue-500/15', border: 'border-blue-500/25', text: 'text-blue-400', desc: 'Switching to Polygon network' },
                { type: 'Warning', icon: '⚠', bg: 'bg-amber-500/15', border: 'border-amber-500/25', text: 'text-amber-400', desc: 'High gas prices detected' },
              ].map((t) => (
                <div key={t.type} className={`p-3 rounded-xl ${t.bg} border ${t.border} flex items-start gap-3`}>
                  <span className={`text-lg ${t.text}`}>{t.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${t.text}`}>{t.type}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          }
          code={`// Toast Notification
import { useToast } from '@/lib/toast';

const { success, error, info, warning } = useToast();

// Usage:
success('Wallet Connected', '0x1a2b...3c4d on Ethereum');
error('Connection Failed', 'User rejected the request');
info('Network Switch', 'Switching to Polygon');
warning('High Gas', 'Gas prices are above average');`}
        />

        {/* ── Footer ── */}
        <div className="text-center py-8 border-t border-gray-800/50">
          <p className="text-sm text-gray-600">
            CinaCoin Component Gallery — {Object.keys(THEMES).length} themes × {8} components
          </p>
          <p className="text-xs text-gray-700 mt-1">
            All components use Tailwind CSS with consistent design tokens
          </p>
        </div>
      </div>
    </DemoLayout>
  );
}

/* ── Toggle demo sub-component ── */

function ToggleDemo({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/40 border border-gray-800/40">
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-blue-500' : 'bg-gray-700'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
