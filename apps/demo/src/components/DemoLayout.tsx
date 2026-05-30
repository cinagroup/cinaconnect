'use client';

import { ReactNode } from 'react';
import Header, { NavLink } from './Header';
import Footer from './Footer';
import { DemoDisclaimer } from './DemoDisclaimer';

const NAV_ITEMS: NavLink[] = [
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

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header links={NAV_ITEMS} />
      <main className="flex-1">
        <DemoDisclaimer compact />
        {children}
      </main>
      <Footer />
    </div>
  );
}
