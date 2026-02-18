"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { admin, loading, hydrate } = useAdminAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/admin/login");
    }
  }, [loading, admin, router]);

  if (!admin && loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
