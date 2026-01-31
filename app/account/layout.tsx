"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AccountSidebar from "@/components/account/AccountSidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const initialized = useAuth((s) => s.initialized);
  const refreshMe = useAuth((s) => s.refreshMe);

  // 🔐 Ensure auth is hydrated
  useEffect(() => {
    if (!initialized) {
      refreshMe();
    }
  }, [initialized, refreshMe]);

  // 🔁 Redirect ONLY after auth is known
  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace("/login");
    }
  }, [initialized, loading, user, router]);

  // ⏳ Block render until auth is ready
  if (!initialized || loading) return null;

  if (!user) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 48,
        maxWidth: 1200,
        margin: "40px auto",
        padding: "0 24px",
        alignItems: "flex-start",
      }}
    >
      <AccountSidebar />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
