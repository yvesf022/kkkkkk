"use client";

import { useEffect, useRef } from "react";
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

  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const refreshMe = useAuth((s) => s.refreshMe);

  // 🧠 ensure we hydrate only once per mount
  const hasHydratedRef = useRef(false);

  /* =========================
     AUTH HYDRATION (ON-DEMAND)
  ========================= */
  useEffect(() => {
    if (hasHydratedRef.current) return;

    if (!user && !loading) {
      hasHydratedRef.current = true;
      refreshMe();
    }
  }, [user, loading, refreshMe]);

  const authReady = !loading;
  const isAuthenticated = Boolean(user);
  const userRole = user?.role;

  /* =========================
     REDIRECT LOGIC (SECURE)
  ========================= */
  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated) {
      router.replace(role === "admin" ? "/admin/login" : "/login");
      return;
    }

    if (role && userRole !== role) {
      router.replace(role === "admin" ? "/admin/login" : "/account");
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
