"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ============ REDIRECT IF ALREADY LOGGED IN ============ */
  useEffect(() => {
    if (!loading && user) {
      // Redirect based on role
      if (user.role === "user") {
        router.replace("/account");
      } else if (user.role === "admin") {
        // Block admin from user login
        toast.error("Admin accounts should use /admin/login");
        router.replace("/admin/login");
      }
    }
  }, [loading, user, router]);

  /* ============ LOGIN HANDLER ============ */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || loading) return;

    setBusy(true);
    setError(null);

    try {
      await login(email.trim(), password);

      // ✅ CRITICAL: Check role after login
      // The useAuth will update, so we need to wait
      // The useEffect above will handle redirect

    } catch (err: any) {
      // Check if it's an admin trying to log in
      if (err.message?.includes("admin") || err.message?.includes("Admin")) {
        setError("Admin accounts should use the admin login page.");
        setTimeout(() => {
          router.push("/admin/login");
        }, 2000);
      } else {
        setError("Incorrect email or password.");
      }
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
        background:
          "radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.15), transparent 40%), radial-gradient(900px 500px at 90% 10%, rgba(236,72,153,0.18), transparent 45%), linear-gradient(120deg, #eef2f8 0%, #f9fafe 45%, #fff1f6 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "44px 36px",
        }}
      >
        {/* CARD WRAPPER */}
        <div
          style={{
            padding: 40,
            borderRadius: 22,
            background: "linear-gradient(135deg, #ffffff, #f8fbff)",
            boxShadow: "0 30px 80px rgba(15,23,42,0.15)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          {/* HEADER */}
          <header style={{ marginBottom: 32, textAlign: "center" }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
              Welcome Back
            </h1>
            <p style={{ fontSize: 15, opacity: 0.65, fontWeight: 600 }}>
              Sign in to your account
            </p>
          </header>

          {/* ERROR MESSAGE */}
          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: "14px 16px",
                borderRadius: 14,
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: 14,
                fontWeight: 700,
                textAlign: "center",
                border: "1px solid #fecaca",
              }}
            >
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 8,
                  opacity: 0.8,
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.15)",
                  fontSize: 15,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.95)",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 4px rgba(99,102,241,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(15,23,42,0.15)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 8,
                  opacity: 0.8,
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.15)",
                  fontSize: 15,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.95)",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 4px rgba(99,102,241,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(15,23,42,0.15)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btnPrimary"
              disabled={busy || loading}
              style={{
                marginTop: 8,
                width: "100%",
                fontSize: 16,
                padding: "16px",
              }}
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* FOOTER ACTIONS */}
          <div
            style={{
              marginTop: 32,
              paddingTop: 24,
              borderTop: "1px solid rgba(15,23,42,0.08)",
              display: "grid",
              gap: 16,
              textAlign: "center",
            }}
          >
            <button
              className="btn btnGhost"
              onClick={() => router.push("/store")}
              style={{ width: "100%" }}
            >
              Continue as Guest
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                opacity: 0.6,
                justifyContent: "center",
              }}
            >
              <span>New here?</span>
              <button
                onClick={() => router.push("/register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6366f1",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Create account
              </button>
            </div>

            {/* ADMIN LOGIN LINK */}
            <div
              style={{
                fontSize: 13,
                opacity: 0.5,
                marginTop: 8,
              }}
            >
              Admin?{" "}
              <button
                onClick={() => router.push("/admin/login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6366f1",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Sign in here
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
