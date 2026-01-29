"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const refreshMe = useAuth((s) => s.refreshMe);
  const loading = useAuth((s) => s.loading);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user || user.role !== "admin")
    return <div className="p-6">Unauthorized</div>;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
