"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "@/styles/globals.css";

import { Header } from "@/components/layout/Header";
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

            {/* APP SHELL */}
            <div
              className="appShell"
              style={{
                display: "flex",
                width: "100%",
                minHeight: "calc(100vh - var(--header-height, 72px))",
                alignItems: "stretch",
              }}
            >
              {/* SIDEBAR */}
              <Sidebar />

              {/* MAIN CONTENT */}
              <main
                className="pageContentWrap"
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {loading ? (
                  <div
                    style={{
                      padding: 24,
                      fontSize: 14,
                      opacity: 0.65,
                    }}
                  >
                    Loading your session…
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
