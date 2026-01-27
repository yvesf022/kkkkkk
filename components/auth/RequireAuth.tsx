"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Props = {
  children: React.ReactNode;
  role?: "user" | "admin";
};

export default function RequireAuth({ children, role }: Props) {
  const router = useRouter();

  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const userRole = useAuth((s) => s.role);
  const loading = useAuth((s) => s.loading);

  useEffect(() => {
    // 🚫 NEVER redirect while loading
    if (loading) return;

    // ❌ Not logged in
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // ❌ Logged in but wrong role
    if (role && userRole !== role) {
      router.replace(userRole === "admin" ? "/admin" : "/account");
    }
  }, [loading, isAuthenticated, userRole, role, router]);

  // 🚫 Do not render anything while loading
  if (loading) {
    return <div className="p-6 text-sm opacity-70">Checking access…</div>;
  }

  // ❌ Block render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // ❌ Block render if role mismatch
  if (role && userRole !== role) {
    return null;
  }

  // ✅ Access granted
  return <>{children}</>;
}
