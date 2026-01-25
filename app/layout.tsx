import "../styles/globals.css";
import type React from "react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";
import ToastProvider from "@/components/ui/ToastProvider";
import NextTopLoader from "nextjs-toploader";
import { CartProvider } from "./context/CartContext";

export const metadata = {
  title: "Karabo’s Boutique",
  description: "Futuristic neon online store UI",
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
                <Sidebar />
                <div>{children}</div>
              </div>
            </main>

            <Footer />
          </CartProvider>
        </UIProvider>
      </body>
    </html>
  );
}
