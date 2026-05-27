"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    label: "Dashboard",
    items: [
      { href: "/", label: "Overview", icon: "📊" },
      { href: "/analytics", label: "Analytics", icon: "📈" },
    ],
  },
  {
    label: "Services",
    items: [
      { href: "/rpc-proxy", label: "RPC Proxy", icon: "🔄" },
      { href: "/keys-server", label: "Keys Server", icon: "🔑" },
      { href: "/relay-server", label: "Relay Server", icon: "📡" },
      { href: "/notify-server", label: "Notify Server", icon: "🔔" },
      { href: "/push-server", label: "Push Server", icon: "📱" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/project", label: "Project", icon: "📦" },
      { href: "/chains", label: "Networks", icon: "🌐" },
      { href: "/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-dashboard-surface border-r border-dashboard-border flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-dashboard-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔢</span>
          <div>
            <h1 className="text-lg font-bold text-white">CinaCoin</h1>
            <p className="text-xs text-dashboard-muted">Backend Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] uppercase tracking-wider text-dashboard-muted/60 font-semibold mb-2 px-3">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-dashboard-primary/20 text-dashboard-primaryLight"
                        : "text-dashboard-muted hover:text-white hover:bg-dashboard-border/50"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dashboard-border">
        <div className="text-xs text-dashboard-muted">
          v0.1.0 • Cloudflare Workers
        </div>
      </div>
    </aside>
  );
}
