"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [demoMode, setDemoMode] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In production, save to localStorage or API
    localStorage.setItem("dashboard-settings", JSON.stringify({
      refreshInterval,
      theme,
      demoMode,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">⚙️ Settings</h1>
        <p className="text-dashboard-muted mt-1">Configure dashboard preferences</p>
      </div>

      {saved && (
        <div className="bg-dashboard-success/10 border border-dashboard-success/30 rounded-xl px-4 py-3 text-sm text-dashboard-success">
          ✓ Settings saved successfully
        </div>
      )}

      {/* Display Settings */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white">Display</h2>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Theme</p>
            <p className="text-sm text-dashboard-muted">Choose dashboard appearance</p>
          </div>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === t
                    ? "bg-dashboard-primary text-white"
                    : "bg-dashboard-border text-dashboard-muted hover:text-white"
                }`}
              >
                {t === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            ))}
          </div>
        </div>

        {/* Refresh Interval */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Refresh Interval</p>
            <p className="text-sm text-dashboard-muted">How often to check service health (seconds)</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="w-32 accent-dashboard-primary"
            />
            <span className="text-white font-mono w-12 text-right">{refreshInterval}s</span>
          </div>
        </div>

        {/* Demo Mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Demo Mode</p>
            <p className="text-sm text-dashboard-muted">Show simulated metrics when services are unreachable</p>
          </div>
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              demoMode ? "bg-dashboard-primary" : "bg-dashboard-border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                demoMode ? "left-6" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Service URLs */}
      <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Service Endpoints</h2>
        <p className="text-sm text-dashboard-muted">
          Configure base URLs for each Cloudflare Worker service.
          Leave blank to use defaults.
        </p>
        <div className="space-y-3">
          {[
            { label: "RPC Proxy", env: "SERVICE_URL_RPC_PROXY", default: "https://rpc-proxy.cinacoin.workers.dev" },
            { label: "Keys Server", env: "SERVICE_URL_KEYS_SERVER", default: "https://keys-server.cinacoin.workers.dev" },
            { label: "Relay Server", env: "SERVICE_URL_RELAY_SERVER", default: "https://relay-server.cinacoin.workers.dev" },
            { label: "Notify Server", env: "SERVICE_URL_NOTIFY_SERVER", default: "https://notify-server.cinacoin.workers.dev" },
            { label: "Push Server", env: "SERVICE_URL_PUSH_SERVER", default: "https://push-server.cinacoin.workers.dev" },
          ].map((svc) => (
            <div key={svc.env} className="flex items-center gap-3">
              <span className="text-sm text-dashboard-muted w-28">{svc.label}</span>
              <input
                type="text"
                defaultValue={svc.default}
                className="flex-1 bg-dashboard-bg border border-dashboard-border rounded-lg px-3 py-2 text-sm text-white placeholder-dashboard-muted/50 focus:outline-none focus:border-dashboard-primary"
                placeholder="https://..."
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-dashboard-primary hover:bg-dashboard-primaryLight text-white rounded-lg font-medium transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
