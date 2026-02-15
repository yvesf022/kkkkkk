"use client";

import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";
import { useAuth } from "@/lib/auth";

/**
 * CLIENT SHELL — FINAL & CORRECT (Zustand version)
 *
 * RESPONSIBILITIES:
 * - Global UI shell
 * - ONE-TIME auth hydration
 *
 * RULES:
 * - Hydrate auth ONCE here
 * - NO redirects here
 * - NO conditional rendering here
 *
 * NOTE:
 * - Zustand does NOT require CartProvider
 */

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuth((s) => s.hydrate);

  // 🔥 SINGLE SOURCE OF AUTH HYDRATION
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <UIProvider>
      <Header />

      <div className="appShell">
        <Sidebar />
        <main className="pageContentWrap">{children}</main>
      </div>
    </UIProvider>
  );
}
