"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * REQUIRE AUTH — AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - Auth is cookie-based (HTTP-only)
 * - access_token cookie is the ONLY user auth cookie
 * - /api/auth/me is the source of truth
 *
 * FRONTEND RULES:
 * - Middleware handles FIRST-LAYER protection
 * - This component handles SECOND-LAYER (UI safety)
 * - NEVER decode JWT
 * - NEVER read cookies directly
 */

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, loading, hydrate } = useAuth();

  /**
   * Hydrate user session on mount
   * (safe even if already hydrated)
   */
  useEffect(() => {
    hydrate();
    // hydrate is stable from Zustand
  }, [hydrate]);

  /**
   * Redirect logic
   */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  /**
   * Loading state
   * IMPORTANT:
   * - Do NOT render protected UI while checking auth
   */
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  /**
   * Safety fallback
   * (middleware should already block unauth users)
   */
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
