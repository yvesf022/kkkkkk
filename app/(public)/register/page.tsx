"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordRules = useMemo(() => ({
    length: password.length >= 8,
    number: /\d/.test(password),
    letter: /[a-zA-Z]/.test(password),
  }), [password]);

  const passwordValid =
    passwordRules.length &&
    passwordRules.number &&
    passwordRules.letter;

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
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: phone || null,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
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
      <main style={page}>
        <section style={card}>
          <h1 style={title}>Verify your email</h1>
          <p>We sent a verification link to:</p>
          <strong>{email}</strong>

          <button
            style={{ ...primaryButton, marginTop: 16 }}
            onClick={() => router.push("/login")}
          >
            Go to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={page}>
      <section style={card}>
        <h1 style={title}>Create account</h1>
        <p style={subtitle}>It’s quick and secure</p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={label}>Full name</label>
            <input style={input} value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          <div>
            <label style={label}>Email address</label>
            <input style={input} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div>
            <label style={label}>Mobile number (optional)</label>
            <input style={input} value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div>
            <label style={label}>Password</label>
            <input style={input} type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <div style={{ fontSize: 12, marginTop: 6 }}>
              • At least 8 characters<br />
              • Contains a letter and a number
            </div>
          </div>

          <div>
            <label style={label}>Re-enter password</label>
            <input style={input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ ...primaryButton, opacity: canSubmit ? 1 : 0.6 }}
          >
            {loading ? "Creating account…" : "Create your account"}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 12, color: "#555" }}>
          🔒 Secure registration · Email verification required
        </div>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <button style={linkButton} onClick={() => router.push("/login")}>
            Already have an account?
          </button>
        </div>
      </section>
    </main>
  );
}

/* reuse same styles as login */
