'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/swap', label: 'Swap', icon: '🔄' },
  { href: '/tokens', label: 'Tokens', icon: '🪙' },
  { href: '/multi-chain', label: 'Multi-Chain', icon: '🌐' },
  { href: '/batch', label: 'Batch', icon: '📦' },
  { href: '/aa-demo', label: 'AA Demo', icon: '🏦' },
  { href: '/auth', label: 'Auth', icon: '🔐' },
  { href: '/activity', label: 'Activity', icon: '📋' },
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/components', label: 'UI Kit', icon: '🎨' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function DemoLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent shrink-0">
              CinaCoin
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gray-950/95 backdrop-blur">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                  {pathname === item.href && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
          CinaCoin Demo — Self-hosted wallet connection toolkit
        </div>
      </footer>
    </div>
  );
}
