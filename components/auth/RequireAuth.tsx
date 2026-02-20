"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type RequireAuthProps = { children: React.ReactNode };

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const hydrate = useAuth(s => s.hydrate);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      hydrate();
    }
  }, []); // ← empty array, runs ONCE only — fixes React #185 infinite loop

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <div style={{ minHeight: "100%", display: "grid", placeItems: "center", fontWeight: 700 }}>Loading…</div>;
  }

  if (!user) return null;

  return <>{children}</>;
}