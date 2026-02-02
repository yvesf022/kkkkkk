"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * PUBLIC LAYOUT — FINAL & CORRECT
 *
 * RULES:
 * - Public pages (/login, /register) must NEVER render for logged-in users
 * - Redirect immediately after auth is resolved
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, hydrate } = useAuth();

  // Hydrate auth once
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  // ⏳ Wait for auth check
  if (loading) return null;

  // 🚫 DO NOT render public pages when logged in
  if (user) return null;

  // ✅ Safe to render public pages
  return <>{children}</>;
}
