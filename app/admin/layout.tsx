"use client";

import { useEffect } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import "@/styles/globals.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuth((s) => s.hydrate);
  const loading = useAuth((s) => s.loading);

  // 🔑 hydrate auth from cookie (ADMIN + USER)
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (loading) {
    return null;
  }

  return (
    <RequireAuth role="admin">
      <div className="appShell" style={{ display: "flex", width: "100%" }}>
        <AdminSidebar />
        <main className="pageContentWrap" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
