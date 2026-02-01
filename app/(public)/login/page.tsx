"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * USER LOGIN PAGE — AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - POST /api/auth/login
 * - Cookie-based auth (HTTP-only)
 * - /api/auth/me is source of truth
 * - 401 = invalid credentials
 * - 403 = user disabled
 *
 * FRONTEND RULES:
 * - Do NOT read cookies
 * - Do NOT decode JWT
 * - Always hydrate after login
 */

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  /**
   * If already logged in, redirect away
   */
  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);
      router.replace("/account");
    } catch (err: any) {
      setError(
        err?.status === 401
          ? "Invalid email or password."
          : err?.status === 403
          ? "Your account has been disabled."
          : "Login failed. Please try again.",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-2xl font-semibold">
          Sign in to your account
        </h1>

        {error && (
          <div className="mb-4 rounded bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          Don’t have an account?{" "}
          <a href="/register" className="font-medium underline">
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
