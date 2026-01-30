"use client";

import { useEffect } from "react";
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

  // 🔐 Verify admin session on first load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ⏳ Loading state
  if (loading) {
    return <div className="p-6">Checking admin session…</div>;
  }

  // 🚫 Not an admin → go to admin login
  if (!admin) {
    router.replace("/admin/login");
    return null;
  }

  // ✅ Admin authenticated
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
