"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // ✅ CRITICAL FIXES
      await login(data.access_token);

      toast.success("Welcome back 🎉");

      // ✅ ROLE-BASED REDIRECT
      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/account");
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 26,
          padding: "32px 30px",
          background: `
            radial-gradient(
              420px 220px at 10% 0%,
              rgba(96,165,250,0.28),
              transparent 60%
            ),
            radial-gradient(
              360px 200px at 90% 10%,
              rgba(244,114,182,0.20),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 28px 80px rgba(15,23,42,0.18)",
        }}
      >
        {/* HEADER */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Welcome Back
        </h1>

        <p
          style={{
            marginTop: 6,
            fontWeight: 600,
            fontSize: 14,
            color: "rgba(15,23,42,0.6)",
          }}
        >
          Sign in to access your account and orders.
        </p>

        {/* FORM */}
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
              border: "1px solid rgba(15,23,42,0.12)",
              fontWeight: 600,
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              fontWeight: 600,
            }}
          />

          <button
            className="btn btnTech"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        {/* FOOTER */}
        <div
          style={{
            marginTop: 20,
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(15,23,42,0.6)",
            textAlign: "center",
          }}
        >
          Don’t have an account?{" "}
          <a
            href="/register"
            style={{
              fontWeight: 800,
              color: "#2563eb",
              textDecoration: "none",
            }}
          >
            Create one
          </a>
        </div>
      </section>
    </div>
  );
}
