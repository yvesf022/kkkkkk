"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

/* --------------------------------------------------
   SAFE API BASE
-------------------------------------------------- */
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

  /* ---------------- PASSWORD RULES ---------------- */
  const passwordRules = useMemo(
    () => ({
      length: password.length >= 8,
      number: /\d/.test(password),
      letter: /[a-zA-Z]/.test(password),
    }),
    [password]
  );

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

  /* ---------------- REGISTER ---------------- */
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
      setError(err.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- SUCCESS ---------------- */
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

  /* ---------------- FORM ---------------- */
  return (
    <main style={page}>
      <section style={card}>
        <h1 style={title}>Create account</h1>
        <p style={subtitle}>It’s quick and secure</p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={form}>
          <div>
            <label style={label}>Full name</label>
            <input
              style={input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label style={label}>Email address</label>
            <input
              style={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={label}>Mobile number (optional)</label>
            <input
              style={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label style={label}>Password</label>
            <input
              style={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div style={rules}>
              • At least 8 characters<br />
              • Contains a letter and a number
            </div>
          </div>

          <div>
            <label style={label}>Re-enter password</label>
            <input
              style={input}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ ...primaryButton, opacity: canSubmit ? 1 : 0.6 }}
          >
            {loading ? "Creating account…" : "Create your account"}
          </button>
        </form>

        <div style={footerNote}>
          🔒 Secure registration · Email verification required
        </div>
      </section>
    </main>
  );
}

/* --------------------------------------------------
   STYLES (DEFINED — FIXES BUILD)
-------------------------------------------------- */

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

const errorBox: React.CSSProperties = {
  background: "#fff2f2",
  border: "1px solid #cc0c39",
  color: "#cc0c39",
  padding: "10px 12px",
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 14,
};

const rules: React.CSSProperties = {
  fontSize: 12,
  marginTop: 6,
  color: "#555",
};

const footerNote: React.CSSProperties = {
  marginTop: 16,
  fontSize: 12,
  color: "#555",
  textAlign: "center",
};
