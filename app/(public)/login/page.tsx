"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await login(email.trim(), password);
      router.replace("/account");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (user) return null;

  return (
    <main>
      <section
        style={{
          maxWidth: 420,
          margin: "64px auto",
          padding: "32px 28px",
        }}
      >
        <h1 style={{ fontWeight: 900, fontSize: 26 }}>
          Sign in
        </h1>

        <p style={{ marginTop: 6, opacity: 0.7, fontWeight: 600 }}>
          Welcome back to Karabo
        </p>

        {error && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#fee2e2",
              color: "#7f1d1d",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ marginTop: 22, display: "grid", gap: 14 }}
        >
          <input
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={submitting || loading}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 22, textAlign: "center", opacity: 0.6 }}>
          or
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            className="btn btnGhost"
            style={{ width: "100%" }}
            onClick={() => router.push("/store")}
          >
            Continue shopping as guest
          </button>
        </div>

        <div
          style={{
            marginTop: 22,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          New to Karabo?{" "}
          <button
            className="btn btnGhost"
            onClick={() => router.push("/register")}
          >
            Create account
          </button>
        </div>
      </section>
    </main>
  );
}
