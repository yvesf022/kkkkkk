"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [verifyError, setVerifyError] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setVerifyError(false);

    try {
      await login(email, password);
      toast.success("Welcome back");
      router.replace("/account/profile");
    } catch (err: any) {
      const message =
        err?.message || "Invalid email or password";

      // 🔐 EMAIL NOT VERIFIED CASE
      if (
        message.toLowerCase().includes("verify") ||
        message.toLowerCase().includes("not verified")
      ) {
        setVerifyError(true);
        toast.error("Please verify your email first");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

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
      }}
    >
      {/* HEADER */}
      <header style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Welcome back
        </h1>
        <p style={{ opacity: 0.65 }}>
          Sign in to your account
        </p>
      </header>

      {/* EMAIL VERIFICATION NOTICE */}
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

          <p>
            Please verify your email address before
            signing in.
          </p>

          <button
            type="button"
            disabled={resending}
            onClick={resendVerification}
            className="btn btnGhost"
          >
            {resending
              ? "Sending…"
              : "Resend verification email"}
          </button>
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 16 }}
      >
        <input
          type="email"
          placeholder="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={loading}
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
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>

      {/* FOOTER */}
      <footer
        style={{
          textAlign: "center",
          fontSize: 14,
          opacity: 0.7,
        }}
      >
        Don’t have an account?{" "}
        <a
          href="/register"
          style={{
            fontWeight: 900,
            color: "#ff4fa1",
            textDecoration: "none",
          }}
        >
          Register
        </a>
      </footer>
    </div>
  );
}

/* -------------------------
   Local input styling
-------------------------- */

const inputStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 999,
  border: "1px solid rgba(12,14,20,.18)",
  fontSize: 15,
  outline: "none",
  background: "#fff",
};
