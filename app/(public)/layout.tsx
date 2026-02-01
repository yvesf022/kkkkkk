"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);

  // 🔒 Redirect authenticated users away from public pages
  useEffect(() => {
    if (loading) return;

    if (user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  // ⏳ Wait for auth hydration
  if (loading) {
    return null;
  }

  // ⛔ Never render public layout for logged-in users
  if (user) {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 10% -10%, rgba(0,153,255,.12), transparent 40%)," +
          "radial-gradient(900px 500px at 90% 10%, rgba(255,80,160,.14), transparent 45%)," +
          "linear-gradient(120deg, #eef2f8 0%, #f9fafe 45%, #fff1f6 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
        }}
      >
        {children}
      </div>
    </main>
  );
}
