"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Props = {
  children: React.ReactNode;
  role?: "user" | "admin";
};

export default function RequireAuth({ children, role }: Props) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (role && user.role !== role) {
      router.replace(user.role === "admin" ? "/admin" : "/account");
    }
  }, [user, loading, role, router]);

  if (loading || !user) {
    return <div className="p-6 text-sm opacity-70">Checking access…</div>;
  }

  return <>{children}</>;
}
