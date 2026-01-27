"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Invalid email or password");
      }

      toast.success("Welcome back 👋");
      setSuccess("Login successful. Redirecting…");

      const user = await login();

      if (user?.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/account");
      }
    } catch (err: any) {
      const message =
        err?.message || "Unable to sign in. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: 440,
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
          Welcome back
        </h1>

        <p style={{ marginTop: 6, color: "#475569" }}>
          Sign in to continue shopping.
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

        {success && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 12,
              background: "#dcfce7",
              color: "#14532d",
              fontWeight: 600,
            }}
          >
            ✅ {success}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={{
            marginTop: 22,
            display: "grid",
            gap: 14,
          }}
        >
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

          <button
            type="submit"
            disabled={loading}
            className="btn btnPrimary"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gap: 10,
          }}
        >
          <button
            type="button"
            className="btn btnGhost"
            onClick={() => router.push("/register")}
          >
            Create an account
          </button>

          <button
            type="button"
            className="btn btnGhost"
            onClick={() => router.push("/")}
          >
            Continue as guest
          </button>
        </div>
      </section>
    </main>
  );
}
