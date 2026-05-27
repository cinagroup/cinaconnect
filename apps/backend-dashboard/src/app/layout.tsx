import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import AuthProvider from "@/lib/AuthProvider";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "CinaCoin — Backend Dashboard",
  description: "Management dashboard for CinaCoin Cloudflare Workers services",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dashboard-bg min-h-screen">
        <AuthProvider>
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
