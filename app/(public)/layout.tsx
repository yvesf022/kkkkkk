"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

/**
 * PUBLIC LAYOUT — FINAL
 *
 * RULES:
 * - NEVER redirect
 * - ONLY hide content if user is logged in
 * - Let pages control navigation
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, hydrate } = useAuth();

  // Hydrate once
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Wait for auth resolution
  if (loading) return null;

  // Hide public pages when logged in
  if (user) return null;

  return <>{children}</>;
}
