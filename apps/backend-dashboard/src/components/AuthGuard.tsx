"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

/**
 * Client-side auth guard: redirects to /login if not authenticated.
 * Must be used inside AuthProvider.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return; // wait for session restore

    const isLoginPage = pathname === "/login";

    if (!isLoggedIn && !isLoginPage) {
      window.location.href = "/login";
    }

    if (isLoggedIn && isLoginPage) {
      window.location.href = "/";
    }
  }, [isLoggedIn, isLoading, pathname]);

  // Show nothing while checking (avoid flash of protected content)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
