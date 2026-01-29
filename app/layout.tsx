"use client";

import "@/styles/globals.css";

import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";
import { CartProvider } from "./context/CartContext";
import { useAuth } from "@/lib/auth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const refreshMe = useAuth((state) => state.refreshMe);

  // ✅ hydrate auth ONCE — NO redirects here
  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  return (
    <html lang="en">
      <body>
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
      </body>
    </html>
  );
}
