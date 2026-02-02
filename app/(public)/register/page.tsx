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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
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
      if (!res.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main>
        <section
          style={{
            maxWidth: 420,
            margin: "64px auto",
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontWeight: 900, fontSize: 26 }}>
            Verify your email
          </h1>

          <p style={{ marginTop: 12, opacity: 0.7 }}>
            Check your inbox to activate your account.
          </p>

          <button
            className="btn btnPrimary"
            style={{ marginTop: 22 }}
            onClick={() => router.push("/login")}
          >
            Go to login
          </button>
        </section>
      </main>
    );
  }

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
          Create account
        </h1>

        <p style={{ marginTop: 6, opacity: 0.7, fontWeight: 600 }}>
          Secure, fast, and personalized shopping
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
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div
          style={{
            marginTop: 22,
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
