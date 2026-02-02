"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
          ? "Your account has been disabled. Please contact support."
          : "We couldn’t sign you in right now. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (user) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #d5d9d9",
          borderRadius: 8,
          padding: 28,
          boxShadow: "0 2px 6px rgba(0,0,0,.08)",
        }}
      >
        {/* HEADER */}
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>
            Sign in
          </h1>
          <p style={{ fontSize: 13, color: "#565959" }}>
            Access your Karabo account
          </p>
        </header>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            style={{
              border: "1px solid #cc0c39",
              background: "#fff2f2",
              padding: "12px 14px",
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 16,
              color: "#cc0c39",
            }}
          >
            <strong>There was a problem</strong>
            <div style={{ marginTop: 6 }}>{error}</div>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="email"
              style={{
                fontSize: 13,
                fontWeight: 700,
                display: "block",
                marginBottom: 4,
              }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="password"
              style={{
                fontSize: 13,
                fontWeight: 700,
                display: "block",
                marginBottom: 4,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitting}
            style={{
              width: "100%",
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 800,
              borderRadius: 8,
              border: "1px solid #fcd200",
              background:
                submitting || loading
                  ? "#f7d97a"
                  : "linear-gradient(#f7dfa5, #f0c14b)",
              cursor:
                submitting || loading ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* DIVIDER */}
        <div
          style={{
            margin: "18px 0",
            textAlign: "center",
            fontSize: 12,
            color: "#767676",
          }}
        >
          ────── or ──────
        </div>

        {/* CONTINUE AS GUEST */}
        <button
          onClick={() => router.push("/store")}
          style={{
            width: "100%",
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 8,
            border: "1px solid #adb1b8",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Continue as Guest
        </button>

        {/* FOOTER */}
        <div
          style={{
            marginTop: 18,
            fontSize: 13,
            textAlign: "center",
          }}
        >
          New to Karabo?{" "}
          <a
            href="/register"
            style={{
              color: "#0066c0",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Create your account
          </a>
        </div>
      </div>
    </div>
  );
}

/* INPUT STYLE */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid #a6a6a6",
  outline: "none",
};
