"use client";

/**
 * app/admin/layout.tsx
 *
 * FIXES:
 * #6  Admin Products "Failed to fetch" — was hitting the API before session was verified
 * #9  Admin Users client-side exception — session invalid, 401 thrown before component mounted
 * #10 Admin "Session not found" — no session check on layout mount; now redirects to login on 401
 * #11 Admin Logs client-side exception — same root cause as #9 and #10
 *
 * HOW IT WORKS:
 * - On mount, calls adminAuthApi.me() to verify the session is alive
 * - If 401/403 → redirects to /admin/login immediately
 * - Shows a loading screen while verifying — prevents child pages from
 *   firing their own API calls with an invalid session (which caused the
 *   "client-side exception" errors on products, users, and logs pages)
 * - Pings the API every 4 minutes to keep the Render free-tier server
 *   awake and the session alive (fixes intermittent "Session not found")
 */

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { adminAuthApi } from "@/lib/api";
import AdminSidebar from "@/components/admin/AdminSidebar";

const KEEP_ALIVE_MS = 4 * 60 * 1000; // 4 minutes — just under Render's 5-min spin-down

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      try {
        await adminAuthApi.me();
        if (!cancelled) setVerified(true);
      } catch (e: any) {
        if (!cancelled) {
          // Any auth failure → back to login
          router.replace("/admin/login");
        }
      }
    }

    verifySession();

    // Keep-alive ping — prevents Render free tier from spinning down
    // and invalidating the session mid-session
    intervalRef.current = setInterval(async () => {
      try { await adminAuthApi.me(); } catch { /* ignore — verifySession handles real failures */ }
    }, KEEP_ALIVE_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // While verifying, show a minimal loading screen.
  // This prevents child pages from mounting and firing API calls
  // with an invalid/expired session — which was the root cause of
  // the client-side exceptions on /admin/products, /admin/users, /admin/logs.
  if (!verified) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#f0f2f5", flexDirection: "column", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "3px solid #e2e8f0", borderTopColor: "#0033a0",
          animation: "spin 0.7s linear infinite",
        }} />
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Verifying session…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f2f5" }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: "28px 32px", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}