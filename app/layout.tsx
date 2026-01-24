import "../styles/globals.css";
import type React from "react";
import dynamic from "next/dynamic";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { UIProvider } from "@/components/layout/uiStore";
import ToastProvider from "@/components/ui/ToastProvider";
import NextTopLoader from "nextjs-toploader";
import { CartProvider } from "./context/CartContext";

/* =======================
   Client-only Sidebar
======================= */

const Sidebar = dynamic(
  () => import("@/components/layout/Sidebar"),
  { ssr: false }
);

/* =======================
   Metadata
======================= */

export const metadata = {
  title: "Karabo’s Boutique",
  description: "Futuristic neon online store UI",
};

/* =======================
   Layout
======================= */

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
                <Sidebar
                  nav={[]}
                  quickLinks={[]}
                  Item={() => null}
                />
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
