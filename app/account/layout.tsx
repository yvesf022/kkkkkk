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
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

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
