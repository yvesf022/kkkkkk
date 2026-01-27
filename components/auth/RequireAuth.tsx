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
     REDIRECT LOGIC (SAFE)
  ========================= */
  useEffect(() => {
    // 🚫 Never redirect during hydration
    if (!authReady) return;

    // ❌ Not logged in
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // ❌ Logged in but wrong role
    if (role && userRole !== role) {
      router.replace(userRole === "admin" ? "/admin" : "/account");
    }
  }, [authReady, isAuthenticated, userRole, role, router]);

  /* =========================
     RENDER LOGIC
  ========================= */

  // During hydration:
  if (!authReady) {
    // Allow layout to render skeletons
    if (allowDuringHydration && typeof children === "function") {
      return <>{children(false)}</>;
    }

    // Otherwise render nothing (but DO NOT redirect)
    return null;
  }

  // Auth resolved but not allowed
  if (!isAuthenticated) {
    return null;
  }

  if (role && userRole !== role) {
    return null;
  }

  // Auth OK
  if (typeof children === "function") {
    return <>{children(true)}</>;
  }

  return <>{children}</>;
}
