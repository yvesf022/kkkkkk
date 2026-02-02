"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * USER LOGIN PAGE — AMAZON LEVEL
 *
 * PRINCIPLES:
 * - UI always renders immediately
 * - Redirect only after confirmed auth
 * - No duplicate navigation
 * - Clear, human error messages
 * - Calm, predictable UX
 */

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Redirect authenticated users away from login
   * (post-hydration only)
   */
  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  /**
   * Handle login submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;

      setError(null);
      setSubmitting(true);

      try {
        await login(email.trim(), password);
        router.replace("/account");
      } catch (err: any) {
        setError(
          err?.status === 401
            ? "The email or password you entered is incorrect."
            : err?.status === 403
            ? "Your account has been temporarily disabled."
            : "We couldn’t sign you in right now. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, login, router, submitting]
  );

  /**
   * Block rendering ONLY if user is confirmed logged in
   */
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md border">
        {/* BRAND */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Access your account securely
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitting}
            className="w-full rounded-md bg-black py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* FOOTER */}
        <div className="mt-6 text-center text-sm text-gray-600">
          New to Karabo?{" "}
          <a
            href="/register"
            className="font-medium text-black underline hover:no-underline"
          >
            Create your account
          </a>
        </div>
      </div>
    </div>
  );
}
