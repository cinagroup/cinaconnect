'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavLink {
  label: string;
  href: string;
}

interface HeaderProps {
  links: NavLink[];
  connectWalletLabel?: string;
  onConnectWallet?: () => void;
}

const defaultLinks: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Swap', href: '/swap' },
  { label: 'Tokens', href: '/tokens' },
  { label: 'Multi-Chain', href: '/multi-chain' },
  { label: 'Batch', href: '/batch' },
  { label: 'AA Demo', href: '/aa-demo' },
  { label: 'Onramp', href: '/onramp' },
  { label: 'Auth', href: '/auth' },
  { label: 'Activity', href: '/activity' },
  { label: 'Profile', href: '/profile' },
  { label: 'Settings', href: '/settings' },
];

export default function Header({
  links = defaultLinks,
  connectWalletLabel = 'Connect Wallet',
  onConnectWallet,
}: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent shrink-0"
          >
            CinaCoin
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {links.map((item) => (
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
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {onConnectWallet && (
              <button
                onClick={onConnectWallet}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
              >
                {connectWalletLabel}
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
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
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-800 bg-gray-950/95 backdrop-blur">
          <nav className="px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {links.map((item) => (
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
                {item.label}
                {pathname === item.href && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            ))}
            {onConnectWallet && (
              <button
                onClick={() => {
                  onConnectWallet();
                  setMobileOpen(false);
                }}
                className="w-full mt-2 px-4 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
              >
                {connectWalletLabel}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
