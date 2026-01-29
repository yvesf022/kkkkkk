"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* GLOBAL SHOP HEADER */}
      <Header />

      <div
        className="appShell"
        style={{
          display: "flex",
          width: "100%",
          minHeight: "calc(100vh - var(--header-height, 72px))",
        }}
      >
        {/* OPTIONAL SIDEBAR (categories / filters) */}
        <Sidebar />

        {/* MAIN STORE CONTENT */}
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
    </>
  );
}
