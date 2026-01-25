import "@/styles/globals.css";
import { UIProvider } from "@/components/layout/uiStore";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Client context provider */}
        <UIProvider>
          {/* Header */}
          <Header />

          {/* Fixed Sidebar */}
          <Sidebar />

          {/* Page content */}
          <main className="pageContentWrap">
            {children}
          </main>
        </UIProvider>
      </body>
    </html>
  );
}
