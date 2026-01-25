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
