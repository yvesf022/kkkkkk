"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AccountSidebar from "@/components/account/AccountSidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  /* -----------------------
     REDIRECT AFTER AUTH RESOLVED
  ----------------------- */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  /* -----------------------
     MOBILE DETECTION
  ----------------------- */
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* -----------------------
     LOADING STATE
  ----------------------- */
  if (loading) {
    return (
      <div style={{ padding: 40, fontWeight: 700 }}>
        Loading your account…
      </div>
    );
  }

  /* -----------------------
     BLOCK AFTER REDIRECT
  ----------------------- */
  if (!user) return null;

  /* -----------------------
     RENDER
  ----------------------- */
  return (
    <div
      style={{
        display: "flex",
        maxWidth: 1200,
        margin: "40px auto",
        padding: "0 24px",
        gap: 48,
        width: "100%",
      }}
    >
      {(!isMobile || sidebarOpen) && (
        <aside style={{ width: 260 }}>
          <AccountSidebar
            isMobile={isMobile}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>
      )}

      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
