"use client";

import { useState } from "react";

export default function ProjectPage() {
  const [projectName, setProjectName] = useState("CinaCoin");
  const [projectId, setProjectId] = useState("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
  const [projectDescription, setProjectDescription] = useState("Full-stack Web3 SDK — Connect Everything On-Chain");
  const [projectUrl, setProjectUrl] = useState("https://cinacoin.com");
  const [iconUrl, setIconUrl] = useState("https://dashboard.cinacoin.com/favicon.ico");
  const [saved, setSaved] = useState(false);
  const [showProjectId, setShowProjectId] = useState(false);
  const [copied, setCopied] = useState(false);

  // Authentication settings
  const [siweEnabled, setSiweEnabled] = useState(true);
  const [socialLoginEnabled, setSocialLoginEnabled] = useState(true);
  const [emailLoginEnabled, setEmailLoginEnabled] = useState(true);
  const [smartAccountsEnabled, setSmartAccountsEnabled] = useState(false);

  // Feature toggles
  const [swapsEnabled, setSwapsEnabled] = useState(true);
  const [onrampEnabled, setOnrampEnabled] = useState(true);
  const [multiChainEnabled, setMultiChainEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyProjectId = () => {
    navigator.clipboard.writeText(projectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">⚙️ Project Settings</h1>
        <p className="text-dashboard-muted mt-1">
          Configure your AppKit project, authentication, and feature flags
        </p>
      </div>

      {saved && (
        <div className="bg-dashboard-success/10 border border-dashboard-success/30 rounded-xl px-4 py-3 text-sm text-dashboard-success">
          ✓ Project settings saved successfully
        </div>
      )}

      {/* Project Identity */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Project Identity</h2>

        {/* Project ID */}
        <div>
          <label className="text-sm text-dashboard-muted block mb-1">Project ID</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white font-mono">
              {showProjectId ? projectId : "•".repeat(projectId.length)}
            </code>
            <button
              onClick={() => setShowProjectId(!showProjectId)}
              className="px-3 py-2 bg-dashboard-border rounded-lg text-sm text-dashboard-muted hover:text-white transition-colors"
            >
              {showProjectId ? "🙈 Hide" : "👁️ Show"}
            </button>
            <button
              onClick={handleCopyProjectId}
              className="px-3 py-2 bg-dashboard-border rounded-lg text-sm text-dashboard-muted hover:text-white transition-colors"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
          <p className="text-xs text-dashboard-muted mt-1">
            Used to identify your project in AppKit. Copy this into your app's configuration.
          </p>
        </div>

        {/* Project Name */}
        <div>
          <label className="text-sm text-dashboard-muted block mb-1">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-dashboard-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-dashboard-muted block mb-1">Description</label>
          <textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            rows={2}
            className="w-full bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-dashboard-primary resize-none"
          />
        </div>

        {/* Project URL */}
        <div>
          <label className="text-sm text-dashboard-muted block mb-1">Project URL</label>
          <input
            type="url"
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            className="w-full bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-dashboard-primary"
          />
        </div>

        {/* Icon URL */}
        <div>
          <label className="text-sm text-dashboard-muted block mb-1">Icon URL</label>
          <input
            type="url"
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            className="w-full bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-dashboard-primary"
          />
        </div>
      </div>

      {/* Authentication */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">🔐 Authentication</h2>
        <p className="text-sm text-dashboard-muted">
          Configure authentication methods for your AppKit integration.
        </p>

        <div className="space-y-3">
          {[
            { label: "Sign-In With Ethereum (SIWE)", desc: "One-click wallet authentication", state: siweEnabled, setter: setSiweEnabled },
            { label: "Social Login", desc: "Google, X, GitHub, Discord OAuth", state: socialLoginEnabled, setter: setSocialLoginEnabled },
            { label: "Email Login", desc: "Magic link / email wallet creation", state: emailLoginEnabled, setter: setEmailLoginEnabled },
            { label: "Smart Accounts", desc: "ERC-4337 account abstraction with session keys", state: smartAccountsEnabled, setter: setSmartAccountsEnabled },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-sm text-dashboard-muted">{item.desc}</p>
              </div>
              <button
                onClick={() => item.setter(!item.state)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  item.state ? "bg-dashboard-success" : "bg-dashboard-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    item.state ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">🚀 Features</h2>
        <p className="text-sm text-dashboard-muted">
          Enable or disable AppKit features for your project.
        </p>

        <div className="space-y-3">
          {[
            { label: "Swaps", desc: "Multi-DEX swap aggregator (EVM only)", state: swapsEnabled, setter: setSwapsEnabled },
            { label: "On-Ramp", desc: "Fiat-to-crypto via multiple providers", state: onrampEnabled, setter: setOnrampEnabled },
            { label: "Multi-Chain", desc: "Support multiple networks in one modal", state: multiChainEnabled, setter: setMultiChainEnabled },
            { label: "Analytics", desc: "Track MAU, connections, and usage metrics", state: analyticsEnabled, setter: setAnalyticsEnabled },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-sm text-dashboard-muted">{item.desc}</p>
              </div>
              <button
                onClick={() => item.setter(!item.state)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  item.state ? "bg-dashboard-success" : "bg-dashboard-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    item.state ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* AppKit Integration Code */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">📦 Integration Code</h2>
        <p className="text-sm text-dashboard-muted">
          Copy this snippet to get started with AppKit in your project.
        </p>

        <div className="bg-dashboard-bg rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-dashboard-muted font-mono whitespace-pre">
{`// Install
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem

// Initialize
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { mainnet, polygon } from '@reown/appkit/networks'

createAppKit({
  adapters: [
    // Add chain adapters as needed
  ],
  networks: [mainnet, polygon],
  projectId: '${projectId}',
  features: {
    swaps: ${swapsEnabled},
    onramp: ${onrampEnabled},
    email: ${emailLoginEnabled},
    socials: ${socialLoginEnabled},
  },
  metadata: {
    name: '${projectName}',
    description: '${projectDescription}',
    url: '${projectUrl}',
    icons: ['${iconUrl}'],
  },
})`}
          </pre>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-dashboard-danger/5 rounded-xl border border-dashboard-danger/20 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-dashboard-danger">⚠️ Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Regenerate Project ID</p>
            <p className="text-sm text-dashboard-muted">This will invalidate the current project ID and require updating all apps.</p>
          </div>
          <button className="px-4 py-2 border border-dashboard-danger/30 text-dashboard-danger rounded-lg text-sm hover:bg-dashboard-danger/10 transition-colors">
            Regenerate
          </button>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-dashboard-danger/10">
          <div>
            <p className="text-white font-medium">Delete Project</p>
            <p className="text-sm text-dashboard-muted">Permanently delete this project and all associated data.</p>
          </div>
          <button className="px-4 py-2 bg-dashboard-danger text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
            Delete Project
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-dashboard-primary hover:bg-dashboard-primaryLight text-white rounded-lg font-medium transition-colors"
        >
          {saved ? "✓ Saved" : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
