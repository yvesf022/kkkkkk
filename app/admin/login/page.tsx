"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { login } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Enter admin email and password");
      return;
    }

    setLoading(true);

    try {
      const user = await login(email, password);

      // 🔒 HARD ADMIN CHECK
      if (user?.role !== "admin") {
        toast.error("Admin access only");
        return;
      }

      toast.success("Welcome back, Admin");
      router.replace("/admin");
    } catch {
      toast.error("Invalid admin credentials");
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
        style={{
          maxWidth: 420,
          width: "100%",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="pageTitle">Admin Sign In</h1>
          <p className="pageSubtitle">
            Restricted access. Authorized staff only.
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: 16 }}
        >
          <input
            type="email"
            className="input"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
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
              className="btn btnGhost"
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
            className="btn btnTech"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in as Admin"}
          </button>
        </form>

        {/* FOOTER */}
        <p
          className="mutedText"
          style={{ marginTop: 20, textAlign: "center" }}
        >
          This area is monitored and access is logged.
        </p>
      </section>
    </main>
  );
}
