"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * REQUIRE AUTH — FINAL & AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - Auth is cookie-based (HTTP-only)
 * - access_token cookie is the ONLY user auth cookie
 * - /api/auth/me is the source of truth
 *
 * FRONTEND RULES:
 * - NO auth in middleware
 * - Hydration happens ONCE
 * - UI guards only (backend enforces security)
 */

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, loading, hydrate } = useAuth();

  /* ======================
     HYDRATE ONCE
  ====================== */
  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ======================
     REDIRECT UNAUTH USERS
  ====================== */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  /* ======================
     LOADING STATE
  ====================== */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
        }}
      >
        Loading…
      </div>
    );
  }

  /* ======================
     SAFETY FALLBACK
  ====================== */
  if (!user) return null;

  return <>{children}</>;
}
