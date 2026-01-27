"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "@/styles/globals.css";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

import { UIProvider } from "@/components/layout/uiStore";
import { CartProvider } from "../context/CartContext"; // ✅ CORRECT ORIGINAL PATH
import { useAuth } from "@/lib/auth";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const hydrate = useAuth((state) => state.hydrate);
  const user = useAuth((state) => state.user);
  const loading = useAuth((state) => state.loading);

  // hydrate auth state (account only)
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // auth guard (account only)
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="p-6 text-sm opacity-70">
        Loading your account…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <html lang="en">
      <body>
        <UIProvider>
          <CartProvider>
            <Header />

            <div className="appShell">
              <Sidebar />
              <main className="pageContentWrap">
                {children}
              </main>
            </div>
          </CartProvider>
        </UIProvider>
      </body>
    </html>
  );
}
