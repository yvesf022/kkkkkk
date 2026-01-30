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

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    refresh().finally(() => setChecked(true));
  }, [refresh]);

  if (!checked || loading) {
    return <div className="p-6">Loading admin console…</div>;
  }

  if (!admin) {
    router.replace("/admin/login");
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      {/* LEFT SIDEBAR */}
      <div
        style={{
          width: 260,
          flexShrink: 0, // 🔑 PREVENT COLLAPSE
        }}
      >
        <AdminSidebar />
      </div>

      {/* RIGHT CONTENT */}
      <main
        style={{
          flex: 1,               // 🔑 TAKE REMAINING SPACE
          minWidth: 0,           // 🔑 PREVENT OVERFLOW ISSUES
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
