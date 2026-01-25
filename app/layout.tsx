import "../styles/globals.css";
import type React from "react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";
import { CartProvider } from "./context/CartContext";
import ToastProvider from "@/components/ui/ToastProvider";
import NextTopLoader from "nextjs-toploader";

export const metadata = {
  title: "Karabo’s Boutique",
  description: "Premium online store for beauty, fashion, and accessories",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UIProvider>
          {/* ✅ CartProvider MUST wrap everything */}
          <CartProvider>
            <ToastProvider />

            <NextTopLoader
              color="#ff228c"
              height={3}
              showSpinner={false}
              shadow="0 0 18px rgba(255,34,140,0.6)"
            />

            <Header />

            <main className="container">
              <div className="pageGrid">
                <div>{children}</div>
                <Sidebar />
              </div>
            </main>

            <Footer />
          </CartProvider>
        </UIProvider>
      </body>
    </html>
  );
}
