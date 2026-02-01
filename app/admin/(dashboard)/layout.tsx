"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";

/**
 * ADMIN ROOT LAYOUT — AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - /admin/* requires authenticated ADMIN
 * - Cookie-based auth (admin_access_token)
 * - /api/admin/auth/me is the source of truth
 *
 * FRONTEND RULES:
 * - middleware.ts = first guard
 * - This layout = second guard
 * - (dashboard)/layout.tsx = third guard
 *
 * NO UI HERE BY DESIGN
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { admin, loading, hydrate } = useAdminAuth();

  /* -----------------------
     ADMIN AUTH CHECK
  ----------------------- */
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/admin/login");
    }
  }, [loading, admin, router]);

  if (loading) return null;
  if (!admin) return null;

  return <>{children}</>;
}
