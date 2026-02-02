"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * PUBLIC LAYOUT — AUTHORITATIVE
 *
 * PURPOSE:
 * - Wraps public pages like /login, /register
 * - Must NEVER block rendering
 * - Must NEVER hide UI during auth hydration
 *
 * RULES:
 * - Always render children
 * - Redirect only AFTER auth is resolved
 * - Do NOT read cookies
 * - Do NOT style aggressively (respect globals.css)
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const hydrate = useAuth((s) => s.hydrate);

  // Ensure auth state is hydrated once
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect logged-in users away from public pages
  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  /**
   * CRITICAL:
   * - DO NOT return null
   * - DO NOT conditionally hide children
   * - Public pages must always render
   */

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "block",
      }}
    >
      {children}
    </main>
  );
}
