"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Mail, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ NEW: explicit UI feedback
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
        // ✅ precise backend error surfaced to user
        throw new Error(data.detail || "Invalid email or password");
      }

      // hydrate auth store AFTER cookie is set
      await login();

      setSuccess("Login successful. Redirecting…");
      toast.success("Welcome back 👋");

      // Amazon-style deterministic redirect
      setTimeout(() => {
        if (data.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/account");
        }
      }, 600);
    } catch (err: any) {
      const message =
        err?.message ||
        "Unable to sign in. Please check your credentials.";

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
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ShoppingBag size={28} />
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>
            Karabo Online Store
          </h1>
        </div>

        <p style={{ marginTop: 6, color: "#475569" }}>
          Sign in to track orders, manage your account, and shop faster.
        </p>

        {/* ✅ ERROR MESSAGE */}
        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fee2e2",
              color: "#7f1d1d",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* ✅ SUCCESS MESSAGE */}
        {success && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#dcfce7",
              color: "#14532d",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ✅ {success}
          </div>
        )}

        {/* Login form */}
        <form
          onSubmit={handleLogin}
          style={{
            marginTop: 20,
            display: "grid",
            gap: 14,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Email</span>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.6,
                }}
              />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: 40 }}
              />
            </div>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Password</span>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.6,
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: 40, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.7,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              fontWeight: 800,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Secondary actions */}
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gap: 10,
            fontSize: 14,
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/register")}
            style={{ background: "transparent" }}
          >
            New here? <strong>Create an account</strong>
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            style={{ background: "transparent" }}
          >
            Continue shopping as guest →
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
          🔒 Secure login · Your data is protected
        </p>
      </section>
    </main>
  );
}
