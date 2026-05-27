import type { Metadata } from 'next';
import { ToastProvider } from '@/lib/toast';
import { WorkerHealthProvider } from '@/lib/WorkerHealthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'CinaCoin — Wallet Connection Toolkit',
  description: 'Open-source wallet connection toolkit for 16 chains',
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
