"use client";

import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";
import { useAuth } from "@/lib/auth";
import FloatingCartButton from "@/components/store/FloatingCartButton";

/**
 * CLIENT SHELL — PRODUCTION DOMINATION VERSION
 *
 * RESPONSIBILITIES:
 * - Global layout shell
 * - ONE-TIME auth hydration
 * - Global floating cart system
 *
 * RULES:
 * - Hydrate auth ONCE here
 * - NO redirects here
 * - NO conditional rendering here
 * - Floating cart must exist globally
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
      {/* HEADER */}
      <Header />

      {/* MAIN LAYOUT */}
      <div className="appShell">
        <Sidebar />
        <main className="pageContentWrap">
          {children}
        </main>
      </div>

      {/* GLOBAL FLOATING CART SYSTEM */}
      <FloatingCartButton />
    </UIProvider>
  );
}
