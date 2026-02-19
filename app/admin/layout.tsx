"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminInstallPrompt from "@/components/AdminInstallPrompt";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { admin, loading, hydrate } = useAdminAuth();
  const hydratedRef = useRef(false);

  // Swap manifest to admin version when inside /admin
  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"]');
    if (existing) {
      existing.setAttribute("href", "/admin-manifest.json");
    } else {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/admin-manifest.json";
      document.head.appendChild(link);
    }

    // Restore original manifest on unmount (when navigating away from admin)
    return () => {
      const el = document.querySelector('link[rel="manifest"]');
      if (el) el.setAttribute("href", "/manifest.json");
    };
  }, []);

  // Hydrate session ONCE only
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      hydrate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Protect route
  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/admin/login");
    }
  }, [loading, admin, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
        }}
      />
    );
  }

  if (!admin) return null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
      }}
    >
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: "32px",
          overflow: "auto",
        }}
      >
        {children}
      </div>

      {/* Admin-specific install prompt – shows "Install Karabo's Store Admin" */}
      <AdminInstallPrompt />
    </div>
  );
}