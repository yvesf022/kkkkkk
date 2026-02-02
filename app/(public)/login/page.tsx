"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -----------------------
     REDIRECT WHEN AUTH STATE UPDATES
  ----------------------- */
  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  /* -----------------------
     SUBMIT HANDLER
  ----------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || loading) return;

    setBusy(true);
    setError(null);

    try {
      await login(email.trim(), password);
      // ❌ DO NOT redirect here
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 380,
          padding: "40px 28px",
        }}
      >
        {/* HEADER */}
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            Sign in
          </h1>
          <p style={{ marginTop: 6, opacity: 0.6, fontWeight: 600 }}>
            Welcome back. Let’s get you in.
          </p>
        </header>

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom: 18,
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

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={busy || loading}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            marginTop: 26,
            display: "grid",
            gap: 12,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <button
            className="btn btnGhost"
            onClick={() => router.push("/store")}
          >
            Continue as guest
          </button>

          <span style={{ opacity: 0.6 }}>
            New here?
          </span>

          <button
            className="btn btnGhost"
            onClick={() => router.push("/register")}
          >
            Create an account
          </button>
        </div>
      </section>
    </main>
  );
}
