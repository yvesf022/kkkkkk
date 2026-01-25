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
            {/* Header */}
            <Header />

            {/* Fixed Sidebar */}
            <Sidebar />

            {/* Page Content */}
            <main className="pageContentWrap">
              {children}
            </main>
          </CartProvider>
        </UIProvider>
      </body>
    </html>
  );
}
