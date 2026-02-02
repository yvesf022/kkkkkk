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
    } catch (err: any) {
      setError(
        err?.status === 401
          ? "Incorrect email or password."
          : err?.status === 403
          ? "Your account has been disabled."
          : "Unable to sign in right now. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (user) return null;

  return (
    <main style={page}>
      <section style={card}>
        <h1 style={title}>Sign in</h1>
        <p style={subtitle}>Access your Karabo account</p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={form}>
          <div>
            <label style={label}>Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={input}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            style={{
              ...primaryButton,
              opacity: submitting || loading ? 0.6 : 1,
            }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={divider}>or</div>

        <button
          style={secondaryButton}
          onClick={() => router.push("/store")}
        >
          Continue as Guest
        </button>

        <div style={footer}>
          New to Karabo?{" "}
          <button
            onClick={() => router.push("/register")}
            style={linkButton}
          >
            Create your account
          </button>
        </div>
      </section>
    </main>
  );
}

/* ---------- typed styles ---------- */

const page: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#f3f4f6",
  padding: 24,
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#fff",
  padding: 28,
  borderRadius: 8,
  border: "1px solid #d5d9d9",
  boxShadow: "0 2px 6px rgba(0,0,0,.08)",
};

const title: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
};

const subtitle: React.CSSProperties = {
  fontSize: 13,
  color: "#565959",
  marginBottom: 16,
};

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #a6a6a6",
};

const form: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const primaryButton: React.CSSProperties = {
  marginTop: 8,
  padding: "10px 0",
  borderRadius: 8,
  border: "1px solid #fcd200",
  background: "linear-gradient(#f7dfa5,#f0c14b)",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  borderRadius: 8,
  border: "1px solid #adb1b8",
  background: "#fff",
  cursor: "pointer",
};

const divider: React.CSSProperties = {
  margin: "16px 0",
  textAlign: "center",
  fontSize: 12,
  color: "#767676",
};

const errorBox: React.CSSProperties = {
  background: "#fff2f2",
  border: "1px solid #cc0c39",
  color: "#cc0c39",
  padding: "10px 12px",
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 14,
};

const footer: React.CSSProperties = {
  marginTop: 16,
  textAlign: "center",
  fontSize: 13,
};

const linkButton: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#0066c0",
  fontWeight: 700,
  cursor: "pointer",
};
