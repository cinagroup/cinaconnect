'use client';

import { useState, useEffect } from 'react';
import DemoLayout from '@/components/DemoLayout';
import { useToast } from '@/lib/toast';
import { clearConnectionHistory, getConnectionHistory } from '@/lib/connectionHistory';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const CHAINS_PREF = [
  'Ethereum', 'Polygon', 'Arbitrum', 'Base', 'Optimism',
  'BNB Chain', 'Solana', 'Avalanche', 'TON', 'Cosmos',
];

const SETTINGS_SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'language', label: 'Language', icon: '🌐' },
  { id: 'network', label: 'Network', icon: '🌍' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
  { id: 'connectedApps', label: 'Connected Apps', icon: '📱' },
  { id: 'debug', label: 'Debug', icon: '🐛' },
  { id: 'storage', label: 'Storage', icon: '💾' },
  { id: 'connection', label: 'Connection', icon: '🔗' },
] as const;

type SectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
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
  );
}

export default function SettingsPage() {
  const { success, error, info } = useToast();

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light' | 'minimal'>('dark');
  const [autoConnect, setAutoConnect] = useState(true);
  const [preferredChain, setPreferredChain] = useState('Ethereum');
  const [language, setLanguage] = useState('en');
  const [debugMode, setDebugMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');
  const [historyCount, setHistoryCount] = useState(0);
  // Privacy
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [crashReporting, setCrashReporting] = useState(true);
  const [usageDataSharing, setUsageDataSharing] = useState(false);
  const [personalizedOffers, setPersonalizedOffers] = useState(false);
  // Connected apps
  const [connectedApps] = useState([
    { name: 'Uniswap', icon: '🦄', connected: '2 days ago', permissions: ['Wallet Connect', 'Sign Transactions'] },
    { name: 'OpenSea', icon: '🌊', connected: '1 week ago', permissions: ['Wallet Connect', 'Sign Messages'] },
    { name: 'Aave', icon: '👻', connected: '3 days ago', permissions: ['Wallet Connect', 'Sign Transactions'] },
    { name: 'Lens Protocol', icon: '📡', connected: '2 weeks ago', permissions: ['Wallet Connect', 'Sign Messages', 'Profile Update'] },
  ]);
  // Network
  const [rpcEndpoint, setRpcEndpoint] = useState('');
  const [customChainId, setCustomChainId] = useState('');
  const [autoDetectNetworks, setAutoDetectNetworks] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cinacoin_settings');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.theme) setTheme(s.theme);
        if (s.language) setLanguage(s.language);
        if (typeof s.autoConnect === 'boolean') setAutoConnect(s.autoConnect);
        if (typeof s.debugMode === 'boolean') setDebugMode(s.debugMode);
        if (typeof s.compactMode === 'boolean') setCompactMode(s.compactMode);
        if (s.preferredChain) setPreferredChain(s.preferredChain);
      }
    } catch { /* ignore */ }
    setHistoryCount(getConnectionHistory().length);
  }, []);

  useEffect(() => {
    const settings = { theme, language, autoConnect, debugMode, compactMode, preferredChain };
    localStorage.setItem('cinacoin_settings', JSON.stringify(settings));
  }, [theme, language, autoConnect, debugMode, compactMode, preferredChain]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f5f5f5';
      document.body.style.color = '#1a1a1a';
    } else {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
    return () => {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, [theme]);

  const handleClearStorage = () => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('cinacoin_'));
      keys.forEach((k) => localStorage.removeItem(k));
      clearConnectionHistory();
      setHistoryCount(0);
      setTheme('dark');
      setAutoConnect(true);
      setDebugMode(false);
      setCompactMode(false);
      setPreferredChain('Ethereum');
      setLanguage('en');
      success('Storage Cleared', `Removed ${keys.length} keys`);
    } catch (e) {
      error('Failed', 'Could not clear storage');
    }
  };

  const handleClearHistory = () => {
    clearConnectionHistory();
    setHistoryCount(0);
    success('History Cleared', 'Connection history removed');
  };

  const SectionNav = () => (
    <div className="flex flex-wrap gap-2 mb-8">
      {SETTINGS_SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => setActiveSection(s.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSection === s.id
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:text-white hover:border-gray-600'
          }`}
        >
          <span>{s.icon}</span>
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <DemoLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-400 text-sm mt-2">Customize your demo experience</p>
        </div>

        <SectionNav />

        {/* ── Appearance ── */}
        {activeSection === 'appearance' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">🎨 Theme</h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Theme Presets */}
                <div>
                  <p className="text-sm font-medium text-gray-200 mb-3">Theme Presets</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'dark', label: '🌙 Dark', desc: 'Default dark' },
                      { key: 'light', label: '☀️ Light', desc: 'Clean white' },
                      { key: 'minimal', label: '◻️ Minimal', desc: 'Distraction-free' },
                      { key: 'midnight', label: '🌌 Midnight', desc: 'Deep blue' },
                      { key: 'neon', label: '💚 Neon', desc: 'Hacker green' },
                      { key: 'sunset', label: '🌅 Sunset', desc: 'Warm orange' },
                      { key: 'ocean', label: '🌊 Ocean', desc: 'Cool cyan' },
                      { key: 'rose', label: '🌹 Rose', desc: 'Soft pink' },
                    ].map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => { setTheme(preset.key as 'dark' | 'light' | 'minimal'); success('Theme Updated', preset.label); }}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          theme === preset.key
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                            : 'bg-gray-800/40 border-gray-700/40 hover:border-gray-600 text-gray-300'
                        }`}
                      >
                        <p className="text-sm">{preset.label.split(' ')[0]}</p>
                        <p className="text-[10px] mt-0.5">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Theme Mode</p>
                    <p className="text-xs text-gray-500">Choose your base theme mode</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setTheme('dark'); success('Theme Updated', 'Switched to dark mode'); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        theme === 'dark'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600/40 hover:text-white'
                      }`}
                    >
                      🌙 Dark
                    </button>
                    <button
                      onClick={() => { setTheme('light'); success('Theme Updated', 'Switched to light mode'); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        theme === 'light'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600/40 hover:text-white'
                      }`}
                    >
                      ☀️ Light
                    </button>
                    <button
                      onClick={() => { setTheme('minimal'); success('Theme Updated', 'Switched to minimal mode'); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        theme === 'minimal'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600/40 hover:text-white'
                      }`}
                    >
                      ◻️ Minimal
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Compact Mode</p>
                    <p className="text-xs text-gray-500">Reduce spacing and padding</p>
                  </div>
                  <ToggleSwitch checked={compactMode} onChange={(v) => { setCompactMode(v); info('Compact Mode', v ? 'Enabled' : 'Disabled'); }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Language ── */}
        {activeSection === 'language' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">🌐 Language</h2>
              </div>
              <div className="p-5 space-y-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); success('Language Updated', lang.label); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      language === lang.code
                        ? 'bg-blue-500/15 border border-blue-500/30'
                        : 'bg-gray-800/40 border border-gray-700/40 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className={`text-sm font-medium ${language === lang.code ? 'text-blue-400' : 'text-gray-300'}`}>
                      {lang.label}
                    </span>
                    {language === lang.code && (
                      <span className="ml-auto text-blue-400 text-sm">✓</span>
                    )}
                  </button>
                ))}
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Note: Language selection is saved but not fully implemented in this demo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Network ── */}
        {activeSection === 'network' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">🌍 Network Settings</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Auto-Detect Networks</p>
                    <p className="text-xs text-gray-500">Automatically detect supported chains</p>
                  </div>
                  <ToggleSwitch checked={autoDetectNetworks} onChange={(v) => { setAutoDetectNetworks(v); info('Auto-Detect', v ? 'Enabled' : 'Disabled'); }} />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-200 mb-2">Preferred Network</p>
                  <div className="flex flex-wrap gap-2">
                    {CHAINS_PREF.map((chain) => (
                      <button
                        key={chain}
                        onClick={() => { setPreferredChain(chain); success('Network Changed', chain); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          preferredChain === chain
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-gray-700/50 text-gray-400 border border-gray-600/40 hover:text-white'
                        }`}
                      >
                        {chain}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-700/40 space-y-3">
                  <p className="text-sm font-medium text-gray-200">Custom RPC Endpoint</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://your-rpc-endpoint.com"
                      value={rpcEndpoint}
                      onChange={(e) => setRpcEndpoint(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
                    />
                    <button
                      onClick={() => { if (rpcEndpoint) success('RPC Updated', rpcEndpoint.slice(0, 30) + '...'); }}
                      disabled={!rpcEndpoint}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-700/40">
                  <p className="text-xs text-gray-500 mb-2">Supported RPC Networks</p>
                  {['Ethereum Mainnet', 'Polygon', 'Arbitrum One', 'Base', 'Optimism', 'BNB Chain'].map((rpc) => (
                    <div key={rpc} className="flex items-center justify-between py-2 border-b border-gray-800/30 last:border-0">
                      <span className="text-sm text-gray-300">{rpc}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Privacy ── */}
        {activeSection === 'privacy' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">🔒 Privacy & Data</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Analytics Consent</p>
                    <p className="text-xs text-gray-500">Allow anonymous usage analytics</p>
                  </div>
                  <ToggleSwitch checked={analyticsConsent} onChange={(v) => { setAnalyticsConsent(v); info('Analytics', v ? 'Enabled' : 'Disabled'); }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Crash Reporting</p>
                    <p className="text-xs text-gray-500">Send crash reports to help improve</p>
                  </div>
                  <ToggleSwitch checked={crashReporting} onChange={(v) => { setCrashReporting(v); info('Crash Reporting', v ? 'Enabled' : 'Disabled'); }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Usage Data Sharing</p>
                    <p className="text-xs text-gray-500">Share usage patterns with partners</p>
                  </div>
                  <ToggleSwitch checked={usageDataSharing} onChange={(v) => { setUsageDataSharing(v); info('Usage Data', v ? 'Enabled' : 'Disabled'); }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Personalized Offers</p>
                    <p className="text-xs text-gray-500">Receive tailored dApp recommendations</p>
                  </div>
                  <ToggleSwitch checked={personalizedOffers} onChange={(v) => { setPersonalizedOffers(v); info('Personalized Offers', v ? 'Enabled' : 'Disabled'); }} />
                </div>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm font-medium text-blue-400">Your Data Rights</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You can export or delete your data at any time. All data is stored locally and never sent to third-party servers without your consent.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => info('Export', 'Data export started...')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all"
                    >
                      Export Data
                    </button>
                    <button
                      onClick={() => { clearConnectionHistory(); setHistoryCount(0); success('Data Deleted', 'Local data cleared'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all"
                    >
                      Delete All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Connected Apps ── */}
        {activeSection === 'connectedApps' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">📱 Connected Apps</h2>
                <p className="text-xs text-gray-500 mt-1">Manage wallet connections to external applications</p>
              </div>
              <div className="p-5 space-y-3">
                {connectedApps.map((app) => (
                  <div key={app.name} className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{app.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-200">{app.name}</p>
                          <p className="text-xs text-gray-500">Connected {app.connected}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => info('Disconnected', `${app.name} disconnected`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                      >
                        Disconnect
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {app.permissions.map((perm) => (
                        <span key={perm} className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500 text-center pt-2">{connectedApps.length} apps connected</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Debug ── */}
        {activeSection === 'debug' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">🐛 Debug Options</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Debug Mode</p>
                    <p className="text-xs text-gray-500">Enable verbose logging in browser console</p>
                  </div>
                  <ToggleSwitch checked={debugMode} onChange={(v) => { setDebugMode(v); info('Debug Mode', v ? 'Enabled' : 'Disabled'); }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Auto-Connect</p>
                    <p className="text-xs text-gray-500">Automatically reconnect on page load</p>
                  </div>
                  <ToggleSwitch checked={autoConnect} onChange={(v) => { setAutoConnect(v); info('Auto-Connect', v ? 'Enabled' : 'Disabled'); }} />
                </div>

                {debugMode && (
                  <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-700/40">
                    <p className="text-xs text-gray-400 font-mono">
                      {/* Simulated debug info */}
                      Debug: ON — Verbose logging enabled<br />
                      localStorage keys: {Object.keys(typeof window !== 'undefined' ? localStorage : {}).filter((k) => k.startsWith('cinacoin_')).length} found<br />
                      Connection history: {historyCount} records<br />
                      Theme: {theme} | Language: {language}<br />
                      Auto-connect: {autoConnect ? 'YES' : 'NO'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Storage ── */}
        {activeSection === 'storage' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">💾 Storage Management</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-700/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Connection History</p>
                      <p className="text-xs text-gray-500">{historyCount} records stored</p>
                    </div>
                    <button
                      onClick={handleClearHistory}
                      disabled={historyCount === 0}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Clear History
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-700/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">All App Data</p>
                      <p className="text-xs text-gray-500">Settings, history, wallet state</p>
                    </div>
                    <button
                      onClick={handleClearStorage}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all"
                    >
                      Clear All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Connection ── */}
        {activeSection === 'connection' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white">🔗 Connection Preferences</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Auto-Connect</p>
                    <p className="text-xs text-gray-500">Reconnect last wallet on page load</p>
                  </div>
                  <ToggleSwitch checked={autoConnect} onChange={(v) => { setAutoConnect(v); info('Auto-Connect', v ? 'Enabled' : 'Disabled'); }} />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-200 mb-3">Preferred Chain</p>
                  <div className="flex flex-wrap gap-2">
                    {CHAINS_PREF.map((chain) => (
                      <button
                        key={chain}
                        onClick={() => { setPreferredChain(chain); success('Preferred Chain', chain); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          preferredChain === chain
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-gray-700/50 text-gray-400 border border-gray-600/40 hover:text-white'
                        }`}
                      >
                        {chain}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DemoLayout>
  );
}
