import type { Metadata } from 'next';
import { ToastProvider } from '@/lib/toast';
import { WorkerHealthProvider } from '@/lib/WorkerHealthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'CinaCoin — Wallet Connection Toolkit',
  description: 'Open-source wallet connection toolkit for 16 chains. Connect wallets, swap tokens, bridge chains. Self-hosted, zero vendor lock-in.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'CinaCoin — Wallet Connection Toolkit',
    description: 'Open-source wallet connection toolkit for 16 chains. Connect wallets, swap tokens, bridge chains.',
    type: 'website',
    locale: 'en_US',
    siteName: 'CinaCoin',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CinaCoin — Wallet Connection Toolkit',
    description: 'Open-source wallet connection toolkit for 16 chains.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950">
        <ToastProvider>
          <WorkerHealthProvider>
            {children}
          </WorkerHealthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
