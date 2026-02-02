"use client";

import { useState, useMemo } from "react";
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

  const passwordValid = useMemo(
    () => password.length >= 8 && /\d/.test(password),
    [password]
  );

  const canSubmit =
    fullName.trim().length >= 2 &&
    email &&
    passwordValid &&
    password === confirm &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <section style={card}>
        <h1>Check your email</h1>
        <p>We sent a verification link to:</p>
        <strong>{email}</strong>
        <button onClick={() => router.push("/login")}>
          Go to login
        </button>
      </section>
    );
  }

  return (
    <section style={card}>
      <h1>Create your account</h1>

      {error && <div style={errorBox}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <label>Full name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} />

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label>Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button disabled={!canSubmit}>
          {loading ? "Creating your account…" : "Create account"}
        </button>
      </form>
    </section>
  );
}

/* styles */
const card: React.CSSProperties = {
  background: "#fff",
  padding: 32,
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,.1)",
};

const errorBox: React.CSSProperties = {
  background: "#fee2e2",
  color: "#7f1d1d",
  padding: 12,
  borderRadius: 8,
  marginBottom: 12,
};
