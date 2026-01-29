"use client";

import "@/styles/globals.css";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

import { UIProvider } from "@/components/layout/uiStore";
import { CartProvider } from "./context/CartContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
                {children}
              </main>
            </div>
          </CartProvider>
        </UIProvider>
      </body>
    </html>
  );
}
