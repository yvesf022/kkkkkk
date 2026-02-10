"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { useAdminAuth } from "@/lib/adminAuth";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { admin, loading, hydrate } = useAdminAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/admin/login");
    }
  }, [loading, admin, router]);

  if (!admin && loading) {
    // Skeleton UI instead of blank screen
    return (
      <div className="flex min-h-screen bg-gray-50">
        <aside className="w-64 bg-slate-900 animate-pulse" />
        <main className="flex-1 p-6">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </main>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="flex min-h-screen w-full">
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40" />
      )}

      {(!isMobile || sidebarOpen) && (
        <aside className={`w-64 bg-slate-900 text-white border-r border-slate-700 ${isMobile ? "fixed inset-y-0 left-0 z-50" : ""}`}>
          <AdminSidebar onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
        </aside>
      )}

      <main className="flex-1 min-w-0 p-6 bg-gray-50 overflow-y-auto">
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="mb-4 px-4 py-2 rounded-lg border border-gray-300 bg-white font-bold"
          >
            ☰ Menu
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
