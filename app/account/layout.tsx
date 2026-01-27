"use client";

import { useEffect } from "react";
import "@/styles/globals.css";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

import { UIProvider } from "@/components/layout/uiStore";
import { CartProvider } from "../context/CartContext";
import { useAuth } from "@/lib/auth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuth((state) => state.hydrate);
  const loading = useAuth((state) => state.loading);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <html lang="en">
      <body>
        <UIProvider>
          <CartProvider>
            <Header />

            <div className="appShell">
              <Sidebar />

              <main className="pageContentWrap">
                {loading ? (
                  <div className="p-6 text-sm opacity-70">
                    Loading session…
                  </div>
                ) : (
                  children
                )}
              </main>
            </div>
          </CartProvider>
        </UIProvider>
      </body>
    </html>
  );
}
