"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, CheckCircle, XCircle, Mail } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  /* ================= PASSWORD RULES ================= */

  const passwordRules = useMemo(() => {
    return {
      length: password.length >= 8,
      number: /\d/.test(password),
      letter: /[a-zA-Z]/.test(password),
    };
  }, [password]);

  const passwordValid =
    passwordRules.length &&
    passwordRules.number &&
    passwordRules.letter;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const canSubmit =
    email &&
    passwordValid &&
    passwordsMatch &&
    !loading;

  /* ================= REGISTER ================= */

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        email,
        password,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      toast.success("Account created 🎉");
      setRegistered(true);
    } catch (err: any) {
      const message =
        err?.message || "Unable to create account. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SUCCESS STATE ================= */

  if (registered) {
    return (
      <main
        style={{
          minHeight: "80vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 460,
            borderRadius: 28,
            padding: "36px 32px",
            textAlign: "center",
            background: `
              radial-gradient(420px 220px at 10% 0%, rgba(96,165,250,0.25), transparent 60%),
              radial-gradient(360px 200px at 90% 10%, rgba(244,114,182,0.22), transparent 60%),
              linear-gradient(135deg, #f8fbff, #eef6ff, #fff1f6)
            `,
            boxShadow: "0 30px 90px rgba(15,23,42,0.18)",
          }}
        >
          <Mail size={42} style={{ margin: "0 auto 12px" }} />

          <h1 style={{ fontSize: 24, fontWeight: 900 }}>
            Verify your email
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "#475569",
              fontWeight: 600,
            }}
          >
            We’ve sent a verification link to:
          </p>

          <p style={{ fontWeight: 900, marginTop: 6 }}>
            {email}
          </p>

          <p
            style={{
              marginTop: 18,
              fontSize: 14,
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            Please check your inbox and click the link to
            activate your account before signing in.
          </p>

          <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
            <button
              className="btn btnPrimary"
              onClick={() => router.push("/login")}
            >
              Go to login
            </button>

            <button
              className="btn btnGhost"
              onClick={() => router.push("/")}
            >
              Continue shopping
            </button>
          </div>

          <p
            style={{
              marginTop: 20,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Didn’t receive the email? Check spam or try again later.
          </p>
        </section>
      </main>
    );
  }

  /* ================= FORM ================= */

  return (
    <main
      style={{
        minHeight: "80vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 28,
          padding: "36px 32px",
          background: `
            radial-gradient(420px 220px at 10% 0%, rgba(96,165,250,0.25), transparent 60%),
            radial-gradient(360px 200px at 90% 10%, rgba(244,114,182,0.22), transparent 60%),
            linear-gradient(135deg, #f8fbff, #eef6ff, #fff1f6)
          `,
          boxShadow: "0 30px 90px rgba(15,23,42,0.18)",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>
          Create your account
        </h1>

        <p style={{ marginTop: 6, color: "#475569", fontWeight: 600 }}>
          Create an account to track orders and shop faster.
        </p>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 12,
              background: "#fee2e2",
              color: "#7f1d1d",
              fontWeight: 600,
            }}
          >
            ❌ {error}
          </div>
        )}

        <form
          onSubmit={handleRegister}
          style={{ marginTop: 22, display: "grid", gap: 14 }}
        >
          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.15)",
              fontSize: 15,
            }}
          />

          {/* PASSWORD */}
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 44px 14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.15)",
                fontSize: 15,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* RULES */}
          <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
            {[
              { ok: passwordRules.length, label: "At least 8 characters" },
              { ok: passwordRules.number, label: "Contains a number" },
              { ok: passwordRules.letter, label: "Contains a letter" },
            ].map((rule) => (
              <div
                key={rule.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: rule.ok ? "#166534" : "#7f1d1d",
                  fontWeight: 600,
                }}
              >
                {rule.ok ? (
                  <CheckCircle size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {rule.label}
              </div>
            ))}
          </div>

          {/* CONFIRM */}
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 44px 14px 16px",
                borderRadius: 14,
                border: passwordsMatch
                  ? "1px solid #22c55e"
                  : "1px solid rgba(15,23,42,0.15)",
                fontSize: 15,
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {!passwordsMatch && confirmPassword && (
            <div style={{ fontSize: 13, color: "#7f1d1d", fontWeight: 600 }}>
              ❌ Passwords do not match
            </div>
          )}

          <input
            type="text"
            placeholder="Full name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.15)",
              fontSize: 15,
            }}
          />

          <input
            type="tel"
            placeholder="Phone number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.15)",
              fontSize: 15,
            }}
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btnPrimary"
            style={{ marginTop: 6, opacity: canSubmit ? 1 : 0.6 }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <button
            type="button"
            className="btn btnGhost"
            onClick={() => router.push("/login")}
          >
            Already have an account? Sign in
          </button>

          <button
            type="button"
            className="btn btnGhost"
            onClick={() => router.push("/")}
          >
            Continue shopping as guest
          </button>
        </div>

        <p
          style={{
            marginTop: 22,
            fontSize: 12,
            color: "#64748b",
            textAlign: "center",
          }}
        >
          🔒 Secure registration · Email verification required
        </p>
      </section>
    </main>
  );
}
