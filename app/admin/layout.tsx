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
        className="appShell"
        style={{ display: "flex", width: "100%" }}
      >
        <AdminSidebar />

        <main
          className="pageContentWrap"
          style={{ flex: 1, minWidth: 0 }}
        >
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
