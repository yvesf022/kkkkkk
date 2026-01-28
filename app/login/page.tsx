"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);

      toast.success("Signing you in…");

      if (user?.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/account");
      }
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="pageContentWrap"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "calc(100vh - var(--header-height, 72px))",
      }}
    >
      <section
        className="card"
        style={{ maxWidth: 420, width: "100%" }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="pageTitle">Sign in</h1>
          <p className="pageSubtitle">
            Access your account, orders, and settings.
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="formStack"
          style={{ display: "grid", gap: 16 }}
        >
          <input
            type="email"
            className="input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              className="input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="btn btnGhost passwordToggle"
              style={{
                position: "absolute",
                right: 4,
                top: 4,
                padding: "6px 10px",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* FOOTER */}
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gap: 10,
          }}
        >
          <Link href="/register" className="btn btnGhost">
            Create an account
          </Link>

          <p className="mutedText" style={{ textAlign: "center" }}>
            Your session is secured using encrypted cookies.
          </p>
        </div>
      </section>
    </main>
  );
}
