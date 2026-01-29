"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/styles/globals.css"; // ✅ CRITICAL
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      router.replace("/admin/login");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div
      className="appShell"
      style={{ display: "flex", width: "100%" }}
    >
      <AdminSidebar />

      <main
        className="pageContentWrap"
        style={{ flex: 1, minWidth: 0 }}
      >
        {children}
      </main>
    </div>
  );
}
