"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminInstallPrompt from "@/components/AdminInstallPrompt";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { admin, loading, hydrate } = useAdminAuth();
  const hydratedRef = useRef(false);

  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"]');
    if (existing) existing.setAttribute("href", "/admin-manifest.json");
    else {
      const link = document.createElement("link");
      link.rel = "manifest"; link.href = "/admin-manifest.json";
      document.head.appendChild(link);
    }
    return () => {
      const el = document.querySelector('link[rel="manifest"]');
      if (el) el.setAttribute("href", "/manifest.json");
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) { hydratedRef.current = true; hydrate(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !admin) router.replace("/admin/login");
  }, [loading, admin, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0f1e",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Authenticating…</div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f2f5" }}>
      <AdminSidebar />

      {/* Main content area */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{
          height: 56,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 28px",
          gap: 16,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Welcome, <strong style={{ color: "#0f172a" }}>{(admin as any)?.email?.split("@")[0] ?? "Admin"}</strong>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg,#0033a0,#009543)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 14, fontWeight: 700,
          }}>
            {((admin as any)?.email?.[0] ?? "A").toUpperCase()}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          {children}
        </div>
      </div>

      <AdminInstallPrompt />
    </div>
  );
}