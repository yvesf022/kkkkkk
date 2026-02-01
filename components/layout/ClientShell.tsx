"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";
import { CartProvider } from "@/app/context/CartContext";

/**
 * CLIENT SHELL — AUTHORITATIVE
 *
 * PURPOSE:
 * - Global UI shell ONLY
 * - Header, sidebar, layout, providers
 *
 * RULES:
 * - ❌ NO auth hydration here
 * - ❌ NO backend calls
 * - Auth is handled by RequireAuth / admin layouts
 */

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UIProvider>
      <CartProvider>
        <Header />

        <div
          className="appShell"
          style={{
            display: "flex",
            width: "100%",
            minHeight: "calc(100vh - var(--header-height, 72px))",
            alignItems: "stretch",
          }}
        >
          <Sidebar />

          <main
            className="pageContentWrap"
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            {children}
          </main>
        </div>
      </CartProvider>
    </UIProvider>
  );
}
