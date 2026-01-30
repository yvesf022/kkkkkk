"use client";

import { useEffect, useRef, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { useAdminAuth } from "@/lib/adminAuth";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const admin = useAdminAuth((s) => s.admin);
  const loading = useAdminAuth((s) => s.loading);
  const refresh = useAdminAuth((s) => s.refresh);

  // 🔒 ensure refresh runs ONLY once
  const didCheckRef = useRef(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (didCheckRef.current) return;
    didCheckRef.current = true;

    refresh().finally(() => {
      setChecked(true);
    });
  }, [refresh]);

  // 🚫 redirect ONLY as a side effect (Amazon rule)
  useEffect(() => {
    if (checked && !loading && !admin) {
      router.replace("/admin/login");
    }
  }, [checked, loading, admin, router]);

  // ⏳ Still checking session
  if (!checked || loading) {
    return <div className="p-6">Checking admin session…</div>;
  }

  // ⛔ block render while redirecting
  if (!admin) {
    return null;
  }

  // ✅ Authenticated admin
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
