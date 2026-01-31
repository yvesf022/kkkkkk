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

  const ranRef = useRef(false);
  const [ready, setReady] = useState(false);

  /* -----------------------
     MOBILE DETECTION
  ----------------------- */
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* -----------------------
     AUTH CHECK (ONCE)
  ----------------------- */
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    refresh().finally(() => {
      setReady(true);
    });
  }, [refresh]);

  /* -----------------------
     REDIRECT IF NOT ADMIN
  ----------------------- */
  useEffect(() => {
    if (!ready || loading) return;
    if (!admin) {
      router.replace("/admin/login");
    }
  }, [ready, loading, admin, router]);

  /* -----------------------
     LOADING STATE
  ----------------------- */
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

  if (!admin) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      {/* =====================
          MOBILE OVERLAY
      ===================== */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.4)",
            zIndex: 40,
          }}
        />
      )}

      {/* =====================
          SIDEBAR
      ===================== */}
      {(!isMobile || sidebarOpen) && (
        <aside
          style={{
            width: 260,
            background: "#ffffff",
            borderRight: "1px solid #e5e7eb",
            position: isMobile ? "fixed" : "static",
            inset: isMobile ? "0 auto 0 0" : undefined,
            zIndex: 50,
          }}
        >
          <AdminSidebar
            onClose={() => setSidebarOpen(false)}
            isMobile={isMobile}
          />
        </aside>
      )}

      {/* =====================
          MAIN CONTENT
      ===================== */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: 24,
          background: "#f8fafc",
          overflowY: "auto",
        }}
      >
        {/* MOBILE MENU BUTTON */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 10,
              fontWeight: 800,
              border: "1px solid rgba(0,0,0,.15)",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ☰ Menu
          </button>
        )}

        {children}
      </main>
    </div>
  );
}
