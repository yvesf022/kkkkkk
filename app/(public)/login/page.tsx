"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const login = useAuth((s) => s.login);
  const initialized = useAuth((s) => s.initialized);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [verifyError, setVerifyError] = useState(false);
  const [resending, setResending] = useState(false);

  /* -------------------------
     AUTO REDIRECT IF LOGGED IN
  ------------------------- */
  useEffect(() => {
    if (!initialized) return;
    if (user) {
      router.replace("/account");
    }
  }, [initialized, user, router]);

  /* -------------------------
     SUBMIT
  ------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setErrorText(null);
    setVerifyError(false);
    setStatusText("Signing you in…");

    try {
      await login(email, password);

      toast.success("Welcome back");
      router.replace("/account");
      router.refresh();
    } catch (err: any) {
      const message = err?.message || "Invalid email or password";

      setStatusText(null);

      if (
        message.toLowerCase().includes("verify") ||
        message.toLowerCase().includes("not verified")
      ) {
        setVerifyError(true);
        setErrorText("Your email address has not been verified.");
      } else {
        setErrorText("Incorrect email or password.");
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------------
     RESEND VERIFICATION
  ------------------------- */
  async function resendVerification() {
    if (!email) {
      toast.error("Enter your email address first");
      return;
    }

    setResending(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Verification email sent");
    } catch {
      toast.error("Unable to resend verification email");
    } finally {
      setResending(false);
    }
  }

  /* -------------------------
     HYDRATION
  ------------------------- */
  if (!initialized) {
    return (
      <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>
        Loading…
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>
        Redirecting…
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,.94)",
        borderRadius: 22,
        padding: 32,
        display: "grid",
        gap: 22,
        boxShadow:
          "0 30px 80px rgba(12,14,20,.18), inset 0 0 0 1px rgba(255,255,255,.6)",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <header style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Sign in</h1>
        <p style={{ opacity: 0.65 }}>Use your email and password</p>
      </header>

      {errorText && (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 14,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <AlertCircle size={18} />
          {errorText}
        </div>
      )}

      {verifyError && (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "#fff7ed",
            color: "#9a3412",
            fontSize: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <Mail size={18} />
            <strong>Email not verified</strong>
          </div>

          <button
            type="button"
            disabled={resending}
            onClick={resendVerification}
            className="btn btnGhost"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email address"
          required
          disabled={submitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          required
          disabled={submitting}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "14px",
            borderRadius: 999,
            border: "none",
            fontWeight: 900,
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 14,
          opacity: 0.8,
        }}
      >
        <Link href="/register">Create account</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 999,
  border: "1px solid rgba(12,14,20,.18)",
  fontSize: 15,
  outline: "none",
  background: "#fff",
};
