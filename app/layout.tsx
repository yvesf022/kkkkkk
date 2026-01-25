import "@/styles/globals.css";
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
        {/* Header */}
        <Header />

        {/* Fixed sidebar (NOT part of layout flow) */}
        <Sidebar />

        {/* Page content */}
        <main className="pageContentWrap">
          {children}
        </main>
      </body>
    </html>
  );
}
