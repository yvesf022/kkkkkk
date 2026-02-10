"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type RequireAuthProps = { children: React.ReactNode };

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, loading, hydrate } = useAuth();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "user")) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <div style={{ minHeight: "100%", display: "grid", placeItems: "center", fontWeight: 700 }}>Loading…</div>;
  }

  if (!user || user.role !== "user") return null;

  return <>{children}</>;
}
