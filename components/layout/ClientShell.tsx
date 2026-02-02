"use client";

import Header from "@/components/layout/Header";
import { UIProvider } from "@/components/layout/uiStore";
import { CartProvider } from "@/app/context/CartContext";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UIProvider>
      <CartProvider>
        <Header />

        {/* IMPORTANT: no global sidebar */}
        <main
          className="pageContentWrap"
          style={{
            width: "100%",
            minHeight: "calc(100vh - var(--header-height, 72px))",
          }}
        >
          {children}
        </main>
      </CartProvider>
    </UIProvider>
  );
}
