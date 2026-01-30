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

  const checkedRef = useRef(false);
  const [checked, setChecked] = useState(false);

  // 🔐 SINGLE auth check (Amazon-style)
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    refresh().finally(() => setChecked(true));
  }, [refresh]);

  if (!checked || loading) {
    return (
      <div className="p-6">
        Loading admin console…
      </div>
    );
  }

  if (!admin) {
    router.replace("/admin/login");
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* LEFT SIDEBAR */}
      <AdminSidebar />

      {/* RIGHT CONTENT */}
      <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
