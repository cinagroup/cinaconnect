"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

/**
 * Client component that conditionally renders sidebar + header
 * based on the current route.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
