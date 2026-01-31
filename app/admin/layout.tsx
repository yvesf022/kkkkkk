"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { useAdminAuth } from "@/lib/adminAuth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const admin = useAdminAuth((s) => s.admin);
  const loading = useAdminAuth((s) => s.loading);
  const refresh = useAdminAuth((s) => s.refresh);

  /**
   * Ensure refresh() runs exactly once
   * even under React strict mode.
   */
  const ranRef = useRef(false);
  const [ready, setReady] = useState(false);

  /* ======================
     AUTH CHECK (ONCE)
  ====================== */
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    refresh().finally(() => {
      setReady(true);
    });
  }, [refresh]);

  /* ======================
     REDIRECT IF NOT ADMIN
  ====================== */
  useEffect(() => {
    if (!ready || loading) return;
    if (!admin) {
      router.replace("/admin/login");
    }
  }, [ready, loading, admin, router]);

  /* ======================
     LOADING STATE
  ====================== */
  if (!ready || loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8fafc",
          fontWeight: 700,
        }}
      >
        Loading admin console…
      </div>
    );
  }

  /* ======================
     BLOCK RENDER UNTIL AUTH
  ====================== */
  if (!admin) {
    return null;
  }

  /* ======================
     LAYOUT
  ====================== */
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
        }}
      >
        <AdminSidebar />
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: 24,
          background: "#f8fafc",
          overflowY: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
