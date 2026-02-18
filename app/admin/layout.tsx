"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { admin, loading, hydrate } = useAdminAuth();

  // hydrate session
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // protect route
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
    </div>
  );
}
