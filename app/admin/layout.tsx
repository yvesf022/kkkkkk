"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth role="admin">
      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 80px)", // space for global header if any
          background: "#f1f5f9",
        }}
      >
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main
          style={{
            flex: 1,
            padding: "32px 40px",
            background: "#f1f5f9",
            overflowX: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
