"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <section
          style={{
            maxWidth: 420,
            padding: "44px 28px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            Verify your email
          </h1>

          <p style={{ marginTop: 12, opacity: 0.65, fontWeight: 600 }}>
            We’ve sent a verification link to your email address.
          </p>

          <button
            className="btn btnPrimary"
            style={{ marginTop: 28 }}
            onClick={() => router.push("/login")}
          >
            Go to sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          padding: "44px 32px",
        }}
      >
        {/* HEADER */}
        <header style={{ marginBottom: 30 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900 }}>
            Create your account
          </h1>
          <p style={{ marginTop: 8, opacity: 0.6, fontWeight: 600 }}>
            Track orders, save preferences, and shop faster.
          </p>
        </header>

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom: 20,
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
            placeholder="Full name"
            value={fullName}
            required
            onChange={(e) => setFullName(e.target.value)}
          />

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

          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            required
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={busy}
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* FOOTER */}
        <div
          style={{
            marginTop: 28,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Already have an account?{" "}
          <button
            className="btn btnGhost"
            onClick={() => router.push("/login")}
          >
            Sign in
          </button>
        </div>
      </section>
    </main>
  );
}
