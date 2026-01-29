"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Role = "user" | "admin";

type RenderProps = (authReady: boolean) => React.ReactNode;

type Props = {
  role?: Role;
  allowDuringHydration?: boolean;
  children: React.ReactNode | RenderProps;
};

export default function RequireAuth({
  children,
  role,
  allowDuringHydration = false,
}: Props) {
  const router = useRouter();

  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const userRole = useAuth((s) => s.role);
  const loading = useAuth((s) => s.loading);

  const authReady = !loading;

  /* =========================
     REDIRECT LOGIC (SECURE)
  ========================= */
  useEffect(() => {
    if (!authReady) return;

    // 🚫 Not logged in
    if (!isAuthenticated) {
      router.replace(role === "admin" ? "/admin/login" : "/login");
      return;
    }

    // 🚫 Logged in but wrong role
    if (role && userRole !== role) {
      // Admin routes must NEVER fall back to user dashboard
      router.replace(
        role === "admin" ? "/admin/login" : "/account"
      );
      return;
    }
  }, [authReady, isAuthenticated, userRole, role, router]);

  /* =========================
     RENDER LOGIC
  ========================= */

  if (!authReady) {
    if (allowDuringHydration && typeof children === "function") {
      return <>{children(false)}</>;
    }
    return null;
  }

  if (!isAuthenticated) return null;

  if (role && userRole !== role) return null;

  if (typeof children === "function") {
    return <>{children(true)}</>;
  }

  return <>{children}</>;
}
