"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * PUBLIC LAYOUT — AMAZON LEVEL
 *
 * PURPOSE:
 * - Hosts public pages (login, register, verify-email)
 * - NEVER blocks rendering
 * - Redirects logged-in users only after auth is resolved
 *
 * GUARANTEES:
 * - Login UI always visible
 * - No blank screens
 * - No auth race conditions
 * - Clean UX parity with Amazon-style flows
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  /**
   * Redirect authenticated users away from public pages
   * (runs ONLY after auth is fully resolved)
   */
  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  /**
   * BLOCK public pages ONLY when user is confirmed logged in
   * Never block while loading
   */
  if (user) {
    return null;
  }

  return (
    <main
      role="main"
      aria-label="Authentication"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px",
        background:
          "radial-gradient(1200px 600px at 10% -10%, rgba(0,153,255,.10), transparent 40%)," +
          "radial-gradient(900px 500px at 90% 10%, rgba(255,80,160,.12), transparent 45%)," +
          "linear-gradient(120deg, #eef2f8 0%, #f9fafe 45%, #fff1f6 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 14,
          padding: 28,
          boxShadow:
            "0 1px 2px rgba(0,0,0,.04), 0 12px 32px rgba(0,0,0,.08)",
          border: "1px solid rgba(0,0,0,.06)",
        }}
      >
        {children}
      </section>
    </main>
  );
}
