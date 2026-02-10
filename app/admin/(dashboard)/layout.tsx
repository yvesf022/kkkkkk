"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { useAdminAuth } from "@/lib/adminAuth";

/**
 * ADMIN DASHBOARD LAYOUT — AUTHORITATIVE
 *
 * - This is the ONLY place hydrate() is allowed
 * - Protects all admin dashboard routes
 */

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { admin, loading, hydrate } = useAdminAuth();

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
     HYDRATE ONCE
  ----------------------- */
  useEffect(() => {
    hydrate();
    // hydrate must run ONCE
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------
     REDIRECT IF NOT ADMIN
  ----------------------- */
  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/admin/login");
    }
  }, [loading, admin, router]);

  /* -----------------------
     LOADING STATE
  ----------------------- */
  if (loading) {
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
      {/* MOBILE OVERLAY */}
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

      {/* SIDEBAR */}
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
