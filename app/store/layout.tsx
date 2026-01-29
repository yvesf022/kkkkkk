"use client";

import Sidebar from "@/components/layout/Sidebar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="appShell"
      style={{
        display: "flex",
        width: "100%",
        minHeight: "calc(100vh - var(--header-height, 72px))",
      }}
    >
      {/* STORE SIDEBAR — STORE ONLY */}
      <Sidebar />

      {/* STORE CONTENT */}
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
  );
}
