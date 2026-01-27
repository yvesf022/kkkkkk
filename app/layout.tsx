"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "@/styles/globals.css";

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
  const router = useRouter();

  const hydrate = useAuth((state) => state.hydrate);
  const loading = useAuth((state) => state.loading);
  const user = useAuth((state) => state.user);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

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
