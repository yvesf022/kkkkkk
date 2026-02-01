"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/lib/adminAuth";

/**
 * ADMIN LOGIN PAGE — AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - POST /api/admin/auth/login
 * - Cookie-based auth (admin_access_token)
 * - /api/admin/auth/me is the source of truth
 * - 401 = invalid credentials
 * - 403 = not an admin / access denied
 *
 * FRONTEND RULES:
 * - Do NOT read cookies
 * - Do NOT decode JWT
 * - Always rely on adminAuth.hydrate()
 */

export default function AdminLoginPage() {
  const router = useRouter();

  const {
    admin,
    login,
    loading,
    hydrate,
  } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /**
   * Hydrate admin session on mount
   * If already logged in → redirect away
   */
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading && admin) {
      router.replace("/admin");
    }
  }, [loading, admin, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await login(email, password);

      toast.success("Admin login successful");
      router.replace("/admin");
    } catch (err: any) {
      toast.error(
        err?.status === 401
          ? "Invalid admin credentials."
          : err?.status === 403
          ? "You do not have admin access."
          : "Admin login failed.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div
        className="w-full max-w-md rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-2 text-2xl font-bold">
          Admin Login
        </h1>

        <p className="mb-6 text-sm opacity-60">
          Restricted access
        </p>

        <form
          onSubmit={submit}
          className="grid gap-4"
        >
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black py-2 text-white disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Login as Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
